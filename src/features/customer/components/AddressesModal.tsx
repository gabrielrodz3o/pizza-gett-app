import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAddress, deleteAddress, DeliveryAddress, detectAddressCoverage,
  getAddressMapConfig, getCustomerHome, updateAddress,
} from '@/features/customer/api';
import { useCustomerAuth } from '@/features/auth/store';
import { colors } from '@/shared/theme';

type Props = { visible: boolean; onClose: () => void };
type Point = { latitude: number; longitude: number };
const FALLBACK: Point = { latitude: 18.4861, longitude: -69.9312 };

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const intersects = ((a.latitude > point.latitude) !== (b.latitude > point.latitude))
      && point.longitude < ((b.longitude - a.longitude) * (point.latitude - a.latitude))
        / (b.latitude - a.latitude) + a.longitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

function AddressEditor({ address, first, onDone, onCancel }: {
  address?: DeliveryAddress; first: boolean; onDone: () => void; onCancel: () => void;
}) {
  const [label, setLabel] = useState(address?.label || 'Casa');
  const [street, setStreet] = useState(address?.street || '');
  const [reference, setReference] = useState(address?.reference || '');
  const [complement, setComplement] = useState(address?.complement || '');
  const [notes, setNotes] = useState(address?.notes || '');
  const [point, setPoint] = useState<Point | null>(address?.latitude && address?.longitude
    ? { latitude: Number(address.latitude), longitude: Number(address.longitude) } : null);
  const [coverage, setCoverage] = useState<any>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  const mapQuery = useQuery({ queryKey: ['address-map-config'], queryFn: getAddressMapConfig });
  const zones = mapQuery.data?.zones ?? [];
  const initial = useMemo(() => point ?? zones[0]?.polygon?.[0] ?? FALLBACK, [point, zones]);
  const region: Region = { ...initial, latitudeDelta: 0.06, longitudeDelta: 0.06 };

  useEffect(() => {
    if (!point && zones.some((zone) => zone.polygon.length >= 3)) {
      mapRef.current?.fitToCoordinates(zones.flatMap((zone) => zone.polygon), {
        edgePadding: { top: 38, right: 38, bottom: 38, left: 38 }, animated: true,
      });
    }
    if (point && zones.length) void validatePoint(point);
  }, [zones.length]);

  const validatePoint = async (next: Point, fillStreet = false) => {
    setPoint(next);
    const localZone = zones.find((zone) => zone.polygon.length >= 3 && pointInPolygon(next, zone.polygon));
    const localMatch = localZone ? {
      within_coverage: true, zone_id: localZone.id, zone_name: localZone.name,
      zone_price: localZone.price, location_id: localZone.locationId,
      location_name: localZone.locationName, source: 'map',
    } : { within_coverage: false, source: 'map' };
    setCoverage(localMatch);
    setCheckingCoverage(true);
    try {
      const match = await detectAddressCoverage(next.latitude, next.longitude);
      setCoverage(match?.within_coverage ? match : localMatch);
      if (fillStreet) {
        const [geo] = await Location.reverseGeocodeAsync(next);
        if (geo) setStreet([geo.street, geo.streetNumber, geo.district, geo.city].filter(Boolean).join(', '));
      }
    } catch {
      // El polígono descargado permite respuesta inmediata aun si el endpoint
      // remoto está reiniciando; el servidor vuelve a validar al guardar.
      setCoverage(localMatch);
    } finally { setCheckingCoverage(false); }
  };

  useEffect(() => { if (point) void validatePoint(point); }, []);

  const save = useMutation({
    mutationFn: () => {
      if (!point) throw new Error('Selecciona un punto en el mapa.');
      const body = { label, street: street.trim(), complement: complement.trim(), reference: reference.trim(), notes: notes.trim(),
        is_default: address?.is_default ?? first, latitude: point.latitude, longitude: point.longitude };
      return address ? updateAddress(address.id, body) : createAddress(body);
    },
    onSuccess: onDone,
    onError: (error: any) => Alert.alert('No se pudo guardar', error?.response?.data?.message || error.message || 'Revisa la ubicación.'),
  });

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permiso necesario', 'Permite el acceso a tu ubicación para colocar el pin.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await validatePoint({ latitude: current.coords.latitude, longitude: current.coords.longitude }, true);
    } finally { setLocating(false); }
  };

  return (
    <View style={s.form}>
      <View style={s.editorTitleRow}>
        <View style={{ flex: 1 }}><Text style={s.formTitle}>{address ? 'Editar dirección' : 'Nueva dirección'}</Text><Text style={s.formHint}>Mueve el pin hasta la ubicación exacta</Text></View>
        <View style={s.editorActions}><Pressable onPress={useMyLocation} style={s.gpsBtn}>{locating ? <ActivityIndicator size="small" color={colors.brown} /> : <Ionicons name="locate" size={20} color={colors.brown} />}</Pressable><Pressable disabled={save.isPending || street.trim().length < 3 || !coverage?.within_coverage} onPress={() => save.mutate()} style={[s.topSaveBtn,(save.isPending || street.trim().length < 3 || !coverage?.within_coverage) && s.btnDisabled]}><Text style={s.topSaveText}>Guardar</Text></Pressable></View>
      </View>
      <View style={s.mapWrap}>
        {mapQuery.isLoading ? <ActivityIndicator color={colors.yellow} style={s.mapLoader} /> : (
          <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={s.map} initialRegion={region} onPress={(event) => validatePoint(event.nativeEvent.coordinate, true)} showsUserLocation>
            {point && <Marker coordinate={point} draggable onDragEnd={(event) => validatePoint(event.nativeEvent.coordinate, true)} />}
          </MapView>
        )}
      </View>
      {!mapQuery.isLoading && zones.length === 0 && <View style={s.apiWarning}><Ionicons name="cloud-offline-outline" size={17} color="#9A5B00" /><Text style={s.apiWarningText}>El API no está enviando las zonas. Reinicia o despliega command-api-services.</Text></View>}
      <View style={[s.coverage, coverage?.within_coverage ? s.coverageOk : s.coverageBad]}>
        {checkingCoverage ? <ActivityIndicator size="small" color={colors.orange} /> : <Ionicons name={coverage?.within_coverage ? 'checkmark-circle' : 'alert-circle'} size={18} color={coverage?.within_coverage ? '#16803A' : colors.red} />}
        <View style={{ flex: 1 }}><Text style={s.coverageTitle}>{coverage?.within_coverage ? '¡Sí, tenemos cobertura!' : 'Esta ubicación está fuera de cobertura'}</Text><Text style={s.coverageSub}>{coverage?.within_coverage ? coverage?.available_now === false ? `Puedes guardarla. Delivery cerrado ahora${coverage?.schedule_label ? ` · ${coverage.schedule_label}` : ''}.` : 'Puedes guardar esta dirección y pedir delivery.' : 'Mueve el pin hasta una ubicación donde podamos entregar.'}</Text></View>
      </View>
      <Text style={s.formLabel}>Etiqueta</Text>
      <View style={s.labelRow}>{['Casa', 'Trabajo', 'Otro'].map((item) => <Pressable key={item} onPress={() => setLabel(item)} style={[s.labelChip, label === item && s.labelChipActive]}><Text style={[s.labelChipText, label === item && s.labelChipTextActive]}>{item}</Text></Pressable>)}</View>
      <Text style={s.formLabel}>Calle y número *</Text>
      <TextInput value={street} onChangeText={setStreet} placeholder="Calle, número y sector" placeholderTextColor={colors.muted} style={s.input} />
      <Text style={s.formLabel}>Apartamento, local o edificio</Text><TextInput value={complement} onChangeText={setComplement} placeholder="Apto. 3B, Torre Norte" placeholderTextColor={colors.muted} style={s.input} />
      <Text style={s.formLabel}>Referencia</Text><TextInput value={reference} onChangeText={setReference} placeholder="Frente al colmado, edificio azul" placeholderTextColor={colors.muted} style={s.input} />
      <Text style={s.formLabel}>Notas para el repartidor</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Toca el timbre 3 veces" placeholderTextColor={colors.muted} style={s.input} />
      <View style={s.formRow}><Pressable onPress={onCancel} style={[s.btn,s.btnSecondary]}><Text style={s.btnSecondaryText}>Cancelar</Text></Pressable><Pressable disabled={save.isPending || street.trim().length < 3 || !coverage?.within_coverage} onPress={() => save.mutate()} style={[s.btn,s.btnPrimary,(save.isPending || street.trim().length < 3 || !coverage?.within_coverage) && s.btnDisabled]}>{save.isPending ? <ActivityIndicator color={colors.brown} /> : <Text style={s.btnPrimaryText}>Guardar</Text>}</Pressable></View>
    </View>
  );
}

function AddressCard({ address, onEdit, onDelete }: { address: DeliveryAddress; onEdit: () => void; onDelete: () => void }) {
  return <Pressable onPress={onEdit} style={s.addressCard}><View style={s.addressIcon}><Ionicons name={address.label === 'Casa' ? 'home' : address.label === 'Trabajo' ? 'briefcase' : 'location'} size={20} color={colors.brown} /></View><View style={{ flex: 1 }}><View style={s.addressTopRow}><Text style={s.addressLabel}>{address.label}</Text>{address.is_default && <View style={s.defaultBadge}><Text style={s.defaultText}>Principal</Text></View>}</View><Text style={s.addressStreet}>{address.street}</Text>{address.reference ? <Text style={s.addressRef}>{address.reference}</Text> : null}</View><Pressable onPress={onEdit} hitSlop={10}><Ionicons name="create-outline" size={19} color={colors.orange} /></Pressable><Pressable onPress={() => Alert.alert('Eliminar dirección', `¿Eliminar "${address.label}"?`, [{ text:'Cancelar',style:'cancel' },{ text:'Eliminar',style:'destructive',onPress:onDelete }])} hitSlop={10}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable></Pressable>;
}

export function AddressesModal({ visible, onClose }: Props) {
  const auth = useCustomerAuth(), qc = useQueryClient(), insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<DeliveryAddress | 'new' | null>(null);
  const home = useQuery({ queryKey: ['customer-home', auth.session?.profile.id], queryFn: getCustomerHome, enabled: !!auth.session && visible });
  const remove = useMutation({ mutationFn: deleteAddress, onSuccess: () => qc.invalidateQueries({ queryKey:['customer-home'] }), onError: () => Alert.alert('Error','No se pudo eliminar la dirección.') });
  const addresses: DeliveryAddress[] = home.data?.addresses ?? [];
  const done = async () => { await qc.invalidateQueries({ queryKey:['customer-home'] }); setEditing(null); };
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={[s.screen,{ paddingTop: insets.top || (Platform.OS === 'ios' ? 47 : 0), paddingBottom: insets.bottom || 0 }]}><View style={s.header}><Pressable accessibilityLabel="Volver" onPress={editing ? () => setEditing(null) : onClose}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><Text style={s.headerTitle}>{editing ? (editing === 'new' ? 'Agregar dirección' : 'Editar dirección') : 'Mis direcciones'}</Text><Pressable accessibilityLabel="Agregar dirección" onPress={() => setEditing('new')}><Ionicons name="add" size={26} color={colors.orange} /></Pressable></View><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={!editing ? <RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} tintColor={colors.yellow} /> : undefined}>{editing ? <AddressEditor address={editing === 'new' ? undefined : editing} first={!addresses.length} onDone={done} onCancel={() => setEditing(null)} /> : home.isLoading ? <ActivityIndicator color={colors.yellow} style={{ marginTop:40 }} /> : !addresses.length ? <View style={s.empty}><Ionicons name="map-outline" size={52} color={colors.border} /><Text style={s.emptyTitle}>Sin direcciones guardadas</Text><Text style={s.emptyBody}>Agrega tu ubicación exacta en el mapa para validar el delivery.</Text><Pressable onPress={() => setEditing('new')} style={s.addBtn}><Ionicons name="add" size={20} color={colors.brown} /><Text style={s.addBtnText}>Agregar dirección</Text></Pressable></View> : <>{addresses.map((item) => <AddressCard key={item.id} address={item} onEdit={() => setEditing(item)} onDelete={() => remove.mutate(item.id)} />)}<Pressable onPress={() => setEditing('new')} style={s.addInlineBtn}><Ionicons name="add-circle-outline" size={20} color={colors.orange} /><Text style={s.addInlineBtnText}>Agregar otra dirección</Text></Pressable></>}</ScrollView></View></Modal>;
}

const s = StyleSheet.create({
  screen:{ flex:1,backgroundColor:colors.cream },header:{ flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:'white' },headerTitle:{ fontSize:17,fontWeight:'900',color:colors.text },content:{ padding:16,paddingBottom:40 },
  addressCard:{ backgroundColor:'white',borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:10,marginBottom:10,borderWidth:1,borderColor:colors.border },addressIcon:{ width:40,height:40,borderRadius:12,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center' },addressTopRow:{ flexDirection:'row',alignItems:'center',gap:8,marginBottom:2 },addressLabel:{ fontSize:14,fontWeight:'900',color:colors.text },addressStreet:{ fontSize:13,color:colors.text,lineHeight:18 },addressRef:{ fontSize:11,color:colors.muted,marginTop:2 },defaultBadge:{ backgroundColor:colors.yellowSoft,borderRadius:6,paddingHorizontal:6,paddingVertical:2 },defaultText:{ fontSize:10,fontWeight:'800',color:colors.brown },
  empty:{ alignItems:'center',paddingTop:60,gap:10 },emptyTitle:{ fontSize:18,fontWeight:'900',color:colors.text },emptyBody:{ fontSize:13,color:colors.muted,textAlign:'center',lineHeight:19 },addBtn:{ flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.yellow,borderRadius:14,paddingHorizontal:20,paddingVertical:12,marginTop:10 },addBtnText:{ fontSize:14,fontWeight:'900',color:colors.brown },addInlineBtn:{ flexDirection:'row',alignItems:'center',gap:8,justifyContent:'center',paddingVertical:16 },addInlineBtnText:{ fontSize:14,fontWeight:'800',color:colors.orange },
  form:{ backgroundColor:'white',borderRadius:20,padding:14,borderWidth:1,borderColor:colors.border },editorTitleRow:{ flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:8 },editorActions:{ flexDirection:'row',alignItems:'center',gap:7 },formTitle:{ fontSize:18,fontWeight:'900',color:colors.text },formHint:{ fontSize:12,color:colors.muted,marginTop:2 },gpsBtn:{ width:42,height:42,borderRadius:13,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center' },topSaveBtn:{ height:42,borderRadius:13,backgroundColor:colors.brown,paddingHorizontal:13,alignItems:'center',justifyContent:'center' },topSaveText:{ color:'white',fontSize:12,fontWeight:'900' },mapWrap:{ height:300,borderRadius:16,overflow:'hidden',backgroundColor:colors.cream },map:{ flex:1 },mapLoader:{ marginTop:130 },apiWarning:{ flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'#FFF4D6',borderRadius:11,padding:10,marginTop:9 },apiWarningText:{ flex:1,fontSize:11,lineHeight:15,color:'#754600',fontWeight:'700' },coverage:{ flexDirection:'row',gap:8,alignItems:'center',padding:11,borderRadius:12,marginTop:10 },coverageOk:{ backgroundColor:'#E9F8EE' },coverageBad:{ backgroundColor:'#FFF0F0' },coverageTitle:{ fontSize:12,fontWeight:'800',color:colors.text },coverageSub:{ fontSize:11,color:colors.muted,marginTop:2 },formLabel:{ fontSize:12,fontWeight:'700',color:colors.muted,marginBottom:6,marginTop:12 },labelRow:{ flexDirection:'row',gap:8 },labelChip:{ paddingHorizontal:14,paddingVertical:8,borderRadius:10,backgroundColor:colors.cream,borderWidth:1,borderColor:colors.border },labelChipActive:{ backgroundColor:colors.yellow,borderColor:colors.yellow },labelChipText:{ fontSize:13,fontWeight:'700',color:colors.muted },labelChipTextActive:{ color:colors.brown },input:{ height:48,borderRadius:12,backgroundColor:colors.cream,borderWidth:1,borderColor:colors.border,paddingHorizontal:14,fontSize:14,color:colors.text },formRow:{ flexDirection:'row',gap:10,marginTop:18 },btn:{ flex:1,height:48,borderRadius:14,alignItems:'center',justifyContent:'center' },btnPrimary:{ backgroundColor:colors.yellow },btnSecondary:{ backgroundColor:colors.cream,borderWidth:1,borderColor:colors.border },btnDisabled:{ opacity:.45 },btnPrimaryText:{ fontSize:14,fontWeight:'900',color:colors.brown },btnSecondaryText:{ fontSize:14,fontWeight:'700',color:colors.muted },
});

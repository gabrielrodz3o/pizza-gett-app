import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getComboDefinition } from '@/features/catalog/api';
import { ProductCustomization, ProductCustomizer } from './ProductCustomizer';
import { useShop } from '@/features/cart/store';
import { toast } from '@/shared/components/Toast';
import { haptics } from '@/shared/haptics';
import { colors, font } from '@/shared/theme';
import { Branch, CartLine, ComboOption, ComboSlot, Product } from '@/shared/types';

type Selection = { slot: ComboSlot; option?: ComboOption; product?: Product; customization?: ProductCustomization; customized: boolean };
const money = (n: number) => `RD$${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16);
});

export function ComboBuilder({ combo, branch, onClose, onFallback }: { combo: Product | null; branch: Branch; onClose: () => void; onFallback: (combo: Product) => void }) {
  const addCombo = useShop((state) => state.addCombo);
  const query = useQuery({ queryKey: ['combo', branch.id, combo?.id], queryFn: () => getComboDefinition(branch, combo!), enabled: !!combo });
  const [selections, setSelections] = useState<Selection[]>([]);
  const [customizing, setCustomizing] = useState<number | null>(null);

  useEffect(() => {
    if (!query.data || !combo) return;
    if (query.data.fallback) { onFallback(combo); onClose(); return; }
    setSelections(query.data.slots.map((slot) => {
      const option = slot.virtual && slot.options.length === 1 ? slot.options[0] : undefined;
      const product = option ? query.data.products.get(option.itemId) : undefined;
      return { slot, option, product, customized: !product?.sidesCategories?.length };
    }));
  }, [query.data, combo]);

  const choose = (index: number, option: ComboOption) => {
    const product = query.data?.products.get(option.itemId);
    if (!product) return;
    haptics.select();
    setSelections((current) => current.map((selection, i) => i === index ? { ...selection, option, product, customization: undefined, customized: !product.sidesCategories?.length } : selection));
    if (product.sidesCategories?.length) setCustomizing(index);
  };
  const extras = (selection: Selection) => (selection.customization?.selectedSides ?? []).reduce((sum, side) => sum + side.price * side.quantity, 0);
  const total = useMemo(() => (combo?.price ?? 0) + selections.reduce((sum, selection) => sum + (selection.option?.priceDelta ?? 0) * selection.slot.quantity + extras(selection), 0), [combo, selections]);
  const complete = selections.length > 0 && selections.every((selection) => (!selection.slot.isRequired || selection.product) && (!selection.product?.sidesCategories?.length || selection.customized));

  const confirm = () => {
    if (!combo || !complete) return;
    const chosen = selections.filter((selection) => selection.product) as (Selection & { product: Product })[];
    const normalGross = chosen.map((selection) => selection.product.price * selection.slot.quantity);
    const normalTotal = normalGross.reduce((a, b) => a + b, 0);
    const quantityTotal = chosen.reduce((sum, selection) => sum + selection.slot.quantity, 0);
    const shares = chosen.map((selection, i) => round2(normalTotal > 0 ? combo.price * normalGross[i] / normalTotal : combo.price * selection.slot.quantity / quantityTotal));
    if (shares.length) shares[shares.length - 1] = round2(shares[shares.length - 1] + round2(combo.price - shares.reduce((a, b) => a + b, 0)));
    const groupId = uuid();
    const lines: CartLine[] = chosen.map((selection, i) => {
      const quantity = selection.slot.quantity;
      const gross = shares[i] + (selection.option?.priceDelta ?? 0) * quantity + extras(selection);
      return {
        ...selection.product, lineId: `${selection.product.id}-${groupId}-${i}`, quantity, size: 'Única',
        note: selection.customization?.note, selectedSides: selection.customization?.selectedSides ?? [],
        orderPrice: round2(gross / (1 + selection.product.taxRate) / quantity), unitTotal: round2(gross / quantity),
        comboGroupId: groupId, comboItemId: combo.id, comboName: combo.name, comboTaxTypeId: combo.taxTypeId, comboUnitId: combo.unitId,
      };
    });
    haptics.press();
    addCombo(lines);
    toast(`${combo.name} agregado al carrito`);
    onClose();
  };

  if (!combo) return null;
  const active = customizing == null ? null : selections[customizing];
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  return <Modal visible={Boolean(combo)} animationType="slide" onRequestClose={onClose}>
    <View style={[s.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <View style={s.header}><Pressable onPress={onClose} style={s.icon} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}><Ionicons name="close" size={24} /></Pressable><View style={{ flex: 1 }}><Text style={s.kicker}>ARMA TU COMBO</Text><Text style={s.headerTitle} numberOfLines={1}>{combo?.name}</Text></View></View>
      {query.isLoading ? <View style={s.state}><ActivityIndicator color={colors.yellow} /><Text style={s.muted}>Cargando opciones reales…</Text></View> : query.isError ? <View style={s.state}><Ionicons name="cloud-offline-outline" size={38} color={colors.red} /><Text style={s.error}>No se pudieron cargar las opciones.</Text><Pressable style={s.retry} onPress={() => query.refetch()}><Text style={s.buttonText}>Reintentar</Text></Pressable></View> :
      <ScrollView contentContainerStyle={s.content}>{selections.map((selection, index) => <View key={`${selection.slot.id ?? 'v'}-${index}`} style={s.slot}>
        <View style={s.slotHead}><View style={[s.number, selection.customized && s.done]}><Text style={s.numberText}>{selection.customized ? '✓' : index + 1}</Text></View><View style={{ flex: 1 }}><Text style={s.slotName}>{selection.slot.name}</Text><Text style={s.rule}>{selection.slot.isRequired ? 'Requerido' : 'Opcional'}{selection.slot.quantity > 1 ? ` · Cantidad ${selection.slot.quantity}` : ''}</Text></View></View>
        {selection.slot.options.map((option) => { const selected = selection.option?.itemId === option.itemId; const available = query.data?.products.has(option.itemId); return <Pressable key={option.id ?? option.itemId} disabled={!available} onPress={() => selected && selection.product?.sidesCategories?.length ? setCustomizing(index) : choose(index, option)} style={[s.option, selected && s.optionSelected, !available && s.disabled]}><Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={selected ? colors.brown : colors.muted} /><View style={{ flex: 1 }}><Text style={s.optionName}>{option.name}</Text>{selected && selection.customization?.selectedSides.length ? <Text style={s.summary}>{selection.customization.selectedSides.map((x) => `${x.quantity}× ${x.name}`).join(', ')}</Text> : null}</View><Text style={s.delta}>{option.priceDelta > 0 ? `+${money(option.priceDelta)}` : selected && selection.product?.sidesCategories?.length ? 'Personalizar' : 'Incluido'}</Text></Pressable>; })}
      </View>)}</ScrollView>}
      {!query.isLoading && !query.isError && <View style={s.footer}>{!complete && <Text style={s.pending}>Completa y personaliza todos los pasos requeridos.</Text>}<Pressable disabled={!complete} onPress={confirm} style={[s.confirm, !complete && s.confirmDisabled]}><Text style={s.buttonText}>Agregar combo · {money(total)}</Text></Pressable></View>}
      <ProductCustomizer product={active?.product ?? null} onClose={() => setCustomizing(null)} fixedQuantity baseIncluded onConfirm={(value) => { if (customizing == null) return; setSelections((current) => current.map((selection, i) => i === customizing ? { ...selection, customization: value, customized: true } : selection)); setCustomizing(null); }} />
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.cream},header:{minHeight:70,padding:14,backgroundColor:colors.brown,flexDirection:'row',alignItems:'center',gap:10},icon:{width:42,height:42,borderRadius:14,backgroundColor:'white',alignItems:'center',justifyContent:'center'},kicker:{fontSize:10,fontFamily: font.black,letterSpacing:1.3,color:colors.yellow},headerTitle:{fontSize:24,fontFamily:font.display,letterSpacing:.5,color:'white'},content:{padding:16,paddingBottom:125},state:{flex:1,alignItems:'center',justifyContent:'center',gap:12,padding:25},muted:{color:colors.muted},error:{fontFamily: font.extraBold,color:colors.red,textAlign:'center'},retry:{backgroundColor:colors.yellow,borderRadius:14,paddingHorizontal:20,paddingVertical:12},slot:{backgroundColor:'white',borderRadius:19,padding:14,marginBottom:12,borderWidth:1,borderColor:colors.border},slotHead:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:8},number:{width:34,height:34,borderRadius:12,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},done:{backgroundColor:colors.green},numberText:{fontFamily: font.black,color:colors.brown},slotName:{fontSize:16,fontFamily: font.black,color:colors.text},rule:{fontSize:11,color:colors.muted,marginTop:2},option:{minHeight:58,borderRadius:14,padding:11,marginTop:7,backgroundColor:colors.cream,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'transparent'},optionSelected:{backgroundColor:colors.yellowSoft,borderColor:colors.yellow},disabled:{opacity:.42},optionName:{fontSize:14,fontFamily: font.extraBold,color:colors.text},summary:{fontSize:11,color:colors.muted,marginTop:3},delta:{fontSize:11,fontFamily: font.extraBold,color:colors.brown},footer:{position:'absolute',left:0,right:0,bottom:0,padding:16,backgroundColor:'white',borderTopWidth:1,borderTopColor:colors.border},pending:{fontSize:11,color:colors.red,textAlign:'center',marginBottom:7},confirm:{height:55,borderRadius:16,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center'},confirmDisabled:{opacity:.45},buttonText:{fontSize:15,fontFamily: font.black,color:colors.brown},
});

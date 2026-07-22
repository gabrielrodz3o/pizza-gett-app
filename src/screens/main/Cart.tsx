import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendOrder } from '@/features/catalog/api';
import { ProductCustomizer } from '@/features/catalog/components/ProductCustomizer';
import { useShop } from '@/features/cart/store';
import { useCustomerAuth } from '@/features/auth/store';
import { confirmSheet } from '@/shared/components/ConfirmSheet';
import { EmptyState } from '@/shared/components/EmptyState';
import { haptics } from '@/shared/haptics';
import { colors, font } from '@/shared/theme';
import { Branch, CartLine } from '@/shared/types';
import { money } from './helpers';

export function Cart({
  subtotal,
  branch,
  customer,
  initialMode,
  initialAddressId,
  onLogin,
  onClose,
  onSent,
}: {
  subtotal: number;
  branch: Branch;
  customer?: any;
  initialMode: 'delivery' | 'pickup';
  initialAddressId?: string;
  onLogin: () => void;
  onClose: () => void;
  onSent: (result: any) => void;
}) {
  const shop = useShop();
  const auth = useCustomerAuth();
  const deliveryType = initialMode;
  const [addressId, setAddressId] = useState<string | undefined>(
    initialAddressId ?? customer?.addresses?.[0]?.id,
  );
  const [addressText, setAddressText] = useState(
    customer?.addresses?.[0]?.street ?? '',
  );
  const [paymentMethodId, setPaymentMethodId] = useState(branch.paymentMethods?.[0]?.id ?? 1);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editingLine, setEditingLine] = useState<CartLine | null>(null);
  const addresses = customer?.addresses ?? [];
  useEffect(() => {
    if (!addressId && addresses[0]?.id) {
      setAddressId(addresses[0].id);
      setAddressText(addresses[0].street ?? '');
    }
  }, [customer, addressId]);
  const selectedAddress = addresses.find((x: any) => x.id === addressId);
  const delivery = deliveryType === 'delivery' ? Number(selectedAddress?.detected_zone_price ?? 0) : 0;
  const total = subtotal + delivery;
  useEffect(() => {
    if (selectedAddress?.street) setAddressText(selectedAddress.street);
  }, [selectedAddress?.id]);
  const submit = async () => {
    if (!auth.session) {
      onLogin();
      return;
    }
    if (deliveryType === 'delivery' && !addressId) {
      haptics.warning();
      confirmSheet({ title: 'Dirección requerida', message: 'Selecciona una dirección validada en el mapa.', icon: 'location', confirmText: 'Entendido', cancelText: null });
      return;
    }
    if (deliveryType === 'delivery' && Number(selectedAddress?.effective_location_id) !== branch.id) {
      haptics.warning();
      confirmSheet({ title: 'Sucursal incorrecta', message: 'Esta dirección pertenece a otra sucursal. Regresa al inicio y vuelve a elegirla.', icon: 'storefront', confirmText: 'Entendido', cancelText: null });
      return;
    }
    setSending(true);
    try {
      const result = await sendOrder(branch, {
        customer: {
          name: auth.session.profile.name,
          phone: auth.session.profile.phone ?? '',
        },
        deliveryType,
        addressId,
        address: addressText.trim(),
        scheduledFor: null,
        paymentMethodId,
        lines: shop.cart,
      });
      onSent(result);
    } catch (error: any) {
      if (error?.code === 'ORDER_CONFIRMATION_UNKNOWN') {
        confirmSheet({ title: 'Estamos verificando tu pedido', message: 'La conexión se interrumpió. No vuelvas a enviarlo: lo confirmaremos automáticamente cuando regrese internet.', icon: 'cloud-offline', confirmText: 'Entendido', cancelText: null });
        return;
      }
      haptics.error();
      confirmSheet({
        title: 'No se pudo enviar',
        message: error?.response?.data?.message ?? error?.message ?? 'Verifica la conexión e intenta nuevamente.',
        icon: 'alert-circle',
        confirmText: 'Entendido',
        cancelText: null,
      });
    } finally {
      setSending(false);
    }
  };
  const visible = shop.cart.filter(
    (line, index, all) =>
      !line.comboGroupId ||
      all.findIndex((x) => x.comboGroupId === line.comboGroupId) === index,
  );
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  return (
    <View style={[s.cartScreen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <View style={s.cartHeader}>
        <Pressable onPress={onClose} style={s.cartBack} accessibilityRole="button" accessibilityLabel="Cerrar carrito">
          <Ionicons name="arrow-back" size={22} color={colors.brown} />
        </Pressable>
        <View style={{ flex: 1 }}><Text style={s.cartKicker}>TU ORDEN</Text><Text style={s.cartTitle}>{step === 1 ? 'Revisa tu carrito' : step === 2 ? 'Confirma la entrega' : 'Confirma tu pedido'}</Text></View>
        <View style={s.cartItemCount}><Text style={s.cartItemCountText}>{shop.cart.reduce((sum, line) => sum + line.quantity, 0)}</Text></View>
      </View>
      <ScrollView contentContainerStyle={s.cartContent}>
        {shop.cart.length === 0 ? (
          <EmptyState icon="bag-outline" title="Tu carrito está vacío" />
        ) : (
          <>
            <View style={s.checkoutSteps}>{['Carrito', 'Entrega', 'Confirmar'].map((label, index) => { const number = index + 1; return <View key={label} style={s.checkoutStep}><View style={[s.checkoutStepLine, index === 0 && { opacity: 0 }, number <= step && s.checkoutStepLineActive]} /><View style={[s.checkoutStepDot, number <= step && s.checkoutStepDotActive]}><Text style={[s.checkoutStepNumber, number <= step && s.checkoutStepNumberActive]}>{number < step ? '✓' : number}</Text></View><Text style={[s.checkoutStepLabel, number === step && s.checkoutStepLabelActive]}>{label}</Text></View>; })}</View>
            {step === 1 && <>
            {visible.map((x) => {
              const components = x.comboGroupId
                ? shop.cart.filter(
                    (line) => line.comboGroupId === x.comboGroupId,
                  )
                : [x];
              const lineTotal = components.reduce(
                (sum, line) => sum + line.unitTotal * line.quantity,
                0,
              );
              const editable = !x.comboGroupId && Boolean(x.sidesCategories?.length);
              return (
                <View key={x.lineId} style={s.cartLine}>
                  {x.image ? (
                    <ExpoImage source={{ uri: x.image }} transition={200} style={s.cartImage} />
                  ) : (
                    <View style={[s.cartImage, s.imagePlaceholder]}>
                      <Ionicons
                        name="pizza-outline"
                        size={28}
                        color={colors.brown}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.cartName}>{x.comboName || x.name}</Text>
                    <Text style={s.cartMeta}>
                      {x.comboGroupId
                        ? components
                            .map(
                              (line) =>
                                `${line.quantity}× ${line.name}${line.selectedSides.length ? ` (${line.selectedSides.map((side) => side.name).join(', ')})` : ''}`,
                            )
                            .join('\n')
                        : x.selectedSides
                            .map((side) => `${side.quantity}× ${side.name}`)
                            .join(', ') || x.category}
                    </Text>
                    <View style={s.cartLineFoot}>
                      <Text style={s.price}>{money(lineTotal)}</Text>
                      {editable && (
                        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${x.name}`} hitSlop={8} onPress={() => { haptics.tap(); setEditingLine(x); }} style={s.editLine}>
                          <Ionicons name="create-outline" size={13} color={colors.brown} />
                          <Text style={s.editLineText}>Editar</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  {x.comboGroupId ? (
                    <Pressable
                      style={s.removeCombo}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar combo ${x.comboName || x.name}`}
                      onPress={() => { haptics.warning(); shop.decrement(x.lineId); }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.red}
                      />
                    </Pressable>
                  ) : (
                    <View style={s.stepper}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Quitar uno de ${x.name}`} hitSlop={8} onPress={() => { haptics.tap(); shop.decrement(x.lineId); }}>
                        <Ionicons name="remove" size={20} />
                      </Pressable>
                      <Text style={s.qty}>{x.quantity}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Agregar uno de ${x.name}`} hitSlop={8} onPress={() => { haptics.tap(); shop.increment(x.lineId); }}>
                        <Ionicons name="add" size={20} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={s.summary}><Row label="Subtotal" value={money(subtotal)} /><Text style={s.checkoutHint}>Podrás confirmar entrega y pago en los próximos pasos.</Text></View>
            </>}
            {step === 2 && <>
            <Text style={s.optionTitle}>Tu modalidad</Text>
            <View style={s.checkoutContext}>
              <Ionicons name={deliveryType === 'delivery' ? 'bicycle' : 'storefront'} size={22} color={colors.brown} />
              <View style={{ flex: 1 }}><Text style={s.checkoutContextTitle}>{deliveryType === 'delivery' ? 'Delivery' : 'Recoger en sucursal'}</Text><Text style={s.checkoutContextSub}>{branch.name}</Text></View>
              <Ionicons name="checkmark-circle" size={21} color={colors.green} />
            </View>
            {deliveryType === 'delivery' && (
              <>
                <Text style={s.optionTitle}>Dirección</Text>
                {addresses.length ? (
                  addresses.map((a: any) => (
                    <Choice
                      key={a.id}
                      label={`${a.label || 'Dirección'} · ${a.street}`}
                      active={addressId === a.id}
                      onPress={() => { setAddressId(a.id); setAddressText(a.street ?? ''); }}
                    />
                  ))
                ) : (
                  <Pressable style={s.option} onPress={onLogin}>
                    <Text style={s.optionText}>
                      Agrega una dirección en tu perfil
                    </Text>
                  </Pressable>
                )}
                {selectedAddress && <View style={s.checkoutContext}><Ionicons name="navigate-circle" size={22} color={colors.green} /><View style={{ flex: 1 }}><Text style={s.checkoutContextTitle}>{selectedAddress.detected_zone_name || 'Zona validada'}</Text><Text style={s.checkoutContextSub}>Atiende {branch.name} · Delivery {money(delivery)}</Text></View></View>}
              </>
            )}
            </>}
            {step === 3 && <>
            <Text style={s.optionTitle}>Método de pago</Text>
            <View style={s.checkoutOptions}>
              {(branch.paymentMethods?.length ? branch.paymentMethods : [{ id: 1, name: 'EFECTIVO' }, { id: 2, name: 'TARJETA' }]).map((method) => (
                <Choice key={method.id} label={method.name === 'TARJETA' ? 'Tarjeta al recibir' : method.name.charAt(0) + method.name.slice(1).toLowerCase()} active={paymentMethodId === method.id} onPress={() => setPaymentMethodId(method.id)} />
              ))}
            </View>
            <View style={s.summary}>
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Delivery" value={deliveryType === 'delivery' ? money(delivery) : 'Sin costo'} />
              <View style={s.divider} />
              <Row label="Total" value={money(total)} strong />
            </View>
            <View style={s.reviewCard}><Ionicons name="shield-checkmark" size={22} color={colors.green} /><View style={{ flex: 1 }}><Text style={s.checkoutContextTitle}>Revisión segura</Text><Text style={s.checkoutContextSub}>Validaremos precios, inventario, cobertura y horario antes de crear el pedido.</Text></View></View>
            </>}
          </>
        )}
      </ScrollView>
      {shop.cart.length > 0 && (
        <View style={s.cartFooter}>
          {step > 1 && <Pressable accessibilityRole="button" accessibilityLabel="Paso anterior" onPress={() => { haptics.select(); setStep((step - 1) as 1 | 2); }} style={s.backStep}><Ionicons name="arrow-back" size={20} color={colors.brown} /></Pressable>}
          <Pressable
            disabled={sending}
            style={[s.primary, s.cartPrimary, sending && { opacity: 0.6 }]}
            onPress={() => { if (step < 3) { haptics.select(); setStep((step + 1) as 2 | 3); } else submit(); }}
          >
            {sending ? (
              <ActivityIndicator color={colors.brown} />
            ) : (
              <Text style={s.primaryText}>
                {auth.session
                  ? step === 1 ? 'Continuar con la entrega' : step === 2 ? 'Continuar al pago' : `Confirmar pedido · ${money(total)}`
                  : 'Iniciar sesión para ordenar'}
              </Text>
            )}
          </Pressable>
        </View>
      )}
      <ProductCustomizer
        product={editingLine}
        initial={editingLine ? { selectedSides: editingLine.selectedSides, note: editingLine.note, quantity: editingLine.quantity } : undefined}
        onClose={() => setEditingLine(null)}
        onConfirm={(value) => {
          if (!editingLine) return;
          shop.updateLine(editingLine.lineId, value);
          haptics.success();
        }}
      />
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => { haptics.select(); onPress(); }} style={[s.option, active && s.optionActive]}>
      <View style={[s.radio, active && s.radioActive]} />
      <Text style={s.optionText}>{label}</Text>
    </Pressable>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={strong ? s.totalText : s.summaryText}>{label}</Text>
      <Text style={strong ? s.totalText : s.summaryText}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  cartScreen: { flex: 1, backgroundColor: '#F8F3EE' },
  cartHeader: { minHeight: 76, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brown, gap: 12 },
  cartBack: { width: 43, height: 43, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  cartKicker: { fontSize: 10, fontFamily: font.black, letterSpacing: 1.2, color: colors.yellow },
  cartTitle: { fontSize: 23, fontFamily: font.display, letterSpacing: 0.5, color: 'white', marginTop: 2 },
  cartItemCount: { minWidth: 36, height: 36, borderRadius: 12, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  cartItemCountText: { fontSize: 13, fontFamily: font.black, color: colors.brown },
  cartContent: { padding: 16, paddingBottom: 125 },
  checkoutSteps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, paddingHorizontal: 2, backgroundColor: 'white', borderRadius: 18, paddingVertical: 13, borderWidth: 1, borderColor: '#E9DED7' },
  checkoutStep: { alignItems: 'center', flex: 1, gap: 5, position: 'relative' },
  checkoutStepLine: { position: 'absolute', height: 2, backgroundColor: '#E4D8D2', right: '50%', left: '-50%', top: 14 },
  checkoutStepLineActive: { backgroundColor: colors.brown },
  checkoutStepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEE5E0', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  checkoutStepDotActive: { backgroundColor: colors.brown },
  checkoutStepNumber: { fontSize: 11, fontFamily: font.black, color: colors.muted },
  checkoutStepNumberActive: { color: 'white' },
  checkoutStepLabel: { fontSize: 10, fontFamily: font.bold, color: colors.muted },
  checkoutStepLabelActive: { color: colors.brown, fontFamily: font.black },
  cartLine: { backgroundColor: 'white', borderRadius: 20, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 11, borderWidth: 1, borderColor: '#E9DED7' },
  cartImage: { width: 76, height: 76, borderRadius: 16 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cartName: { fontSize: 14, lineHeight: 18, fontFamily: font.black, color: colors.text },
  cartMeta: { fontSize: 10, lineHeight: 14, color: colors.muted, marginVertical: 5 },
  cartLineFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { fontSize: 15, fontFamily: font.black, color: colors.brown },
  editLine: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.yellowSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  editLineText: { fontSize: 10, fontFamily: font.black, color: colors.brown },
  removeCombo: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  stepper: { height: 36, borderRadius: 12, backgroundColor: colors.yellowSoft, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10 },
  qty: { fontFamily: font.black },
  summary: { backgroundColor: 'white', borderRadius: 18, padding: 17, marginTop: 10 },
  checkoutHint: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 10 },
  optionTitle: { fontSize: 17, fontFamily: font.black, color: colors.text, marginTop: 22, marginBottom: 8 },
  checkoutContext: { minHeight: 62, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkoutContextTitle: { fontSize: 13, fontFamily: font.black, color: colors.text },
  checkoutContextSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  checkoutOptions: { gap: 8 },
  option: { height: 55, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white', marginBottom: 8, borderRadius: 15 },
  optionActive: { borderWidth: 2, borderColor: colors.yellow },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#BBAEAA', marginRight: 10 },
  radioActive: { borderWidth: 5, borderColor: colors.yellow },
  optionText: { flex: 1, fontFamily: font.extraBold, color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 7 },
  summaryText: { fontSize: 14, color: colors.muted },
  totalText: { fontSize: 18, fontFamily: font.black, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  reviewCard: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, borderRadius: 14, backgroundColor: '#EDF9F1', borderWidth: 1, borderColor: '#C9EBD5', marginTop: 12 },
  cartFooter: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E9DED7', flexDirection: 'row', alignItems: 'center', gap: 10 },
  backStep: { width: 50, height: 52, borderRadius: 15, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  primary: { height: 55, borderRadius: 16, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { fontSize: 15, fontFamily: font.black, color: colors.brown },
  cartPrimary: { flex: 1, marginTop: 0 },
});

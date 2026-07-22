import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrderDetail } from '@/features/customer/api';
import { colors } from '@/shared/theme';

type Props = { visible: boolean; orderId: number | null; onClose: () => void };

const money = (v: number) => `RD$${(v ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function OrderDetailModal({ visible, orderId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => getOrderDetail(orderId!),
    enabled: !!orderId && visible,
    refetchInterval: visible ? 15_000 : undefined, // Auto-update status every 15s in background
  });

  // Calculate totals from items
  const detailsList = (order?.orders ?? []).flatMap((o: any) => o.order_details ?? []);
  const subtotal = detailsList.reduce((sum: number, x: any) => sum + (Number(x.original_price) * Number(x.quantity)), 0);
  const discount = detailsList.reduce((sum: number, x: any) => sum + (Number(x.discount_amount) * Number(x.quantity)), 0);
  const taxes = detailsList.reduce((sum: number, x: any) => {
    const rawTotal = (Number(x.original_price) - Number(x.discount_amount)) * Number(x.quantity);
    return sum + (rawTotal * (Number(x.tax_value) || 0));
  }, 0);

  const deliveryCost = Number(order?.cost_delivery || 0);
  const grandTotal = subtotal - discount + taxes + deliveryCost;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.backBtn} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Pedido #{orderId}</Text>
            {order?.location_name && (
              <Text style={s.headerSubtitle} numberOfLines={1}>{order.location_name_short || order.location_name}</Text>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        {isLoading ? (
          <View style={s.loader}>
            <ActivityIndicator color={colors.yellow} size="large" />
            <Text style={s.loaderText}>Buscando detalles de tu orden…</Text>
          </View>
        ) : error || !order ? (
          <View style={s.errorState}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.red} />
            <Text style={s.errorTitle}>Error al cargar</Text>
            <Text style={s.errorBody}>No pudimos conectar con el servidor para obtener los detalles de tu orden.</Text>
            <Pressable onPress={onClose} style={s.errorBtn}>
              <Text style={s.errorBtnText}>Volver atrás</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Status Section */}
            <View style={s.statusCard}>
              <View style={s.statusHeader}>
                <Ionicons name="time-outline" size={20} color={colors.brown} />
                <Text style={s.statusLabel}>Estado del pedido</Text>
                <View style={[s.statusBadge, order.color && { backgroundColor: `${order.color}22` }]}>
                  <Text style={[s.statusText, order.color && { color: order.color }]}>
                    {order.status_name || 'Recibido'}
                  </Text>
                </View>
              </View>
              <Text style={s.orderDate}>Realizado el {order.created_at_format || new Date(order.created_at).toLocaleString()}</Text>
            </View>

            {/* Products List */}
            <Text style={s.sectionTitle}>Productos en tu orden</Text>
            <View style={s.card}>
              {detailsList.map((item: any, idx: number) => {
                // Determine if it is part of a combo
                const isCombo = !!item.combo_item_id;
                
                return (
                  <View key={`${item.item_id}-${idx}`} style={[s.productRow, idx > 0 && s.productBorder]}>
                    <View style={s.productInfo}>
                      <View style={s.titleRow}>
                        <Text style={s.productName}>
                          {item.quantity}× {item.item_name}
                        </Text>
                        <Text style={s.productPrice}>{money(Number(item.original_price) * Number(item.quantity))}</Text>
                      </View>

                      {isCombo && (
                        <View style={s.comboBadge}>
                          <Ionicons name="gift-outline" size={12} color={colors.orange} />
                          <Text style={s.comboText}>Parte del Combo: {item.combo_name}</Text>
                        </View>
                      )}

                      {/* Display sides / customization */}
                      {item.side_types && item.side_types.map((type: any) => {
                        const sides = type.sides || [];
                        if (sides.length === 0) return null;
                        return (
                          <View key={type.id} style={s.sideCategoryWrap}>
                            <Text style={s.sideCategoryName}>{type.name}:</Text>
                            {sides.map((side: any) => (
                              <Text key={side.id} style={s.sideItem}>
                                • {side.name} {side.price > 0 ? `(+${money(Number(side.price))})` : ''}
                              </Text>
                            ))}
                          </View>
                        );
                      })}

                      {/* Notes for kitchen */}
                      {item.item_note ? (
                        <View style={s.noteRow}>
                          <Ionicons name="chatbubble-outline" size={12} color={colors.muted} />
                          <Text style={s.noteText}>Nota: "{item.item_note}"</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Delivery Info */}
            {order.is_delivery && (
              <>
                <Text style={s.sectionTitle}>Dirección de entrega</Text>
                <View style={s.card}>
                  <View style={s.infoRow}>
                    <Ionicons name="location-outline" size={20} color={colors.brown} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoLabel}>Dirección</Text>
                      <Text style={s.infoValue}>{order.delivery_address}</Text>
                      {order.delivery_reference_point ? (
                        <Text style={s.infoValueSub}>Ref: {order.delivery_reference_point}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={s.infoDivider} />

                  <View style={s.infoRow}>
                    <Ionicons name="phone-portrait-outline" size={20} color={colors.brown} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoLabel}>Teléfono de contacto</Text>
                      <Text style={s.infoValue}>{order.delivery_phone || order.phone}</Text>
                    </View>
                  </View>

                  {order.delivery_notes ? (
                    <>
                      <View style={s.infoDivider} />
                      <View style={s.infoRow}>
                        <Ionicons name="document-text-outline" size={20} color={colors.brown} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.infoLabel}>Instrucciones de entrega</Text>
                          <Text style={s.infoValue}>{order.delivery_notes}</Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              </>
            )}

            {/* Payment & Breakdown */}
            <Text style={s.sectionTitle}>Resumen de pago</Text>
            <View style={s.card}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal</Text>
                <Text style={s.totalValue}>{money(subtotal)}</Text>
              </View>

              {discount > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Descuentos</Text>
                  <Text style={[s.totalValue, { color: colors.green }]}>-{money(discount)}</Text>
                </View>
              )}

              {taxes > 0 && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Impuestos (ITBIS)</Text>
                  <Text style={s.totalValue}>{money(taxes)}</Text>
                </View>
              )}

              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Costo de envío</Text>
                <Text style={s.totalValue}>{deliveryCost > 0 ? money(deliveryCost) : 'Gratis'}</Text>
              </View>

              <View style={s.totalDivider} />

              <View style={[s.totalRow, { marginTop: 4 }]}>
                <Text style={s.grandTotalLabel}>Total</Text>
                <Text style={s.grandTotalValue}>{money(grandTotal)}</Text>
              </View>

              {order.payment_method_id && (
                <View style={s.paymentMethodBox}>
                  <Ionicons name="card-outline" size={16} color={colors.muted} />
                  <Text style={s.paymentMethodText}>
                    Método previsto: {order.payment_method_id === 1 ? 'Efectivo' : 'Tarjeta al recibir'}
                  </Text>
                </View>
              )}
            </View>

            {/* Rider Information */}
            {order.assigned_driver_name && (
              <View style={s.driverCard}>
                <Ionicons name="bicycle-outline" size={24} color={colors.brown} />
                <View style={{ flex: 1 }}>
                  <Text style={s.driverTitle}>Repartidor asignado</Text>
                  <Text style={s.driverName}>{order.assigned_driver_name}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: 'white' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: colors.muted },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  errorBody: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  errorBtn: { backgroundColor: colors.yellow, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  errorBtnText: { fontSize: 14, fontWeight: '900', color: colors.brown },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.yellowSoft },
  statusText: { fontSize: 11, fontWeight: '900', color: colors.brown },
  orderDate: { fontSize: 11, color: colors.muted, marginTop: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginTop: 8, marginBottom: 10, paddingLeft: 4 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  productRow: { paddingVertical: 12 },
  productBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  productInfo: { gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 14, fontWeight: '900', color: colors.text, flex: 1, marginRight: 16 },
  productPrice: { fontSize: 14, fontWeight: '900', color: colors.brown },
  comboBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  comboText: { fontSize: 11, fontWeight: '800', color: colors.orange },
  sideCategoryWrap: { marginTop: 6, paddingLeft: 10 },
  sideCategoryName: { fontSize: 12, fontWeight: '800', color: colors.muted },
  sideItem: { fontSize: 12, color: colors.text, marginLeft: 6, marginTop: 2 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 10 },
  noteText: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoLabel: { fontSize: 11, fontWeight: '800', color: colors.muted },
  infoValue: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2, lineHeight: 18 },
  infoValueSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: colors.muted },
  totalValue: { fontSize: 13, fontWeight: '800', color: colors.text },
  totalDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  grandTotalLabel: { fontSize: 15, fontWeight: '900', color: colors.text },
  grandTotalValue: { fontSize: 18, fontWeight: '900', color: colors.brown },
  paymentMethodBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  paymentMethodText: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  driverCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  driverTitle: { fontSize: 11, fontWeight: '800', color: colors.muted },
  driverName: { fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 2 },
});

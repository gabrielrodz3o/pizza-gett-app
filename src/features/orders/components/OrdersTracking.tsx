import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/shared/components/EmptyState';
import { colors } from '@/shared/theme';
import { OrderDetailModal } from './OrderDetailModal';

const money = (v: number) => `RD$${v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function OrdersTracking({
  session,
  loading,
  orders,
  onLogin,
  onRetry,
  onReorder,
}: {
  session: boolean;
  loading: boolean;
  orders: any[];
  onLogin: () => void;
  onRetry: () => void;
  onReorder: (order: any) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  if (!session) {
    return (
      <View style={s.empty}>
        <Ionicons name="navigate-outline" size={42} color={colors.brown} />
        <Text style={s.emptyTitle}>Sigue tu pedido en vivo</Text>
        <Text style={s.emptyBody}>
          Inicia sesión para recuperar tus pedidos anteriores y saber cuándo salen a delivery.
        </Text>
        <Pressable onPress={onLogin} style={s.button}>
          <Text style={s.buttonText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.empty}>
        <ActivityIndicator color={colors.yellow} size="large" />
        <Text style={s.emptyBody}>Buscando tus pedidos…</Text>
      </View>
    );
  }

  if (!orders.length) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="Aún no tienes pedidos"
        body="Cuando ordenes, podrás seguir tu pizza desde el horno hasta tu puerta."
      />
    );
  }

  return (
    <>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Mis pedidos</Text>
          <Text style={s.subtitle}>Actividad y seguimiento</Text>
        </View>
        <Pressable onPress={onRetry} hitSlop={15}>
          <Ionicons name="refresh" size={22} color={colors.brown} />
        </Pressable>
      </View>

      {orders.map((order) => (
        <OrderCard key={order.account_id} order={order} onPress={() => setSelectedOrder(order.account_id)} onReorder={() => onReorder(order)} />
      ))}

      <OrderDetailModal
        visible={selectedOrder !== null}
        orderId={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </>
  );
}

function OrderCard({ order, onPress, onReorder }: { order: any; onPress: () => void; onReorder: () => void }) {
  const status = Number(order.status_tracker_id || 1);
  const progress = Math.min(5, Math.max(1, status <= 2 ? status : status >= 6 ? 5 : status >= 5 ? 4 : 3));

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
      <View style={s.top}>
        <View>
          <Text style={s.number}>Pedido #{order.account_id}</Text>
          <Text style={s.date}>{new Date(order.created_at).toLocaleString('es-DO')}</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>{order.status_name || 'Recibido'}</Text>
        </View>
      </View>

      <Text style={s.branch}>{order.location_name || 'Pizza Getto'}</Text>
      {order.delivery_address ? (
        <Text style={s.address} numberOfLines={1}>
          {order.delivery_address}
        </Text>
      ) : null}

      <View style={s.track}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View key={step} style={[s.dot, step <= progress && s.dotActive]} />
        ))}
      </View>

      <View style={s.labels}>
        {['Recibido', 'Preparando', 'Listo', 'En camino', 'Entregado'].map((x) => (
          <Text key={x} style={s.label}>
            {x}
          </Text>
        ))}
      </View>

      <View style={s.bottom}>
        <Text style={s.type}>{order.is_delivery ? 'Delivery' : 'Recogida'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Volver a pedir pedido ${order.account_id}`} onPress={(event) => { event.stopPropagation(); onReorder(); }} style={s.reorderBtn}><Ionicons name="repeat" size={15} color={colors.brown} /><Text style={s.reorderText}>Volver a pedir</Text></Pressable>
        <View style={s.priceWrap}>
          <Text style={s.price}>{money(Number(order.subtotal || 0) + Number(order.delivery_cost || 0))}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brown} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 65, paddingHorizontal: 25 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 15, textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center', marginTop: 7 },
  button: { marginTop: 16, backgroundColor: colors.yellow, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 11 },
  buttonText: { fontSize: 13, fontWeight: '900', color: colors.brown },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 27, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 3 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  cardPressed: { opacity: 0.8, backgroundColor: colors.cream },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  number: { fontSize: 17, fontWeight: '900', color: colors.text },
  date: { fontSize: 10, color: colors.muted, marginTop: 3 },
  badge: { borderRadius: 10, backgroundColor: colors.yellowSoft, paddingHorizontal: 9, paddingVertical: 6 },
  badgeText: { fontSize: 10, fontWeight: '900', color: colors.brown },
  branch: { fontSize: 13, fontWeight: '800', color: colors.brown, marginTop: 14 },
  address: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 3 },
  track: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.border, height: 3, marginHorizontal: 6, marginTop: 22 },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.border, marginTop: -5 },
  dotActive: { backgroundColor: colors.green },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { fontSize: 8, color: colors.muted, maxWidth: 55, textAlign: 'center' },
  bottom: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 15, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 12, fontWeight: '800', color: colors.muted },
  reorderBtn:{ flexDirection:'row',alignItems:'center',gap:5,backgroundColor:colors.yellowSoft,borderRadius:9,paddingHorizontal:9,paddingVertical:7 },reorderText:{ fontSize:10,fontWeight:'900',color:colors.brown },
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: 15, fontWeight: '900', color: colors.brown },
});

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptics } from '@/shared/haptics';
import { colors, font } from '@/shared/theme';

export function OrderConfirmation({ visible, order, onHome, onTrack }: { visible: boolean; order: any; onHome: () => void; onTrack: () => void }) {
  const eta = order?.scheduled_for ? new Date(order.scheduled_for).toLocaleString('es-DO', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : order?.mode === 'delivery' ? '30–45 minutos' : '15–25 minutos';
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      haptics.success();
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 14 }).start();
    }
  }, [visible, pop]);
  return <Modal visible={visible} animationType="slide" onRequestClose={onHome}><SafeAreaView style={s.confirmScreen}>
    <Animated.View style={[s.confirmIcon, { transform: [{ scale: pop }] }]}><Ionicons name="checkmark" size={48} color="white" /></Animated.View>
    <Text style={s.confirmKicker}>PEDIDO CONFIRMADO</Text><Text style={s.confirmTitle}>¡Ya estamos preparando tu pizza!</Text>
    <Text style={s.confirmNumber}>Orden {order?.order_code || `#${order?.account_id}`}</Text>
    <View style={s.confirmEta}><Ionicons name="time" size={24} color={colors.brown} /><View><Text style={s.confirmEtaLabel}>Tiempo estimado</Text><Text style={s.confirmEtaValue}>{eta}</Text></View></View>
    <Text style={s.confirmBranch}>{order?.branchName}</Text><Text style={s.confirmBody}>Puedes seguir cada etapa del pedido desde la sección Pedidos.</Text>
    <Pressable onPress={onTrack} style={s.confirmPrimary}><Text style={s.confirmPrimaryText}>Seguir mi pedido</Text></Pressable>
    <Pressable onPress={onHome} style={s.confirmSecondary}><Text style={s.confirmSecondaryText}>Volver al inicio</Text></Pressable>
  </SafeAreaView></Modal>;
}

const s = StyleSheet.create({
  confirmScreen: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 28 },
  confirmIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  confirmKicker: { fontSize: 11, fontFamily: font.black, letterSpacing: 1.5, color: colors.green },
  confirmTitle: { fontSize: 34, lineHeight: 38, fontFamily: font.display, letterSpacing: 0.4, color: colors.text, textAlign: 'center', marginTop: 8 },
  confirmNumber: { fontSize: 15, fontFamily: font.extraBold, color: colors.muted, marginTop: 10 },
  confirmEta: { width: '100%', backgroundColor: 'white', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28, borderWidth: 1, borderColor: colors.border },
  confirmEtaLabel: { fontSize: 11, color: colors.muted },
  confirmEtaValue: { fontSize: 18, fontFamily: font.black, color: colors.brown, marginTop: 2 },
  confirmBranch: { fontSize: 13, fontFamily: font.black, color: colors.brown, marginTop: 18 },
  confirmBody: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center', marginTop: 7 },
  confirmPrimary: { width: '100%', height: 54, borderRadius: 16, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  confirmPrimaryText: { fontSize: 15, fontFamily: font.black, color: colors.brown },
  confirmSecondary: { padding: 16 },
  confirmSecondaryText: { fontSize: 13, fontFamily: font.extraBold, color: colors.muted },
});

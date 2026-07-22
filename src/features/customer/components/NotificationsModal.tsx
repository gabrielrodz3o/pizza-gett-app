import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/shared/theme';

type Props = { visible: boolean; onClose: () => void };

type NotifSetting = { id: string; icon: string; title: string; description: string; enabled: boolean };

export function NotificationsModal({ visible, onClose }: Props) {
  const [settings, setSettings] = useState<NotifSetting[]>([
    { id: 'order_status', icon: 'receipt-outline', title: 'Estado de pedidos', description: 'Te avisamos cuando tu pedido sea recibido, preparado y enviado.', enabled: true },
    { id: 'promotions', icon: 'pricetag-outline', title: 'Ofertas y promociones', description: 'Descuentos especiales y combos del día en tu sucursal.', enabled: true },
    { id: 'new_products', icon: 'pizza-outline', title: 'Nuevos productos', description: 'Entérate primero cuando lleguen nuevas pizzas y bebidas.', enabled: false },
    { id: 'reminders', icon: 'time-outline', title: 'Recordatorios', description: 'Sugerencias basadas en tus horarios habituales de pedido.', enabled: false },
  ]);

  useEffect(() => { AsyncStorage.getItem('pizza-getto-notification-settings').then((raw) => { if (raw) setSettings(JSON.parse(raw)); }).catch(() => undefined); }, []);

  const toggle = (id: string) => setSettings((prev) => {
    const next = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    void AsyncStorage.setItem('pizza-getto-notification-settings', JSON.stringify(next));
    return next;
  });

  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        <View style={s.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={s.headerTitle}>Notificaciones</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sectionTitle}>Preferencias de avisos</Text>
          <Text style={s.sectionSubtitle}>
            Elige qué tipo de notificaciones deseas recibir de Pizza Getto.
          </Text>

          <View style={s.card}>
            {settings.map((setting, index) => (
              <View key={setting.id} style={[s.row, index > 0 && s.rowBorder]}>
                <View style={s.iconWrap}>
                  <Ionicons name={setting.icon as any} size={22} color={colors.brown} />
                </View>
                <View style={s.rowContent}>
                  <Text style={s.rowTitle}>{setting.title}</Text>
                  <Text style={s.rowDesc}>{setting.description}</Text>
                </View>
                <Switch
                  value={setting.enabled}
                  onValueChange={() => toggle(setting.id)}
                  trackColor={{ false: colors.border, true: colors.yellow }}
                  thumbColor={setting.enabled ? colors.brown : '#ccc'}
                />
              </View>
            ))}
          </View>

          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
            <Text style={s.infoText}>
              Para recibir notificaciones debes permitir que Pizza Getto acceda a las notificaciones en la configuración de tu teléfono.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: 'white' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  rowDesc: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 16 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: 'white', borderRadius: 16, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17 },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCustomerAuth } from '@/features/auth/store';
import { confirmSheet } from '@/shared/components/ConfirmSheet';
import { toast } from '@/shared/components/Toast';
import { haptics } from '@/shared/haptics';
import { colors, font } from '@/shared/theme';
import { AddressesModal } from './AddressesModal';
import { NotificationsModal } from './NotificationsModal';

type Row = { icon: string; label: string; onPress: () => void; danger?: boolean };

export function ProfileContent({ branchName, supportPhone, onLogin, onChangeContext }: { branchName: string; supportPhone?: string; onLogin: () => void; onChangeContext: () => void }) {
  const auth = useCustomerAuth();
  const [showAddresses, setShowAddresses] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const comingSoon = (name: string) =>
    toast(`${name} estará disponible próximamente 🚀`, 'info');

  const requireAuth = (action: () => void) => {
    if (!auth.session) { onLogin(); return; }
    action();
  };

  const rows: Row[] = [
    {
      icon: 'location-outline',
      label: 'Mis direcciones',
      onPress: () => requireAuth(() => setShowAddresses(true)),
    },
    {
      icon: 'card-outline',
      label: 'Métodos de pago',
      onPress: () => comingSoon('Métodos de pago'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notificaciones',
      onPress: () => setShowNotifications(true),
    },
    {
      icon: 'storefront-outline',
      label: `Entrega y sucursal · ${branchName.replace('Pizza Getto • ', '')}`,
      onPress: onChangeContext,
    },
    {
      icon: 'help-circle-outline',
      label: 'Ayuda y soporte',
      onPress: () => supportPhone ? confirmSheet({ title: 'Ayuda y soporte', message: `Comunícate con ${branchName.replace('Pizza Getto • ', '')}.`, icon: 'call', confirmText: 'Llamar', onConfirm: () => Linking.openURL(`tel:${supportPhone.replace(/\D/g, '')}`) }) : toast('No encontramos el teléfono de esta sucursal.', 'error'),
    },
  ];

  const handleSignOut = () => {
    haptics.warning();
    confirmSheet({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      icon: 'log-out',
      confirmText: 'Cerrar sesión',
      destructive: true,
      onConfirm: auth.signOut,
    });
  };

  return (
    <>
      <Text style={s.title}>Tu perfil</Text>
      <Text style={s.subtitle}>Todo lo tuyo, en un solo lugar.</Text>

      {/* Identity card */}
      <Pressable
        onPress={auth.session ? undefined : onLogin}
        style={({ pressed }) => [s.card, !auth.session && pressed && s.pressed]}
      >
        <View style={s.avatar}>
          <Ionicons
            name={auth.session ? 'person' : 'log-in-outline'}
            size={28}
            color={colors.brown}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{auth.session?.profile.name || 'Inicia sesión'}</Text>
          <Text style={s.description}>
            {auth.session
              ? (auth.session.profile.phone || auth.session.profile.email || 'Cliente Pizza Getto')
              : 'Recupera tus direcciones y pedidos anteriores'}
          </Text>
        </View>
        {!auth.session && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
      </Pressable>

      {/* Option rows */}
      <View style={s.section}>
        {rows.map(({ icon, label, onPress }, index) => (
          <Pressable
            key={label}
            onPress={onPress}
            style={({ pressed }) => [s.row, pressed && s.pressed, index > 0 && s.rowBorder]}
          >
            <Ionicons name={icon as any} size={22} color={colors.brown} />
            <Text style={s.rowLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      {/* Sign out */}
      {auth.session && (
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [s.row, s.signOut, pressed && s.pressed]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.red} />
          <Text style={[s.rowLabel, { color: colors.red }]}>Cerrar sesión</Text>
        </Pressable>
      )}

      <Text style={s.version}>Pizza Getto App · v1.0.0 (staging)</Text>

      {/* Modals */}
      <AddressesModal visible={showAddresses} onClose={() => setShowAddresses(false)} />
      <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 32, fontFamily: font.display, letterSpacing: 0.4, color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 3 },
  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    flexDirection: 'row', gap: 12, alignItems: 'center',
    marginTop: 22, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 15, fontFamily: font.black, color: colors.text },
  description: { fontSize: 11, lineHeight: 15, color: colors.muted, marginTop: 4 },
  section: {
    backgroundColor: 'white', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  row: { height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: font.bold, color: colors.text },
  signOut: {
    backgroundColor: 'white', borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  version: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 24 },
});

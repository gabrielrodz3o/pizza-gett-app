import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, font, shadow } from '@/shared/theme';

type ToastKind = 'success' | 'info' | 'error';
type ToastState = {
  message: string; kind: ToastKind; key: number;
  show: (message: string, kind?: ToastKind) => void;
};

export const useToast = create<ToastState>((set) => ({
  message: '', kind: 'success', key: 0,
  show: (message, kind = 'success') => set((s) => ({ message, kind, key: s.key + 1 })),
}));

export const toast = (message: string, kind: ToastKind = 'success') => useToast.getState().show(message, kind);

const icons: Record<ToastKind, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle', info: 'information-circle', error: 'alert-circle',
};
const tints: Record<ToastKind, string> = { success: colors.green, info: colors.yellow, error: colors.red };

export function AppToast() {
  const { message, kind, key } = useToast();
  const insets = useSafeAreaInsets();
  const motion = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!key) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.spring(motion, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(motion, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    }, 2200);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [key, motion]);

  if (!key) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[s.toast, { bottom: 96 + insets.bottom, opacity: motion, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}
    >
      <Ionicons name={icons[kind]} size={20} color={tints[kind]} />
      <Text style={s.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute', left: 20, right: 20, zIndex: 9999,
    minHeight: 52, borderRadius: 16, backgroundColor: colors.brownDark,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 15, paddingVertical: 12, ...shadow, shadowOpacity: 0.28,
  },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: font.bold, color: 'white' },
});

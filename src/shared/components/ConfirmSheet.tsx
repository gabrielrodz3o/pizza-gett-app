import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, font } from '@/shared/theme';

type SheetOptions = {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  confirmText?: string;
  cancelText?: string | null;
  destructive?: boolean;
  onConfirm?: () => void;
};

type SheetState = { options: SheetOptions | null; open: (options: SheetOptions) => void; close: () => void };

export const useConfirmSheet = create<SheetState>((set) => ({
  options: null,
  open: (options) => set({ options }),
  close: () => set({ options: null }),
}));

export const confirmSheet = (options: SheetOptions) => useConfirmSheet.getState().open(options);

export function ConfirmSheetHost() {
  const { options, close } = useConfirmSheet();
  const insets = useSafeAreaInsets();
  const motion = useRef(new Animated.Value(0)).current;
  const visible = Boolean(options);

  useEffect(() => {
    if (visible) {
      motion.setValue(0);
      Animated.timing(motion, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, motion]);

  if (!options) return null;
  const confirm = () => { close(); options.onConfirm?.(); };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close}>
        <Animated.View
          style={[s.sheet, { paddingBottom: 18 + insets.bottom, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={s.grabber} />
          <View style={[s.iconWrap, options.destructive && s.iconWrapDanger]}>
            <Ionicons name={options.icon ?? (options.destructive ? 'alert' : 'help')} size={26} color={options.destructive ? colors.red : colors.brown} />
          </View>
          <Text style={s.title}>{options.title}</Text>
          {options.message ? <Text style={s.message}>{options.message}</Text> : null}
          <Pressable onPress={confirm} style={[s.primary, options.destructive && s.primaryDanger]}>
            <Text style={[s.primaryText, options.destructive && s.primaryTextDanger]}>{options.confirmText ?? 'Confirmar'}</Text>
          </Pressable>
          {options.cancelText !== null && (
            <Pressable onPress={close} style={s.secondary}>
              <Text style={s.secondaryText}>{options.cancelText ?? 'Cancelar'}</Text>
            </Pressable>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,8,6,.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 10, alignItems: 'center',
  },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D8CCC6', marginBottom: 16 },
  iconWrap: { width: 62, height: 62, borderRadius: 21, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  iconWrapDanger: { backgroundColor: '#FDEBEB' },
  title: { fontSize: 22, fontFamily: font.black, color: colors.text, textAlign: 'center' },
  message: { fontSize: 13, lineHeight: 19, fontFamily: font.medium, color: colors.muted, textAlign: 'center', marginTop: 8 },
  primary: { alignSelf: 'stretch', height: 54, borderRadius: 16, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryDanger: { backgroundColor: colors.red },
  primaryText: { fontSize: 15, fontFamily: font.black, color: colors.brown },
  primaryTextDanger: { color: 'white' },
  secondary: { alignSelf: 'stretch', height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryText: { fontSize: 13, fontFamily: font.extraBold, color: colors.muted },
});

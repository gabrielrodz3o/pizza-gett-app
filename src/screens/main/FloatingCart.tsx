import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, shadow } from '@/shared/theme';
import { money } from './helpers';

export function FloatingCart({ count, subtotal, bottom, onPress }: { count: number; subtotal: number; bottom: number; onPress: () => void }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 9 }).start();
  }, [rise]);
  return (
    <Animated.View style={[s.floatingCart, { bottom, opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [56, 0] }) }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir carrito con ${count} productos, total ${money(subtotal)}`} onPress={onPress} style={s.floatingCartPress}>
        <View style={s.floatingCartCount}><Text style={s.floatingCartCountText}>{count}</Text></View>
        <Text style={s.floatingCartText}>Ver carrito</Text><Text style={s.floatingCartTotal}>{money(subtotal)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  floatingCart: { position: 'absolute', left: 18, right: 18, height: 54, borderRadius: 17, backgroundColor: colors.brown, zIndex: 20, ...shadow },
  floatingCartPress: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  floatingCartCount: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  floatingCartCountText: { fontSize: 12, fontFamily: font.black, color: colors.brown },
  floatingCartText: { flex: 1, marginLeft: 10, fontSize: 14, fontFamily: font.black, color: 'white' },
  floatingCartTotal: { fontSize: 14, fontFamily: font.black, color: colors.yellow },
});

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function SkeletonCards() {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <View style={s.grid}>{[1, 2, 3, 4].map((item) => <Animated.View key={item} style={[s.skeletonCard, { opacity: pulse }]}><View style={s.skeletonImage} /><View style={s.skeletonLineWide} /><View style={s.skeletonLine} /></Animated.View>)}</View>;
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skeletonCard: { width: '48%', height: 218, borderRadius: 19, backgroundColor: 'white', overflow: 'hidden' },
  skeletonImage: { height: 125, backgroundColor: '#EEE8E4' },
  skeletonLineWide: { height: 14, borderRadius: 7, backgroundColor: '#EEE8E4', margin: 12, marginBottom: 7 },
  skeletonLine: { height: 10, width: '58%', borderRadius: 5, backgroundColor: '#F2EEEB', marginHorizontal: 12 },
});

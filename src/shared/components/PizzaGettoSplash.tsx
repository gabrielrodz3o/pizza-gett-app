import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Montserrat_700Bold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { haptics } from '@/shared/haptics';

const splashPizzas = [
  { name: 'TRIPLERONI', source: require('../../../assets/pizzas/splash/tripleroni.jpg') },
  { name: 'GETTONA', source: require('../../../assets/pizzas/splash/gettona.jpg') },
  { name: 'VEGETARIANA', source: require('../../../assets/pizzas/splash/vegetariana.jpg') },
  { name: 'SUPER MEATS', source: require('../../../assets/pizzas/splash/super-meats.jpg') },
  { name: 'MEXICANA', source: require('../../../assets/pizzas/splash/mexicana.jpg') },
] as const;

const MIN_DISPLAY_MS = 1900;
const MIN_DISPLAY_REDUCED_MS = 600;
const HARD_CAP_MS = 6000;
const OUTRO_MS = 320;

export function PizzaGettoSplash({ ready = true, onFinish }: { ready?: boolean; onFinish: () => void }) {
  const [fontsReady] = useFonts({ BebasNeue_400Regular, Montserrat_700Bold, Montserrat_900Black });
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [forceFinish, setForceFinish] = useState(false);
  const finishing = useRef(false);

  const open = useRef(new Animated.Value(0)).current;
  const steam = useRef(new Animated.Value(0)).current;
  const outro = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const pizza = useRef(splashPizzas[Math.floor(Math.random() * splashPizzas.length)]).current;

  const boxW = Math.min(300, width - 88);
  const boxH = Math.round(boxW * (245 / 280));
  const pizzaSize = Math.round(boxW * 0.75);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(Boolean(enabled)))
      .catch(() => undefined);
  }, []);

  // La escena JS ya está montada: soltamos el splash nativo con fade (configurado en _layout).
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // Apertura one-shot: la caja se abre y se queda abierta.
  useEffect(() => {
    if (reduceMotion) { open.setValue(1); return; }
    const opening = Animated.timing(open, { toValue: 1, duration: 1500, delay: 250, easing: Easing.bezier(0.22, 0.9, 0.28, 1), useNativeDriver: true });
    opening.start(({ finished }) => { if (finished) haptics.tap(); });
    return () => opening.stop();
  }, [open, reduceMotion]);

  // Vapor: loop continuo independiente.
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(steam, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(steam, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [steam, reduceMotion]);

  // Progreso: avanza hasta 85% durante la exhibición mínima; el outro lo completa.
  useEffect(() => {
    const fill = Animated.timing(progress, { toValue: 0.85, duration: MIN_DISPLAY_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    fill.start();
    return () => fill.stop();
  }, [progress]);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinElapsed(true), reduceMotion ? MIN_DISPLAY_REDUCED_MS : MIN_DISPLAY_MS);
    const capTimer = setTimeout(() => setForceFinish(true), HARD_CAP_MS);
    return () => { clearTimeout(minTimer); clearTimeout(capTimer); };
  }, [reduceMotion]);

  // Salida: cuando la app está lista y pasó el mínimo (o se alcanzó el tope duro).
  useEffect(() => {
    const shouldFinish = forceFinish || (minElapsed && ready);
    if (!shouldFinish || finishing.current) return;
    finishing.current = true;
    Animated.parallel([
      Animated.timing(progress, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(outro, { toValue: 1, duration: OUTRO_MS, delay: 90, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onFinish());
  }, [minElapsed, ready, forceFinish, outro, progress, onFinish]);

  // La tapa gira sobre su bisagra superior (rotateX + perspective) en vez de deslizarse.
  const lidRotate = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '78deg'] });
  // La pizza ya estaba en la caja: solo se asienta al quedar descubierta.
  const pizzaSettle = open.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.94, 0.94, 1] });
  const pizzaTurn = open.interpolate({ inputRange: [0, 0.45, 1], outputRange: ['-8deg', '-8deg', '0deg'] });
  const lateReveal = open.interpolate({ inputRange: [0, 0.55, 0.9, 1], outputRange: [0, 0, 1, 1] });
  const lateRise = open.interpolate({ inputRange: [0, 0.55, 1], outputRange: [18, 18, 0] });
  const steamOpacity = steam.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.75, 0.35, 0] });
  const steamRise = steam.interpolate({ inputRange: [0, 1], outputRange: [8, -16] });
  const outroOpacity = outro.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const outroScale = reduceMotion ? 1 : outro.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View style={s.root} accessibilityLabel="Pizza Getto está cargando">
      <Animated.View style={[s.canvas, { opacity: outroOpacity, transform: [{ scale: outroScale }] }]}>
        <LinearGradient colors={['#561D1D', '#351112']} style={StyleSheet.absoluteFill} />
        {fontsReady && <Text style={s.bgWord}>FRESH</Text>}
        {fontsReady && <View style={s.topRow}><Text style={s.kicker}>BOX No. 01</Text><Text style={s.kicker}>PIZZA GETTO</Text></View>}

        <View style={{ width: boxW, height: boxH }}>
          <View style={[s.boxBase, { width: boxW, height: boxH }]}>
            <View style={s.waxPaper}>{fontsReady && [0, 1, 2, 3].map((i) => <Text key={i} style={s.waxMark}>PG</Text>)}</View>
            <Animated.View style={[s.pizzaWrap, { width: pizzaSize, height: pizzaSize, borderRadius: pizzaSize / 2, left: (boxW - pizzaSize) / 2, top: Math.round(boxH * 0.04), transform: [{ scale: pizzaSettle }, { rotate: pizzaTurn }] }]}>
              <Animated.Image source={pizza.source} resizeMode="cover" style={s.pizzaPhoto} />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(52,14,14,.34)']} locations={[0.62, 1]} style={StyleSheet.absoluteFill} />
              {fontsReady && <View style={s.namePlate}><Text style={s.pizzaName}>{pizza.name}</Text></View>}
            </Animated.View>
            {fontsReady && !reduceMotion && (
              <Animated.View style={[s.steamWrap, { opacity: lateReveal }]}>
                <Animated.Text style={[s.steamGlyph, { opacity: steamOpacity, transform: [{ translateY: steamRise }, { rotate: '-90deg' }] }]}>) ) )</Animated.Text>
              </Animated.View>
            )}
          </View>

          <Animated.View style={[s.lid, { width: boxW, height: boxH, transform: [{ perspective: 900 }, { rotateX: lidRotate }] }]}>
            <View style={s.lidBorder} />
            <Animated.Image source={require('../../../assets/brand/pizza-getto-logo.png')} resizeMode="contain" style={{ width: boxW * 0.78, height: boxH * 0.64 }} />
            {fontsReady && <Text style={s.lidMessage}>ABRE · COMPARTE · DISFRUTA</Text>}
          </Animated.View>
        </View>

        {fontsReady && (
          <Animated.View style={[s.aromaBadge, { opacity: lateReveal, transform: [{ translateY: lateRise }] }]}>
            <Ionicons name="sparkles" size={14} color="#4A1818" />
            <Text style={s.aromaText}>RECIÉN HECHA</Text>
          </Animated.View>
        )}

        <View style={s.footer}>
          {fontsReady && <Text style={s.footerText}>TU PIZZA ESTÁ SALIENDO DEL GETTO</Text>}
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { transform: [{ scaleX: progress }] }]} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 9999, backgroundColor: '#3F1516' },
  canvas: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bgWord: { position: 'absolute', fontFamily: 'BebasNeue_400Regular', fontSize: 150, color: 'rgba(255,196,0,.035)', transform: [{ rotate: '-9deg' }] },
  topRow: { position: 'absolute', top: 58, left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { fontFamily: 'Montserrat_900Black', fontSize: 10, letterSpacing: 1.4, color: '#FFC400' },
  boxBase: { backgroundColor: '#E5C99E', padding: 14, shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  waxPaper: { flex: 1, backgroundColor: '#FFF8E8', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
  waxMark: { fontFamily: 'BebasNeue_400Regular', fontSize: 38, color: 'rgba(74,24,24,.075)', transform: [{ rotate: '-22deg' }] },
  pizzaWrap: { position: 'absolute', backgroundColor: '#D58A35', borderWidth: 7, borderColor: '#E7A846', overflow: 'hidden', shadowColor: '#4A1818', shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  pizzaPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  namePlate: { position: 'absolute', left: 30, right: 30, bottom: 12, backgroundColor: 'rgba(65,18,18,.82)', paddingVertical: 5, alignItems: 'center' },
  pizzaName: { fontFamily: 'Montserrat_900Black', fontSize: 10, letterSpacing: 1.4, color: '#FFC400' },
  steamWrap: { position: 'absolute', top: -20, left: 0, right: 0, alignItems: 'center' },
  steamGlyph: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, letterSpacing: 6, color: 'rgba(255,255,255,.75)' },
  lid: { position: 'absolute', top: 0, left: 0, backgroundColor: '#FFC400', alignItems: 'center', justifyContent: 'center', transformOrigin: 'top', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  lidBorder: { ...StyleSheet.absoluteFillObject, margin: 10, borderWidth: 3, borderColor: '#4A1818' },
  lidMessage: { position: 'absolute', bottom: 14, fontFamily: 'Montserrat_900Black', fontSize: 10, letterSpacing: 1.25, color: '#4A1818' },
  aromaBadge: { position: 'absolute', right: 20, bottom: 108, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFC400', paddingHorizontal: 11, paddingVertical: 8 },
  aromaText: { fontFamily: 'Montserrat_900Black', fontSize: 10, letterSpacing: 1, color: '#4A1818' },
  footer: { position: 'absolute', left: 22, right: 22, bottom: 44 },
  footerText: { fontFamily: 'Montserrat_700Bold', fontSize: 10, letterSpacing: 1.2, color: '#FFF8E8', marginBottom: 9 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,196,0,.22)', overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: '#FFC400', transformOrigin: 'left' },
});

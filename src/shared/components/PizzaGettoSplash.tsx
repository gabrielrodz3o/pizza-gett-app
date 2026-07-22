import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Montserrat_700Bold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { colors } from '@/shared/theme';

const splashPizzas = [
  { name: 'TRIPLERONI', source: require('../../../assets/pizzas/splash/tripleroni.jpg') },
  { name: 'GETTONA', source: require('../../../assets/pizzas/splash/gettona.jpg') },
  { name: 'VEGETARIANA', source: require('../../../assets/pizzas/splash/vegetariana.jpg') },
  { name: 'SUPER MEATS', source: require('../../../assets/pizzas/splash/super-meats.jpg') },
  { name: 'MEXICANA', source: require('../../../assets/pizzas/splash/mexicana.jpg') },
] as const;

function useLoop() {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 2200, easing: Easing.bezier(.2,.75,.25,1), useNativeDriver: true }),
      Animated.delay(380),
      Animated.timing(motion, { toValue: 0, duration: 360, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.delay(120),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion]);
  return motion;
}

function NeonConcept() {
  const m = useLoop();
  const paperY=m.interpolate({inputRange:[0,.18,.64,1],outputRange:[250,250,0,0]});
  const ink=m.interpolate({inputRange:[0,.45,.72,1],outputRange:[0,0,1,1]});
  const roller=m.interpolate({inputRange:[0,.2,.68,1],outputRange:[-190,-190,190,190]});
  return <View style={[s.canvas,{backgroundColor:'#F5E8D2'}]}>
    <LinearGradient colors={['#FFF9E9','#F0DEC1']} style={StyleSheet.absoluteFill}/>
    <View style={s.printGrid}/><Text style={s.printEdition}>PIZZA GETTO® · BRAND PRESS</Text>
    <Animated.View style={[s.posterSheet,{transform:[{translateY:paperY},{rotate:'-2deg'}]}]}>
      <View style={s.posterBorder}/><Animated.Image source={require('../../../assets/brand/pizza-getto-logo.png')} resizeMode="contain" style={[s.posterLogo,{opacity:ink}]}/>
      <Text style={s.posterTag}>HECHA AL MOMENTO</Text><Text style={s.posterCode}>SANTO DOMINGO · 001</Text>
      <Animated.View style={[s.inkRoller,{transform:[{translateX:roller}]}]}/>
    </Animated.View>
    <Animated.View style={[s.approvedStamp,{opacity:ink,transform:[{scale:ink},{rotate:'-11deg'}]}]}><Text style={s.approvedTop}>AUTÉNTICA</Text><Text style={s.approvedMain}>GETTO</Text><Text style={s.approvedTop}>CALIDAD APROBADA</Text></Animated.View>
    <Text style={s.printCaption}>IMPRIMIENDO NUESTRA IDENTIDAD</Text>
  </View>;
}

function EditorialConcept() {
  const m = useLoop();
  const pizza = useRef(splashPizzas[Math.floor(Math.random() * splashPizzas.length)]).current;
  const lidY=m.interpolate({inputRange:[0,.22,.67,1],outputRange:[0,0,-205,-205]});
  const lidRotate=m.interpolate({inputRange:[0,.2,.7,1],outputRange:['0deg','0deg','-7deg','-7deg']});
  const reveal=m.interpolate({inputRange:[0,.42,.72,1],outputRange:[0,0,1,1]});
  const pizzaTurn=m.interpolate({inputRange:[0,.42,.78,1],outputRange:['-24deg','-24deg','4deg','0deg']});
  return <View style={[s.canvas,{backgroundColor:'#3F1516'}]}>
    <LinearGradient colors={['#561D1D','#351112']} style={StyleSheet.absoluteFill}/>
    <Text style={s.boxSceneBg}>FRESH</Text><View style={s.boxSceneTop}><Text style={s.boxSceneKicker}>BOX No. 01</Text><Text style={s.boxSceneKicker}>PIZZA GETTO</Text></View>
    <View style={s.premiumBox}><View style={s.waxPaper}>{[0,1,2,3].map(i=><Text key={i} style={s.waxMark}>PG</Text>)}</View>
      <Animated.View style={[s.revealPizza,{opacity:reveal,transform:[{scale:reveal},{rotate:pizzaTurn}]}]}>
        <Animated.Image source={pizza.source} resizeMode="cover" style={s.realPizzaPhoto}/>
        <LinearGradient colors={['rgba(0,0,0,0)','rgba(52,14,14,.34)']} locations={[.62,1]} style={StyleSheet.absoluteFill}/>
        <View style={s.pizzaNamePlate}><Text style={s.pizzaName}>{pizza.name}</Text></View>
      </Animated.View>
      <Animated.View style={[s.pizzaSteam,{opacity:reveal,transform:[{translateY:reveal.interpolate({inputRange:[0,1],outputRange:[18,-8]})}]}]}><Text style={s.steamGlyph}>〰 〰 〰</Text></Animated.View>
    </View>
    <Animated.View style={[s.premiumLid,{transform:[{translateY:lidY},{rotate:lidRotate}]}]}><View style={s.lidDoubleBorder}/><Animated.Image source={require('../../../assets/brand/pizza-getto-logo.png')} resizeMode="contain" style={s.lidLogo}/><Text style={s.lidMessage}>ABRE · COMPARTE · DISFRUTA</Text></Animated.View>
    <Animated.View style={[s.aromaBadge,{opacity:reveal,transform:[{translateY:reveal.interpolate({inputRange:[0,1],outputRange:[25,0]})}]}]}><Ionicons name="sparkles" size={14} color="#4A1818"/><Text style={s.aromaText}>RECIÉN HECHA</Text></Animated.View>
    <Text style={s.boxSceneFooter}>TU PIZZA ESTÁ SALIENDO DEL GETTO</Text>
  </View>;
}

function StreetConcept() {
  const m=useLoop();
  const logoScale=m.interpolate({inputRange:[0,.18,.55,1],outputRange:[.18,.18,1.08,1]});
  const logoRotate=m.interpolate({inputRange:[0,.2,.62,1],outputRange:['-12deg','-12deg','2deg','0deg']});
  const curtain=m.interpolate({inputRange:[0,.36,.72,1],outputRange:[1,1,.12,.12]});
  const dash=m.interpolate({inputRange:[0,.75,1],outputRange:[-180,160,160]});
  return <View style={[s.canvas,{backgroundColor:'#481818'}]}>
    <LinearGradient colors={['#5A1D1D','#421515','#2D0E10']} style={StyleSheet.absoluteFill}/>
    <View style={s.streetPattern}>{[0,1,2,3,4,5].map(i=><Text key={i} style={s.patternWord}>GETTO</Text>)}</View>
    <View style={s.brandFrame}/>
    {[0,1,2,3,4,5,6,7].map(i=><Animated.View key={i} style={[s.brandParticle,{left:28+(i*43)%320,top:68+(i*67)%340,opacity:m,transform:[{translateY:m.interpolate({inputRange:[0,1],outputRange:[35-i*3,-18-i*5]})},{rotate:`${i*27}deg`}]}]}/>)}
    <Animated.View style={[s.yellowSlash,s.yellowSlashLeft,{transform:[{translateX:dash},{rotate:'-18deg'}]}]}/>
    <Animated.View style={[s.yellowSlash,s.yellowSlashRight,{transform:[{translateX:Animated.multiply(dash,-1)},{rotate:'-18deg'}]}]}/>
    <Animated.View style={[s.realLogoWrap,{opacity:m,transform:[{scale:logoScale},{rotate:logoRotate}]}]}>
      <View style={s.logoShadow}/>
      <Animated.Image source={require('../../../assets/brand/pizza-getto-logo.png')} resizeMode="contain" style={s.realLogo}/>
      <Animated.View style={[s.logoShine,{opacity:m.interpolate({inputRange:[0,.55,.72,1],outputRange:[0,0,.8,0]}),transform:[{translateX:m.interpolate({inputRange:[0,1],outputRange:[-170,190]})},{rotate:'18deg'}]}]}/>
    </Animated.View>
    <Animated.View style={[s.brandPulse,{opacity:m.interpolate({inputRange:[0,.5,.72,1],outputRange:[0,0,.55,0]}),transform:[{scale:m.interpolate({inputRange:[0,.55,1],outputRange:[.65,.65,1.45]})}]}]}/>
    <View style={s.streetTop}><Text style={s.streetKicker}>ORIGINAL DESDE EL BARRIO</Text><Text style={s.streetNumber}>EST. 2026</Text></View>
    <View style={s.streetBottom}><Text style={s.streetBottomMain}>CALIENTE · RÁPIDA · GETTO</Text><View style={s.streetBottomLine}><Animated.View style={[s.streetProgress,{transform:[{scaleX:m}]}]}/></View><Text style={s.streetBottomTiny}>PREPARANDO TU EXPERIENCIA</Text></View>
    <Animated.View style={[s.redCurtain,{transform:[{scaleX:curtain}]}]}><Text style={s.curtainType}>PIZZA GETTO</Text></Animated.View>
  </View>;
}

export function PizzaGettoSplash({onFinish}:{onFinish:()=>void}) {
  useFonts({ BebasNeue_400Regular, Montserrat_700Bold, Montserrat_900Black });
  useEffect(() => {
    const finishTimer = setTimeout(onFinish, 3200);
    return () => clearTimeout(finishTimer);
  }, [onFinish]);

  // StreetConcept (versión C) se conserva arriba como alternativa futura.
  return <View style={s.root} accessibilityLabel="Pizza Getto está cargando">
    <EditorialConcept/>
  </View>;
}

const s=StyleSheet.create({
  root:{...StyleSheet.absoluteFillObject,zIndex:9999,backgroundColor:'#3F1516'},canvas:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  labBar:{position:'absolute',left:0,right:0,bottom:0,height:166,backgroundColor:'#111114',paddingHorizontal:18,paddingTop:15},labHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},labEyebrow:{fontSize:8,fontWeight:'900',letterSpacing:2.2,color:'#E4362B'},labTitle:{fontSize:17,fontWeight:'800',color:'#FFF',marginTop:2},close:{width:32,height:32,borderRadius:16,backgroundColor:'#29292E',alignItems:'center',justifyContent:'center'},options:{flexDirection:'row',gap:8,marginTop:12},option:{flex:1,height:48,borderRadius:8,borderWidth:1,borderColor:'#323238',paddingHorizontal:9,justifyContent:'center'},optionOn:{backgroundColor:'#FFF',borderColor:'#FFF'},optionLetter:{fontSize:9,fontWeight:'900',color:'#E4362B'},optionLetterOn:{color:'#E4362B'},optionName:{fontSize:11,fontWeight:'700',color:'#AAAAB0',marginTop:2},optionNameOn:{color:'#151518'},labHint:{fontSize:9,color:'#77777E',textAlign:'center',marginTop:9},
  neonGrid:{position:'absolute',bottom:0,width:'150%',height:180,borderTopWidth:1,borderColor:'rgba(237,42,255,.18)',backgroundColor:'rgba(36,19,51,.35)',transform:[{perspective:280},{rotateX:'58deg'}]},neonGlow:{position:'absolute',width:250,height:250,borderRadius:125,backgroundColor:'rgba(238,31,255,.12)'},neonSign:{position:'absolute',top:70,alignItems:'center'},neonPizza:{fontSize:15,fontWeight:'900',letterSpacing:9,color:'#36F4FF',textShadowColor:'#36F4FF',textShadowRadius:12},neonGetto:{fontSize:44,fontWeight:'900',fontStyle:'italic',letterSpacing:-2,color:'#FF35E5',textShadowColor:'#FF35E5',textShadowRadius:18},boxBase:{position:'absolute',bottom:70,width:156,height:92,backgroundColor:'#261A2D',borderWidth:2,borderColor:'#FF35E5',transform:[{rotateZ:'-3deg'}]},boxInside:{...StyleSheet.absoluteFillObject,margin:8,backgroundColor:'#120E17'},boxLid:{position:'absolute',bottom:158,width:156,height:92,backgroundColor:'#17111D',borderWidth:2,borderColor:'#36F4FF',alignItems:'center',justifyContent:'center',transformOrigin:'bottom'},boxMark:{fontSize:31,fontWeight:'900',color:'#FF35E5',textShadowColor:'#FF35E5',textShadowRadius:10},boxPizza:{position:'absolute',bottom:76,width:92,height:92,borderRadius:46,backgroundColor:'#FFD45C',borderWidth:7,borderColor:'#D88B36'},miniPep:{position:'absolute',left:38,top:38,width:14,height:14,borderRadius:7,backgroundColor:'#D92F3A'},neonCaption:{position:'absolute',bottom:36,fontSize:9,fontWeight:'800',letterSpacing:3,color:'#36F4FF'},
  printGrid:{...StyleSheet.absoluteFillObject,opacity:.18,borderWidth:1,borderColor:'#B99871'},printEdition:{position:'absolute',top:31,left:21,fontFamily:'Montserrat_900Black',fontSize:8,letterSpacing:1.5,color:'#6C3A2D'},posterSheet:{width:278,height:355,backgroundColor:'#FFF9E9',padding:18,shadowColor:'#4A1818',shadowOpacity:.2,shadowRadius:20,shadowOffset:{width:0,height:15}},posterBorder:{...StyleSheet.absoluteFillObject,margin:11,borderWidth:2,borderColor:'#4A1818'},posterLogo:{width:242,height:190,marginTop:28},posterTag:{fontFamily:'BebasNeue_400Regular',fontSize:27,letterSpacing:4,color:'#4A1818',textAlign:'center'},posterCode:{fontFamily:'Montserrat_700Bold',fontSize:7,letterSpacing:1.3,color:'#B57823',textAlign:'center',marginTop:18},inkRoller:{position:'absolute',top:0,bottom:0,width:48,backgroundColor:'rgba(74,24,24,.12)'},approvedStamp:{position:'absolute',right:17,bottom:48,width:108,height:108,borderRadius:54,borderWidth:4,borderColor:'#D6342A',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,249,233,.9)'},approvedTop:{fontFamily:'Montserrat_900Black',fontSize:6,letterSpacing:1,color:'#D6342A'},approvedMain:{fontFamily:'BebasNeue_400Regular',fontSize:29,color:'#D6342A'},printCaption:{position:'absolute',bottom:24,fontFamily:'Montserrat_900Black',fontSize:8,letterSpacing:1.8,color:'#4A1818'},
  boxSceneBg:{position:'absolute',fontFamily:'BebasNeue_400Regular',fontSize:150,color:'rgba(255,196,0,.035)',transform:[{rotate:'-9deg'}]},boxSceneTop:{position:'absolute',top:30,left:22,right:22,flexDirection:'row',justifyContent:'space-between'},boxSceneKicker:{fontFamily:'Montserrat_900Black',fontSize:8,letterSpacing:1.4,color:'#FFC400'},premiumBox:{position:'absolute',top:'45%',width:280,height:245,backgroundColor:'#E5C99E',padding:14,shadowColor:'#000',shadowOpacity:.32,shadowRadius:24,shadowOffset:{width:0,height:18}},waxPaper:{flex:1,backgroundColor:'#FFF8E8',flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-around',overflow:'hidden'},waxMark:{fontFamily:'BebasNeue_400Regular',fontSize:38,color:'rgba(74,24,24,.075)',transform:[{rotate:'-22deg'}]},revealPizza:{position:'absolute',left:35,top:9,width:210,height:210,borderRadius:105,backgroundColor:'#D58A35',borderWidth:7,borderColor:'#E7A846',overflow:'hidden',shadowColor:'#4A1818',shadowOpacity:.32,shadowRadius:12,shadowOffset:{width:0,height:8}},realPizzaPhoto:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},pizzaNamePlate:{position:'absolute',left:34,right:34,bottom:13,backgroundColor:'rgba(65,18,18,.82)',paddingVertical:5,alignItems:'center'},pizzaName:{fontFamily:'Montserrat_900Black',fontSize:7,letterSpacing:1.4,color:'#FFC400'},pizzaSteam:{position:'absolute',top:-16,left:65,right:65,alignItems:'center'},steamGlyph:{fontFamily:'BebasNeue_400Regular',fontSize:27,letterSpacing:5,color:'rgba(255,255,255,.76)'},premiumLid:{position:'absolute',top:'45%',width:280,height:245,backgroundColor:'#FFC400',alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.3,shadowRadius:18,shadowOffset:{width:0,height:12}},lidDoubleBorder:{...StyleSheet.absoluteFillObject,margin:10,borderWidth:3,borderColor:'#4A1818'},lidLogo:{width:218,height:158},lidMessage:{position:'absolute',bottom:16,fontFamily:'Montserrat_900Black',fontSize:7,letterSpacing:1.25,color:'#4A1818'},aromaBadge:{position:'absolute',right:17,bottom:42,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#FFC400',paddingHorizontal:11,paddingVertical:8},aromaText:{fontFamily:'Montserrat_900Black',fontSize:7,letterSpacing:1,color:'#4A1818'},boxSceneFooter:{position:'absolute',left:22,bottom:31,fontFamily:'Montserrat_700Bold',fontSize:8,letterSpacing:1.2,color:'#FFF8E8'},
  edition:{position:'absolute',top:35,left:24,fontSize:9,fontWeight:'900',letterSpacing:2,color:'#7A6255'},editorialRule:{position:'absolute',top:57,left:24,right:24,height:1,backgroundColor:'#BCA99A'},editorialPizza:{position:'absolute',right:-35,top:76,width:205,height:205,borderRadius:103,backgroundColor:'#D48935',padding:11,shadowColor:'#58311F',shadowOpacity:.22,shadowRadius:22,shadowOffset:{width:-8,height:14}},editorialCheese:{flex:1,borderRadius:92},edPep:{position:'absolute',left:95,top:95,width:27,height:27,borderRadius:14,backgroundColor:'#C92D2B',borderWidth:3,borderColor:'#A82020'},edBasil:{position:'absolute',left:90,top:67,width:26,height:14,borderTopLeftRadius:20,borderBottomRightRadius:20,backgroundColor:'#3D7839',transform:[{rotate:'-30deg'}]},editorialTitle:{position:'absolute',left:22,bottom:92,alignItems:'flex-start'},editorialSmall:{fontSize:7,fontWeight:'900',letterSpacing:1.5,color:'#8B7060'},editorialMain:{fontSize:54,lineHeight:55,fontWeight:'300',letterSpacing:-3,color:'#2E1815'},editorialAccent:{fontSize:54,lineHeight:51,fontWeight:'900',letterSpacing:-3,color:'#D9362D'},editorialFooter:{position:'absolute',left:24,right:24,bottom:30,borderTopWidth:1,borderColor:'#BCA99A',paddingTop:10,flexDirection:'row',justifyContent:'space-between'},editorialFooterText:{fontSize:7,fontWeight:'800',letterSpacing:1.2,color:'#755E52'},editorialNo:{fontSize:9,fontWeight:'900',color:'#D9362D'},
  streetPattern:{position:'absolute',top:45,left:-25,right:-25,opacity:.055,transform:[{rotate:'-13deg'}]},patternWord:{fontFamily:'BebasNeue_400Regular',fontSize:72,lineHeight:66,letterSpacing:9,color:'#FFF'},brandFrame:{position:'absolute',width:328,height:286,borderWidth:1,borderColor:'rgba(255,192,0,.23)'},brandParticle:{position:'absolute',width:7,height:18,backgroundColor:'#FFC400'},brandPulse:{position:'absolute',width:265,height:265,borderRadius:133,borderWidth:3,borderColor:'#FFC400'},yellowSlash:{position:'absolute',width:240,height:18,backgroundColor:'#FFC400'},yellowSlashLeft:{top:130,left:-170},yellowSlashRight:{bottom:145,right:-170},realLogoWrap:{width:310,height:226,alignItems:'center',justifyContent:'center',overflow:'hidden'},realLogo:{width:310,height:226},logoShadow:{position:'absolute',bottom:10,width:245,height:30,borderRadius:100,backgroundColor:'rgba(0,0,0,.28)',transform:[{scaleX:1.12}]},logoShine:{position:'absolute',top:-35,width:38,height:310,backgroundColor:'rgba(255,255,255,.32)'},redCurtain:{...StyleSheet.absoluteFillObject,backgroundColor:'#FFC400',alignItems:'center',justifyContent:'center',transformOrigin:'right'},curtainType:{fontFamily:'BebasNeue_400Regular',fontSize:49,letterSpacing:5,color:'#4B1818'},streetBottom:{position:'absolute',left:22,right:22,bottom:30},streetBottomMain:{fontFamily:'Montserrat_900Black',fontSize:9,letterSpacing:1.6,color:'#FFC400'},streetBottomLine:{height:2,backgroundColor:'rgba(255,196,0,.25)',marginVertical:8},streetProgress:{width:'100%',height:2,backgroundColor:'#FFC400',transformOrigin:'left'},streetBottomTiny:{fontFamily:'Montserrat_700Bold',fontSize:7,letterSpacing:1.8,color:'#F5E6D2'},
  streetBg:{position:'absolute',fontSize:112,fontWeight:'900',fontStyle:'italic',color:'rgba(255,255,255,.055)',transform:[{rotate:'-12deg'}]},streetTop:{position:'absolute',top:34,left:22,right:22,flexDirection:'row',justifyContent:'space-between'},streetKicker:{fontSize:9,fontWeight:'900',letterSpacing:2,color:'#FFF'},streetNumber:{fontSize:12,fontWeight:'900',color:'#FFD34E'},routeLine:{position:'absolute',left:38,right:38,top:'43%',height:3,backgroundColor:'#FFD34E',transformOrigin:'left'},routeDot:{position:'absolute',top:'41.6%',width:14,height:14,borderRadius:7,borderWidth:3,borderColor:'#FFD34E',backgroundColor:'#D72625'},bike:{position:'absolute',top:'34%',width:130,height:86},bikeBox:{position:'absolute',right:10,top:0,width:58,height:47,backgroundColor:'#FFD34E',borderWidth:3,borderColor:'#321416',alignItems:'center',justifyContent:'center'},bikeBoxText:{fontSize:20,fontWeight:'900',color:'#321416'},bikeBody:{position:'absolute',left:28,right:13,bottom:20,height:23,borderRadius:6,backgroundColor:'#FFF'},wheel:{position:'absolute',bottom:5,width:28,height:28,borderRadius:14,borderWidth:6,borderColor:'#2A1515',backgroundColor:'#F7E4D4'},bikeFlash:{position:'absolute',left:3,top:20},streetLockup:{position:'absolute',left:22,bottom:42},streetPizza:{fontSize:20,fontWeight:'900',letterSpacing:8,color:'#FFD34E'},streetGetto:{fontSize:51,lineHeight:53,fontWeight:'900',fontStyle:'italic',letterSpacing:-3,color:'#FFF'},streetTag:{fontSize:8,fontWeight:'900',letterSpacing:1.5,color:'#FFD9D3'},speedLines:{position:'absolute',right:0,bottom:35,gap:7},speedLine:{height:3,backgroundColor:'#FFD34E',alignSelf:'flex-end'},
});

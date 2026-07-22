import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, font, shadow } from '@/shared/theme';
import { Campaign } from '@/shared/types';

export function OfferCarousel({ campaigns, onSelect }: { campaigns: Campaign[]; onSelect: (campaign: Campaign) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(280, width - 36);
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => { if (campaigns.length < 2 || interacting) return; const timer = setInterval(() => setIndex(current => { const next = (current + 1) % campaigns.length; ref.current?.scrollTo({ x: next * (cardWidth + 12), animated: true }); return next; }), 5000); return () => clearInterval(timer); }, [campaigns.length, cardWidth, interacting]);
  useEffect(() => { if (index >= campaigns.length) setIndex(0); }, [campaigns.length, index]);
  return <View style={s.carouselWrap}><ScrollView ref={ref} horizontal snapToInterval={cardWidth + 12} decelerationRate="fast" disableIntervalMomentum showsHorizontalScrollIndicator={false} contentContainerStyle={s.campaigns} onScrollBeginDrag={() => setInteracting(true)} onScrollEndDrag={() => setInteracting(false)} onMomentumScrollEnd={event => { setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12))); setInteracting(false); }}>
    {campaigns.map(campaign => <Pressable key={campaign.id} accessibilityRole="button" accessibilityLabel={`${campaign.name}. Ver productos`} onPress={() => onSelect(campaign)} style={[s.campaignCard, { width: cardWidth }]}>
      <ExpoImage source={{ uri: campaign.bannerUrl }} transition={250} accessibilityLabel={campaign.altText} style={s.campaignImage} /><LinearGradient colors={['rgba(30,8,8,.08)', 'rgba(30,8,8,.92)']} style={s.campaignShade}><View style={s.campaignBadge}><Ionicons name="pricetag" size={12} color="white" /><Text style={s.campaignBadgeText}>{campaign.type === 'DISCOUNT_PERCENTAGE' ? `${campaign.discountPercentage}% DE DESCUENTO` : 'OFERTA ESPECIAL'}</Text></View><View style={s.campaignBottom}><Text style={s.campaignTitle} numberOfLines={2}>{campaign.name}</Text><Text style={s.campaignDescription} numberOfLines={1}>{campaign.description || `${campaign.itemIds.length} productos seleccionados`}</Text><View style={s.campaignCta}><Text style={s.campaignCtaText}>Ver productos</Text><Ionicons name="arrow-forward" size={15} color={colors.brown} /></View></View></LinearGradient>
    </Pressable>)}
  </ScrollView>{campaigns.length > 1 && <View style={s.carouselDots}>{campaigns.map((campaign, dot) => <Pressable key={campaign.id} accessibilityLabel={`Ir a oferta ${dot + 1}`} onPress={() => { setIndex(dot); ref.current?.scrollTo({ x: dot * (cardWidth + 12), animated: true }); }} style={[s.carouselDot, dot === index && s.carouselDotActive]} />)}</View>}</View>;
}

const s = StyleSheet.create({
  carouselWrap: { marginBottom: 14 },
  campaigns: { gap: 12 },
  campaignCard: { height: 210, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.brown, ...shadow },
  campaignImage: { width: '100%', height: '100%' },
  campaignShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: 18, justifyContent: 'space-between' },
  campaignBadge: { alignSelf: 'flex-start', backgroundColor: colors.red, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  campaignBadgeText: { fontSize: 10, fontFamily: font.black, letterSpacing: 0.5, color: 'white' },
  campaignBottom: { alignItems: 'flex-start' },
  campaignTitle: { fontSize: 28, lineHeight: 30, fontFamily: font.display, letterSpacing: 0.4, color: 'white', maxWidth: 275 },
  campaignDescription: { fontSize: 11, color: '#F3E6E2', marginTop: 4 },
  campaignCta: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.yellow, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  campaignCtaText: { fontSize: 12, fontFamily: font.black, color: colors.brown },
  carouselDots: { height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  carouselDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D7C9C2' },
  carouselDotActive: { width: 22, backgroundColor: colors.brown },
});

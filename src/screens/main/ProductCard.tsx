import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShop } from '@/features/cart/store';
import { toast } from '@/shared/components/Toast';
import { haptics } from '@/shared/haptics';
import { colors, font, shadow } from '@/shared/theme';
import { Product } from '@/shared/types';
import { money, promotionLabel } from './helpers';

export function ProductCard({
  product,
  onOpen,
  featured = false,
}: {
  product: Product;
  onOpen: (p: Product) => void;
  featured?: boolean;
}) {
  const shop = useShop();
  const fav = shop.favorites.includes(product.id);
  const heartBeat = useRef(new Animated.Value(1)).current;
  const toggleFav = () => {
    haptics.tap();
    heartBeat.setValue(1);
    Animated.sequence([
      Animated.timing(heartBeat, { toValue: 1.35, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(heartBeat, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 14 }),
    ]).start();
    shop.toggleFavorite(product.id);
  };
  return (
    <Pressable
      style={({ pressed }) => [s.productCard, featured && s.featuredProductCard, product.promotion && s.promotedCard, pressed && s.cardPressed]}
      onPress={() => onOpen(product)}
    >
      {product.image ? (
        <ExpoImage source={{ uri: product.image }} transition={220} style={[s.productImage, featured && s.featuredProductImage]} />
      ) : (
        <View style={[s.productImage, featured && s.featuredProductImage, s.imagePlaceholder]}>
          <Ionicons name="pizza-outline" size={38} color={colors.brown} />
        </View>
      )}
      {product.promotion && (
        <View style={s.promoBadge}>
          <Ionicons name="pricetag" size={12} color="white" />
          <Text style={s.promoBadgeText}>{promotionLabel(product)}</Text>
        </View>
      )}
      <Pressable
        style={s.heart}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={fav ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
        onPress={toggleFav}
      >
        <Animated.View style={{ transform: [{ scale: heartBeat }] }}>
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            color={fav ? colors.red : colors.brown}
            size={19}
          />
        </Animated.View>
      </Pressable>
      <View style={s.productBody}>
        <Text style={s.productName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={s.productDesc} numberOfLines={2}>
          {product.description || product.category}
        </Text>
        <View style={s.priceRow}>
          <View>
            {product.promotion &&
            product.promotion.type !== 'BUY_X_GET_Y' &&
            product.originalPrice > product.price ? (
              <Text style={s.originalPrice}>
                {money(product.originalPrice)}
              </Text>
            ) : null}
            <Text style={[s.price, product.promotion && s.promoPrice]}>
              {money(product.price)}
            </Text>
          </View>
          <Pressable
            style={s.add}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${product.name} al carrito`}
            onPress={() => {
              if (product.itemTypeId === 3 || product.sidesCategories?.length) { onOpen(product); return; }
              haptics.press();
              shop.add(product);
              toast(`${product.name} agregado al carrito`);
            }}
          >
            <Ionicons name="add" size={23} color={colors.brown} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  productCard: { width: '48%', backgroundColor: 'white', borderRadius: 19, overflow: 'hidden', ...shadow },
  featuredProductCard: { width: '100%' },
  promotedCard: { borderWidth: 1.5, borderColor: colors.red },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
  productImage: { width: '100%', height: 125, backgroundColor: colors.yellowSoft },
  featuredProductImage: { height: 210 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  promoBadge: { position: 'absolute', left: 8, top: 8, zIndex: 2, minHeight: 27, borderRadius: 10, backgroundColor: colors.red, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  promoBadgeText: { fontSize: 10, fontFamily: font.black, color: 'white' },
  heart: { position: 'absolute', right: 9, top: 9, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' },
  productBody: { padding: 12 },
  productName: { fontSize: 15, fontFamily: font.black, color: colors.text },
  productDesc: { fontSize: 11, lineHeight: 15, color: colors.muted, marginTop: 4, minHeight: 30 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  originalPrice: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontFamily: font.black, color: colors.brown },
  promoPrice: { color: colors.red },
  add: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
});

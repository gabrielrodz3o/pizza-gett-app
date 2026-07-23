import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DeliveryAddress } from '@/features/customer/api';
import { EmptyState } from '@/shared/components/EmptyState';
import { colors, font, shadow } from '@/shared/theme';
import { Branch, Campaign, Product } from '@/shared/types';
import { OfferCarousel } from './OfferCarousel';
import { ProductCard } from './ProductCard';
import { SkeletonCards } from './SkeletonCards';

type MenuAvailability = { hasConfiguredMenu?: boolean; scheduleLabel?: string } | null | undefined;

export function CatalogSection({
  tab,
  branch,
  serviceMode,
  selectedAddress,
  campaigns,
  campaignItemIds,
  selectedCampaign,
  lastUpdated,
  search,
  category,
  categories,
  products,
  loading,
  error,
  menuAvailability,
  onRefresh,
  onRetry,
  onOpenContext,
  onSelectCampaign,
  onClearCampaign,
  onPickCategory,
  onSearch,
  onSeeAll,
  onOpenProduct,
}: {
  tab: 'home' | 'menu';
  branch: Branch;
  serviceMode: 'delivery' | 'pickup';
  selectedAddress?: DeliveryAddress;
  campaigns: Campaign[];
  campaignItemIds: number[] | null;
  selectedCampaign?: Campaign;
  lastUpdated: Date;
  search: string;
  category: string;
  categories: string[];
  products: Product[];
  loading: boolean;
  error: boolean;
  menuAvailability: MenuAvailability;
  onRefresh: () => void;
  onRetry: () => void;
  onOpenContext: () => void;
  onSelectCampaign: (campaign: Campaign) => void;
  onClearCampaign: () => void;
  onPickCategory: (category: string) => void;
  onSearch: (value: string) => void;
  onSeeAll: () => void;
  onOpenProduct: (product: Product) => void;
}) {
  const shown = products;
  const isBrowsingCatalog = Boolean(campaignItemIds) || category !== 'Todos' || search.trim().length > 0;
  const visibleProducts = tab === 'home' && !isBrowsingCatalog
    ? (shown.some((product) => product.popular)
        ? shown.filter((product) => product.popular)
        : shown
      ).slice(0, 4)
    : shown;
  return (
    <>
      {tab === 'home' && campaigns.length > 0 && <OfferCarousel campaigns={campaigns} onSelect={onSelectCampaign} />}
      {tab === 'home' && campaigns.length === 0 && (
        <View style={s.greeting}>
          <Text style={s.title}>¡Hola! 👋</Text>
          <Text style={s.subtitle}>¿Qué te gustaría ordenar hoy?</Text>
          <Pressable onPress={onOpenContext} style={s.contextCard}>
            <View style={s.contextIcon}><Ionicons name={serviceMode === 'delivery' ? 'location' : 'storefront'} size={21} color={colors.brown} /></View>
            <View style={{ flex: 1 }}><Text style={s.contextTitle}>{serviceMode === 'delivery' ? selectedAddress?.street : branch.name}</Text><Text style={s.contextSub}>{serviceMode === 'delivery' ? `${selectedAddress?.detected_zone_name || 'Zona validada'} · Atiende ${branch.name.replace('Pizza Getto • ', '')}` : `${branch.address} · ${branch.eta}`}</Text></View>
            <Ionicons name="swap-horizontal" size={20} color={colors.orange} />
          </Pressable>
        </View>
      )}
      {tab === 'home' && campaigns.length === 0 && (
        <LinearGradient colors={[colors.brownDark, colors.brown]} style={s.hero}>
          <View style={{ flex: 1 }}><Text style={s.heroKicker}>HECHO PARA COMPARTIR</Text><Text style={s.heroTitle}>Tu pizza favorita, más cerca.</Text><Text style={s.heroPrice}>{branch.eta}</Text><Pressable onPress={onSeeAll} style={s.heroButton}><Text style={s.heroButtonText}>Ver el menú</Text></Pressable></View><Text style={s.pizzaEmoji}>🍕</Text>
        </LinearGradient>
      )}
      <View style={[s.availabilityBanner, branch.open ? s.availabilityOpen : s.availabilityClosed]}>
        <Ionicons name={branch.open ? 'checkmark-circle' : 'time'} size={18} color={branch.open ? colors.green : colors.red} />
        <View style={{ flex: 1 }}><Text style={s.availabilityTitle}>{branch.open ? `${serviceMode === 'delivery' ? 'Delivery' : 'Recogida'} disponible` : 'Sucursal cerrada'}</Text><Text style={s.availabilityText}>{branch.eta} · Actualizado {lastUpdated.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' })}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Actualizar disponibilidad" onPress={onRefresh} hitSlop={10}><Ionicons name="refresh" size={19} color={colors.brown} /></Pressable>
      </View>
      {campaignItemIds && <View style={s.offerContext}><View style={s.offerContextIcon}><Ionicons name="pricetag" size={20} color="white" /></View><View style={{ flex: 1 }}><Text style={s.offerContextKicker}>OFERTA SELECCIONADA</Text><Text style={s.offerContextTitle}>{selectedCampaign?.name || 'Productos en promoción'}</Text><Text style={s.offerContextSub}>{shown.length} {shown.length === 1 ? 'producto disponible' : 'productos disponibles'} · Precios vigentes</Text></View><Pressable accessibilityLabel="Cerrar oferta" onPress={onClearCampaign} style={s.offerClose}><Ionicons name="close" size={19} color={colors.brown} /></Pressable></View>}
      {!campaignItemIds && <><View style={s.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Buscar pizzas, combos o bebidas"
          placeholderTextColor="#A99C98"
          style={s.searchInput}
          accessibilityLabel="Buscar productos"
        />
        {search.length > 0 && <Pressable accessibilityLabel="Limpiar búsqueda" onPress={() => onSearch('')} hitSlop={10}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable>}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {categories.map((x) => (
          <Pressable
            key={x}
            onPress={() => onPickCategory(x)}
            style={[s.chip, category === x && s.chipActive]}
          >
            <Text
              style={[s.chipText, category === x && s.chipTextActive]}
            >
              {x}
            </Text>
          </Pressable>
        ))}
      </ScrollView></>}
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>
          {campaignItemIds ? (shown.length === 1 ? 'Tu producto en oferta' : 'Productos de esta oferta') : category === 'Favoritos'
            ? 'Tus favoritos'
            : category !== 'Todos'
              ? category
              : search.trim()
                ? 'Resultados de búsqueda'
            : tab === 'home'
              ? 'Los más pedidos'
              : 'Nuestro menú'}
        </Text>
        {tab === 'home' && !isBrowsingCatalog && (
          <Pressable onPress={onSeeAll}>
            <Text style={s.link}>Ver todo</Text>
          </Pressable>
        )}
      </View>
      {loading && <SkeletonCards />}
      {error ? (
        <View style={s.dataState}>
          <Ionicons
            name="cloud-offline-outline"
            size={35}
            color={colors.red}
          />
          <Text style={s.emptyTitle}>No pudimos cargar el menú</Text>
          <Text style={s.emptyBody}>
            Verifica que ComandPOS esté ejecutándose y vuelve a intentar.
          </Text>
          <Pressable
            style={s.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text style={s.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : !loading && shown.length === 0 ? (
        <EmptyState
          icon={
            category === 'Favoritos' ? 'heart-outline' : 'restaurant-outline'
          }
          title={
            category === 'Favoritos'
              ? 'Todavía no hay favoritos'
              : search.trim()
                ? `No encontramos “${search.trim()}”`
                : category !== 'Todos'
                  ? `No hay productos en ${category}`
                  : branch.open
                    ? menuAvailability?.hasConfiguredMenu ? 'El menú está cerrado ahora' : 'Esta sucursal no tiene un menú configurado'
                    : 'La sucursal está cerrada'
          }
          body={category === 'Favoritos' ? 'Toca el corazón de un producto para guardarlo aquí.' : search.trim() ? 'Prueba con otra palabra o limpia la búsqueda.' : branch.open ? menuAvailability?.hasConfiguredMenu ? `Horario del menú: ${menuAvailability.scheduleLabel || 'consulta más tarde'}. Desliza hacia abajo para actualizar.` : 'Configura y activa un menú para esta sucursal en ComandPOS.' : `Horario: ${branch.scheduleLabel || 'consulta más tarde'}.`}
        />
      ) : (
        <View style={s.grid}>
          {visibleProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              featured={Boolean(campaignItemIds && shown.length === 1)}
              onOpen={onOpenProduct}
            />
          ))}
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  greeting: { marginBottom: 16 },
  title: { fontSize: 32, fontFamily: font.display, letterSpacing: 0.4, color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 3 },
  contextCard: { marginTop: 16, backgroundColor: 'white', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.border, ...shadow },
  contextIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  contextTitle: { fontSize: 13, fontFamily: font.black, color: colors.text },
  contextSub: { fontSize: 10, lineHeight: 15, color: colors.muted, marginTop: 3 },
  hero: { height: 190, borderRadius: 24, padding: 22, flexDirection: 'row', overflow: 'hidden', ...shadow },
  heroKicker: { fontSize: 10, fontFamily: font.black, letterSpacing: 1.4, color: colors.yellow },
  heroTitle: { fontSize: 30, lineHeight: 32, fontFamily: font.display, letterSpacing: 0.4, color: 'white', marginTop: 7, maxWidth: 220 },
  heroPrice: { fontSize: 13, fontFamily: font.bold, color: '#E7D2CD', marginTop: 7 },
  heroButton: { marginTop: 14, backgroundColor: colors.yellow, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 15, alignSelf: 'flex-start' },
  heroButtonText: { fontFamily: font.black, color: colors.brown },
  pizzaEmoji: { fontSize: 83, position: 'absolute', right: -8, bottom: 1, transform: [{ rotate: '-12deg' }] },
  availabilityBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, padding: 12, marginBottom: 2, borderWidth: 1 },
  availabilityOpen: { backgroundColor: '#EDF9F1', borderColor: '#C9EBD5' },
  availabilityClosed: { backgroundColor: '#FFF1F1', borderColor: '#F3CCCC' },
  availabilityTitle: { fontSize: 12, fontFamily: font.black, color: colors.text },
  availabilityText: { fontSize: 10, color: colors.muted, marginTop: 2 },
  offerContext: { backgroundColor: colors.brown, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  offerContextIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  offerContextKicker: { fontSize: 10, fontFamily: font.black, letterSpacing: 1.1, color: colors.yellow },
  offerContextTitle: { fontSize: 17, fontFamily: font.black, color: 'white', marginTop: 2 },
  offerContextSub: { fontSize: 10, color: '#E7D2CD', marginTop: 3 },
  offerClose: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  search: { height: 52, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10, marginTop: 18 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  chips: { gap: 9, paddingVertical: 16 },
  chip: { height: 38, borderRadius: 19, paddingHorizontal: 17, justifyContent: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brown, borderColor: colors.brown },
  chipText: { fontSize: 13, fontFamily: font.bold, color: colors.muted },
  chipTextActive: { color: 'white' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 24, fontFamily: font.display, letterSpacing: 0.4, color: colors.text },
  link: { fontSize: 13, fontFamily: font.extraBold, color: colors.orange },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dataState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontFamily: font.black, color: colors.text, marginTop: 15, textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center', marginTop: 7 },
  retryButton: { marginTop: 16, backgroundColor: colors.yellow, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 11 },
  retryText: { fontSize: 13, fontFamily: font.black, color: colors.brown },
});

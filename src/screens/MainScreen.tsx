import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getMenu, sendOrder } from "@/features/catalog/api";
import { ComboBuilder } from "@/features/catalog/components/ComboBuilder";
import { ProductCustomizer } from "@/features/catalog/components/ProductCustomizer";
import { useShop } from "@/features/cart/store";
import { AuthDialog } from "@/features/auth/components/AuthDialog";
import { useCustomerAuth } from "@/features/auth/store";
import { DeliveryAddress, getOrderDetail, redeemLoyaltyReward } from "@/features/customer/api";
import { AddressesModal } from "@/features/customer/components/AddressesModal";
import { colors, shadow } from "@/shared/theme";
import { Branch, Product } from "@/shared/types";
import { OrdersTracking as OrdersTrackingFeature } from "@/features/orders/components/OrdersTracking";
import { ProfileContent } from "@/features/customer/components/ProfileContent";
import { usePendingOrderRecovery } from '@/features/orders/usePendingOrderRecovery';
import { useMobileExperienceData } from '@/features/catalog/useMobileExperienceData';

const money = (n: number) => `RD$${n.toLocaleString("es-DO")}`;
const promotionLabel = (product: Product) => {
  const promotion = product.promotion;
  if (!promotion) return "";
  if (promotion.type === "DISCOUNT_PERCENTAGE")
    return `-${promotion.discountPercentage ?? 0}%`;
  if (promotion.type === "DISCOUNT_FIXED")
    return `AHORRA ${money(promotion.discountAmount ?? 0)}`;
  if (promotion.type === "BUY_X_GET_Y")
    return `${promotion.requiredQuantity ?? 2}+${promotion.rewardQuantity ?? 1} GRATIS`;
  return "OFERTA";
};
const tabs = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "menu", label: "Menú", icon: "restaurant" },
  { id: "orders", label: "Pedidos", icon: "receipt" },
  { id: "rewards", label: "Puntos", icon: "gift" },
  { id: "profile", label: "Perfil", icon: "person" },
] as const;

export default function App() {
  const shop = useShop();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("home");
  const [category, setCategory] = useState("Todos");
  const [campaignItemIds, setCampaignItemIds] = useState<number[] | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const customerAuth = useCustomerAuth();
  const recoverOrder=useCallback((order:any)=>{shop.clear();setCartOpen(false);setConfirmedOrder(order);void customerQueryRef.current?.();},[shop]);
  const customerQueryRef=useRef<null|(()=>void)>(null);
  usePendingOrderRecovery(recoverOrder);
  useEffect(() => {
    customerAuth.restore();
    AsyncStorage.getItem('pizza-getto-last-tab').then((value) => { if (tabs.some((item) => item.id === value)) setTab(value as (typeof tabs)[number]['id']); }).catch(() => undefined);
  }, []);
  const selectTab = (next: (typeof tabs)[number]['id']) => {
    setTab(next);
    if (next !== 'menu') { setCategory('Todos'); setCampaignItemIds(null); setSearch(''); }
    requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ y: 0, animated: false }));
    void AsyncStorage.setItem('pizza-getto-last-tab', next);
  };
  const {customerQuery,configQuery,menuQuery:query,branches:availableBranches,branch}=useMobileExperienceData(shop.branchId,tab);
  customerQueryRef.current=()=>{void customerQuery.refetch();};
  const loyaltyProgram = configQuery.data?.loyalty ?? null;
  const visibleTabs = loyaltyProgram ? tabs : tabs.filter((item) => item.id !== 'rewards');
  useEffect(() => { if (!loyaltyProgram && tab === 'rewards' && !configQuery.isLoading) selectTab('home'); }, [loyaltyProgram,tab,configQuery.isLoading]);
  const campaigns = (configQuery.data?.campaigns ?? []).filter((campaign) => !campaign.locationId || campaign.locationId === branch?.id);
  const addresses: DeliveryAddress[] = customerQuery.data?.addresses ?? [];
  const selectedAddress = addresses.find((x) => x.id === shop.selectedAddressId);
  const products = query.data?.products ?? [];
  const menuAvailability = query.data?.availability;
  const categories = ["Todos", "Ofertas", "Favoritos", ...new Set(products.map((x) => x.category))];
  const filtered = products.filter(
    (x) =>
      (category === "Todos" || (category === 'Ofertas' ? (campaignItemIds ? campaignItemIds.includes(x.id) : Boolean(x.promotion)) : category === 'Favoritos' ? shop.favorites.includes(x.id) : x.category === category)) &&
      `${x.name} ${x.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const comboGroups = new Set(
    shop.cart.flatMap((x) => (x.comboGroupId ? [x.comboGroupId] : [])),
  );
  const count =
    shop.cart
      .filter((x) => !x.comboGroupId)
      .reduce((n, x) => n + x.quantity, 0) + comboGroups.size;
  const subtotal = shop.cart.reduce((n, x) => n + x.unitTotal * x.quantity, 0);
  const shown = filtered;
  const refreshing = query.isRefetching || configQuery.isRefetching || customerQuery.isRefetching;
  const refreshAll = async () => {
    await Promise.all([configQuery.refetch(), branch ? query.refetch() : Promise.resolve(), customerAuth.session ? customerQuery.refetch() : Promise.resolve()]);
    setLastUpdated(new Date());
  };
  const reorder = async (order: any) => {
    const target = availableBranches.find((item) => item.id === Number(order.location_id));
    if (!target) return Alert.alert('Sucursal no disponible', 'La sucursal de este pedido ya no está disponible.');
    try {
      const [detail, menu] = await Promise.all([getOrderDetail(Number(order.account_id)), getMenu(target)]);
      const previous = (detail?.orders ?? []).flatMap((item: any) => item.order_details ?? []);
      const byId = new Map(menu.products.map((product) => [product.id, product]));
      const available = previous.filter((item: any) => byId.has(Number(item.item_id)));
      if (!available.length) return Alert.alert('Pedido no disponible', 'Ninguno de los productos de ese pedido está disponible actualmente.');
      shop.clear();
      const deliveryAddress = addresses.find((address) => Number(address.effective_location_id) === target.id);
      if (order.is_delivery && deliveryAddress) shop.chooseService('delivery', target.id, deliveryAddress.id);
      else shop.chooseService('pickup', target.id);
      available.forEach((item: any) => shop.add(byId.get(Number(item.item_id))!, { quantity: Math.max(1, Number(item.quantity) || 1) }));
      const missing = previous.length - available.length;
      setCartOpen(true);
      if (missing > 0) Alert.alert('Carrito actualizado', `${missing} producto${missing === 1 ? '' : 's'} ya no estaba disponible y no fue agregado.`);
    } catch (error: any) { Alert.alert('No pudimos repetirlo', error?.response?.data?.message || 'Actualiza e intenta nuevamente.'); }
  };

  const openContext = () => {
    if (shop.cart.length) {
      Alert.alert("Cambiar entrega", "Al cambiar de dirección o sucursal limpiaremos el carrito para evitar productos o precios incorrectos.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar", style: "destructive", onPress: () => { shop.clear(); setContextOpen(true); } },
      ]);
      return;
    }
    setContextOpen(true);
  };

  const deliveryContextMissing = shop.serviceMode === "delivery" && (
    !customerAuth.session || (!customerQuery.isLoading && !selectedAddress)
  );
  if (!branch || !shop.serviceMode || deliveryContextMissing || contextOpen)
    return (
      <>
      <ServiceSelect
        branches={availableBranches}
        addresses={addresses}
        authenticated={!!customerAuth.session}
        loading={configQuery.isLoading}
        error={
          configQuery.isError
            ? "No pudimos conectar con el servidor local."
            : undefined
        }
        onRetry={() => configQuery.refetch()}
        onLogin={() => setAuthOpen(true)}
        onBrowseAsGuest={() => {
          const guestBranch = availableBranches.find((item) => item.pickup && item.open)
            ?? availableBranches.find((item) => item.pickup)
            ?? availableBranches[0];
          if (guestBranch) {
            shop.chooseService("pickup", guestBranch.id);
            setContextOpen(false);
          }
        }}
        onManageAddresses={() => setAddressesOpen(true)}
        onChoosePickup={(id) => { shop.chooseService("pickup", id); setContextOpen(false); }}
        onChooseDelivery={(address) => {
          if (!address.effective_location_id) return Alert.alert("Dirección sin cobertura", "Edita esta dirección y confirma el punto en el mapa.");
          if (address.delivery_open_now === false) return Alert.alert("Delivery cerrado", `Esta zona no está recibiendo pedidos ahora. Horario: ${address.delivery_schedule_label || "consulta el horario del local"}.`);
          shop.chooseService("delivery", Number(address.effective_location_id), address.id);
          setContextOpen(false);
        }}
      />
      <AuthDialog visible={authOpen} onClose={() => setAuthOpen(false)} />
      <AddressesModal visible={addressesOpen} onClose={() => { setAddressesOpen(false); customerQuery.refetch(); }} />
      </>
    );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>{shop.serviceMode === "delivery" ? "DELIVERY A" : "RECOGER EN"}</Text>
          <Pressable onPress={openContext} style={s.branchRow}>
            <Text style={s.branchName}>
              {shop.serviceMode === "delivery" ? (selectedAddress?.label || selectedAddress?.street || "Tu dirección") : branch.name.replace("Pizza Getto • ", "")}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.yellow} />
          </Pressable>
        </View>
        <Pressable style={s.cartButton} onPress={() => setCartOpen(true)}>
          <Ionicons name="bag-handle" size={21} color={colors.brown} />
          {count > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{count}</Text>
            </View>
          )}
        </Pressable>
      </View>
      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.yellow} colors={[colors.yellow]} />}
      >
        {tab === "home" && campaigns.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={s.campaigns}>
            {campaigns.map((campaign) => <Pressable key={campaign.id} accessibilityRole="button" accessibilityLabel={`${campaign.name}. ${campaign.ctaLabel}`} onPress={() => { selectTab('menu'); setCampaignItemIds(campaign.itemIds); setCategory('Ofertas'); }} style={s.campaignCard}>
              <Image source={{ uri: campaign.bannerUrl }} accessibilityLabel={campaign.altText} style={s.campaignImage} />
              <LinearGradient colors={['rgba(30,8,8,.08)','rgba(30,8,8,.92)']} style={s.campaignShade}>
                <View style={s.campaignBadge}><Ionicons name="pricetag" size={12} color="white"/><Text style={s.campaignBadgeText}>{campaign.type === 'DISCOUNT_PERCENTAGE' ? `${campaign.discountPercentage}% DE DESCUENTO` : 'OFERTA ESPECIAL'}</Text></View>
                <View style={s.campaignBottom}><Text style={s.campaignTitle} numberOfLines={2}>{campaign.name}</Text><Text style={s.campaignDescription} numberOfLines={1}>{campaign.description || `${campaign.itemIds.length} productos seleccionados`}</Text>
                <View style={s.campaignCta}><Text style={s.campaignCtaText}>Ver productos</Text><Ionicons name="arrow-forward" size={15} color={colors.brown} /></View></View>
              </LinearGradient>
            </Pressable>)}
          </ScrollView>
        )}
        {tab === "home" && campaigns.length === 0 && (
          <View style={s.greeting}>
            <Text style={s.title}>¡Hola! 👋</Text>
            <Text style={s.subtitle}>¿Qué te gustaría ordenar hoy?</Text>
            <Pressable onPress={openContext} style={s.contextCard}>
              <View style={s.contextIcon}><Ionicons name={shop.serviceMode === "delivery" ? "location" : "storefront"} size={21} color={colors.brown} /></View>
              <View style={{ flex: 1 }}><Text style={s.contextTitle}>{shop.serviceMode === "delivery" ? selectedAddress?.street : branch.name}</Text><Text style={s.contextSub}>{shop.serviceMode === "delivery" ? `${selectedAddress?.detected_zone_name || "Zona validada"} · Atiende ${branch.name.replace("Pizza Getto • ", "")}` : `${branch.address} · ${branch.eta}`}</Text></View>
              <Ionicons name="swap-horizontal" size={20} color={colors.orange} />
            </Pressable>
          </View>
        )}
        {tab === "home" && campaigns.length === 0 && (
          <LinearGradient colors={[colors.brownDark, colors.brown]} style={s.hero}>
            <View style={{ flex: 1 }}><Text style={s.heroKicker}>HECHO PARA COMPARTIR</Text><Text style={s.heroTitle}>Tu pizza favorita, más cerca.</Text><Text style={s.heroPrice}>{branch.eta}</Text><Pressable onPress={() => selectTab("menu")} style={s.heroButton}><Text style={s.heroButtonText}>Ver el menú</Text></Pressable></View><Text style={s.pizzaEmoji}>🍕</Text>
          </LinearGradient>
        )}
        {(tab === "home" || tab === "menu") && (
          <>
            <View style={[s.availabilityBanner, branch.open ? s.availabilityOpen : s.availabilityClosed]}>
              <Ionicons name={branch.open ? "checkmark-circle" : "time"} size={18} color={branch.open ? colors.green : colors.red} />
              <View style={{ flex: 1 }}><Text style={s.availabilityTitle}>{branch.open ? `${shop.serviceMode === 'delivery' ? 'Delivery' : 'Recogida'} disponible` : 'Sucursal cerrada'}</Text><Text style={s.availabilityText}>{branch.eta} · Actualizado {lastUpdated.toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' })}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Actualizar disponibilidad" onPress={refreshAll} hitSlop={10}><Ionicons name="refresh" size={19} color={colors.brown} /></Pressable>
            </View>
            <View style={s.search}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar pizzas, combos o bebidas"
                placeholderTextColor="#A99C98"
                style={s.searchInput}
                accessibilityLabel="Buscar productos"
              />
              {search.length > 0 && <Pressable accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')} hitSlop={10}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable>}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chips}
            >
              {categories.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => { setCampaignItemIds(null); setCategory(x); }}
                  style={[s.chip, category === x && s.chipActive]}
                >
                  <Text
                    style={[s.chipText, category === x && s.chipTextActive]}
                  >
                    {x}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>
                {category === "Favoritos"
                  ? "Tus favoritos"
                  : tab === "home"
                    ? "Los más pedidos"
                    : "Nuestro menú"}
              </Text>
              {tab === "home" && (
                <Pressable onPress={() => selectTab("menu")}>
                  <Text style={s.link}>Ver todo</Text>
                </Pressable>
              )}
            </View>
            {query.isLoading && <SkeletonCards />}
            {query.isError ? (
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
                  onPress={() => query.refetch()}
                  accessibilityRole="button"
                >
                  <Text style={s.retryText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : !query.isLoading && shown.length === 0 ? (
              <Empty
                icon={
                  category === "Favoritos" ? "heart-outline" : "restaurant-outline"
                }
                title={
                  category === "Favoritos"
                    ? "Todavía no hay favoritos"
                    : search.trim()
                      ? `No encontramos “${search.trim()}”`
                      : category !== 'Todos'
                        ? `No hay productos en ${category}`
                        : branch.open
                          ? menuAvailability?.hasConfiguredMenu ? "El menú está cerrado ahora" : "Esta sucursal no tiene un menú configurado"
                          : "La sucursal está cerrada"
                }
                body={category === 'Favoritos' ? 'Toca el corazón de un producto para guardarlo aquí.' : search.trim() ? 'Prueba con otra palabra o limpia la búsqueda.' : branch.open ? menuAvailability?.hasConfiguredMenu ? `Horario del menú: ${menuAvailability.scheduleLabel || 'consulta más tarde'}. Desliza hacia abajo para actualizar.` : 'Configura y activa un menú para esta sucursal en ComandPOS.' : `Horario: ${branch.scheduleLabel || 'consulta más tarde'}.`}
              />
            ) : (
              <View style={s.grid}>
                {(tab === "home"
                  ? (shown.filter((x) => x.popular).length
                      ? shown.filter((x) => x.popular)
                      : shown
                    ).slice(0, 4)
                  : shown
                ).map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onOpen={(product) =>
                      product.itemTypeId === 3
                        ? setSelectedCombo(product)
                        : setSelected(product)
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
        {tab === "orders" && (
          <OrdersTrackingFeature
            session={!!customerAuth.session}
            loading={customerQuery.isLoading}
            orders={customerQuery.data?.orders ?? []}
            onLogin={() => setAuthOpen(true)}
            onRetry={() => customerQuery.refetch()}
            onReorder={reorder}
          />
        )}
        {tab === "rewards" && loyaltyProgram && <RewardsPanel session={!!customerAuth.session} loyalty={customerQuery.data?.loyalty} program={loyaltyProgram} onLogin={() => setAuthOpen(true)} onChanged={() => customerQuery.refetch()} />}
        {tab === "profile" && (
          <ProfileContent
            branchName={branch.name}
            supportPhone={branch.phone}
            onLogin={() => setAuthOpen(true)}
            onChangeContext={openContext}
          />
        )}
      </ScrollView>
      {count > 0 && !cartOpen && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir carrito con ${count} productos, total ${money(subtotal)}`} onPress={() => setCartOpen(true)} style={s.floatingCart}>
          <View style={s.floatingCartCount}><Text style={s.floatingCartCountText}>{count}</Text></View>
          <Text style={s.floatingCartText}>Ver carrito</Text><Text style={s.floatingCartTotal}>{money(subtotal)}</Text>
        </Pressable>
      )}
      <View style={s.nav}>
        {visibleTabs.map((x) => (
          <Pressable key={x.id} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }} accessibilityLabel={x.label} onPress={() => selectTab(x.id)} style={s.navItem}>
            <Ionicons
              name={(tab === x.id ? x.icon : `${x.icon}-outline`) as any}
              size={22}
              color={tab === x.id ? colors.yellow : "#A49390"}
            />
            <Text style={[s.navLabel, tab === x.id && s.navActive]}>
              {x.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <ProductCustomizer product={selected} onClose={() => setSelected(null)} />
      <ComboBuilder
        combo={selectedCombo}
        branch={branch}
        onClose={() => setSelectedCombo(null)}
        onFallback={(product) =>
          product.sidesCategories?.length
            ? setSelected(product)
            : shop.add(product)
        }
      />
      <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <Cart
          subtotal={subtotal}
          branch={branch}
          customer={customerQuery.data}
          initialMode={shop.serviceMode}
          initialAddressId={shop.selectedAddressId ?? undefined}
          onLogin={() => setAuthOpen(true)}
          onClose={() => setCartOpen(false)}
          onSent={(result) => {
            shop.clear();
            setCartOpen(false);
            setConfirmedOrder({ ...result?.data, branchName: branch.name, mode: shop.serviceMode });
            customerQuery.refetch();
          }}
        />
      </Modal>
      <AuthDialog visible={authOpen} onClose={() => setAuthOpen(false)} />
      <OrderConfirmation visible={!!confirmedOrder} order={confirmedOrder} onHome={() => { setConfirmedOrder(null); selectTab('home'); }} onTrack={() => { setConfirmedOrder(null); selectTab('orders'); }} />
    </SafeAreaView>
  );
}

function BranchSelect({
  branches: items,
  loading,
  error,
  onRetry,
  onChoose,
}: {
  branches: Branch[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onChoose: (id: number) => void;
}) {
  return (
    <LinearGradient
      colors={[colors.brownDark, colors.brown]}
      style={s.branchScreen}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.branchContent}>
          <View style={s.logo}>
            <Text style={s.logoPizza}>🍕</Text>
          </View>
          <Text style={s.brand}>PIZZA GETTO</Text>
          <Text style={s.branchTitle}>Elige tu sucursal</Text>
          <Text style={s.branchSubtitle}>
            {loading
              ? "Buscando sucursales disponibles…"
              : (error ??
                "Te mostraremos el menú disponible para tu sucursal.")}
          </Text>
          {loading && (
            <ActivityIndicator
              color={colors.yellow}
              style={{ marginBottom: 20 }}
            />
          )}
          {error && (
            <Pressable style={s.retryButtonLight} onPress={onRetry}>
              <Text style={s.retryText}>Reintentar conexión</Text>
            </Pressable>
          )}
          {!loading &&
            !error &&
            items.map((b) => (
              <Pressable
                key={b.id}
                style={s.branchCard}
                onPress={() => onChoose(b.id)}
              >
                <View style={s.storeIcon}>
                  <Ionicons name="storefront" size={22} color={colors.brown} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.branchCardName}>{b.name}</Text>
                  <Text style={s.branchAddress}>{b.address}</Text>
                  <Text style={s.openText}>● Disponible · {b.eta}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.brown}
                />
              </Pressable>
            ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ServiceSelect({ branches, addresses, authenticated, loading, error, onRetry, onLogin, onBrowseAsGuest, onManageAddresses, onChoosePickup, onChooseDelivery }: {
  branches: Branch[]; addresses: DeliveryAddress[]; authenticated: boolean; loading: boolean; error?: string;
  onRetry: () => void; onLogin: () => void; onBrowseAsGuest: () => void; onManageAddresses: () => void;
  onChoosePickup: (id: number) => void; onChooseDelivery: (address: DeliveryAddress) => void;
}) {
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  return <SafeAreaView style={s.serviceSafe} edges={['top','bottom']}><ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.serviceScroll}>
    <LinearGradient colors={['#3B1611','#6E2E24']} style={s.serviceHero}>
      <View style={s.serviceBrandRow}><View style={s.serviceMark}><Ionicons name="pizza" size={24} color={colors.brown}/></View><Text style={s.serviceBrand}>PIZZA GETTO</Text><View style={s.serviceFresh}><View style={s.serviceFreshDot}/><Text style={s.serviceFreshText}>HECHO AL MOMENTO</Text></View></View>
      <Text style={s.serviceEyebrow}>EMPECEMOS TU ORDEN</Text><Text style={s.serviceTitle}>¿Cómo quieres{`\n`}tu pizza?</Text><Text style={s.serviceSubtitle}>Elige una opción. Te mostraremos precios, menú y disponibilidad correctos.</Text>
      <View style={s.servicePizzaArt}><View style={s.servicePizzaInner}><Ionicons name="pizza" size={68} color={colors.yellow}/></View></View>
    </LinearGradient>
    <View style={s.serviceBody}>
      <View style={s.serviceModes}>
        <Pressable accessibilityRole="tab" accessibilityState={{selected:mode==='delivery'}} onPress={()=>setMode('delivery')} style={[s.serviceMode,mode==='delivery'&&s.serviceModeActive]}><View style={[s.serviceModeIcon,mode==='delivery'&&s.serviceModeIconActive]}><Ionicons name="bicycle" size={23} color={mode==='delivery'?'white':colors.brown}/></View><View style={{flex:1}}><Text style={[s.serviceModeTitle,mode==='delivery'&&s.serviceModeTitleActive]}>Delivery</Text><Text style={s.serviceModeSub}>Lo llevamos a ti</Text></View>{mode==='delivery'&&<Ionicons name="checkmark-circle" size={21} color={colors.brown}/>}</Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{selected:mode==='pickup'}} onPress={()=>setMode('pickup')} style={[s.serviceMode,mode==='pickup'&&s.serviceModeActive]}><View style={[s.serviceModeIcon,mode==='pickup'&&s.serviceModeIconActive]}><Ionicons name="bag-handle" size={22} color={mode==='pickup'?'white':colors.brown}/></View><View style={{flex:1}}><Text style={[s.serviceModeTitle,mode==='pickup'&&s.serviceModeTitleActive]}>Recoger</Text><Text style={s.serviceModeSub}>En tu sucursal</Text></View>{mode==='pickup'&&<Ionicons name="checkmark-circle" size={21} color={colors.brown}/>}</Pressable>
      </View>
      {loading&&<View style={s.serviceLoading}><ActivityIndicator color={colors.brown}/><Text style={s.serviceLoadingText}>Buscando opciones disponibles…</Text></View>}
      {error&&<View style={s.serviceError}><Ionicons name="cloud-offline-outline" size={28} color={colors.red}/><Text style={s.setupTitle}>No pudimos conectar</Text><Text style={s.setupBody}>{error}</Text><Pressable style={s.servicePrimary} onPress={onRetry}><Text style={s.servicePrimaryText}>Intentar de nuevo</Text></Pressable></View>}
      {!loading&&!error&&mode==='delivery'&&(!authenticated?<View style={s.servicePanel}><View style={s.servicePanelIcon}><Ionicons name="location" size={26} color={colors.brown}/></View><Text style={s.servicePanelKicker}>DELIVERY PERSONALIZADO</Text><Text style={s.servicePanelTitle}>¿Dónde llevamos tu pizza?</Text><Text style={s.servicePanelCopy}>Inicia sesión para recuperar tus direcciones y confirmar cobertura automáticamente.</Text><Pressable onPress={onLogin} style={s.servicePrimary}><Text style={s.servicePrimaryText}>Continuar con mi dirección</Text><Ionicons name="arrow-forward" size={18} color="white"/></Pressable><Pressable onPress={onBrowseAsGuest} style={s.serviceGuest}><Text style={s.serviceGuestText}>Explorar el menú como invitado</Text></Pressable><View style={s.serviceTrust}><Ionicons name="shield-checkmark" size={16} color={colors.green}/><Text style={s.serviceTrustText}>Solo usamos tu ubicación para validar cobertura</Text></View></View>:<View><View style={s.serviceSectionHead}><View><Text style={s.serviceSectionKicker}>TUS DIRECCIONES</Text><Text style={s.serviceSectionTitle}>Elige dónde recibir</Text></View><Pressable onPress={onManageAddresses}><Text style={s.serviceEdit}>Administrar</Text></Pressable></View>{addresses.map(address=>{const available=Boolean(address.effective_location_id)&&address.delivery_open_now!==false;return <Pressable key={address.id} onPress={()=>onChooseDelivery(address)} style={[s.serviceOption,!available&&s.serviceOptionDisabled]}><View style={s.serviceOptionIcon}><Ionicons name={address.label==='Casa'?'home':'location'} size={21} color={colors.brown}/></View><View style={{flex:1}}><View style={s.serviceOptionTitleRow}><Text style={s.serviceOptionTitle}>{address.label}</Text>{address.is_default&&<View style={s.serviceDefault}><Text style={s.serviceDefaultText}>PRINCIPAL</Text></View>}</View><Text numberOfLines={2} style={s.serviceOptionAddress}>{address.street}</Text><View style={s.serviceStatusRow}><View style={[s.serviceStatusDot,{backgroundColor:available?colors.green:colors.red}]}/><Text style={[s.serviceStatusText,{color:available?colors.green:colors.red}]}>{!address.effective_location_id?'Ubicación por confirmar':address.delivery_open_now===false?`Cerrado · ${address.delivery_schedule_label||'Ver horario'}`:`Disponible · ${address.delivery_schedule_label||'Ahora'}`}</Text></View></View><Ionicons name="chevron-forward" size={20} color={colors.muted}/></Pressable>})}<Pressable onPress={onManageAddresses} style={s.serviceAdd}><View style={s.serviceAddIcon}><Ionicons name="add" size={22} color={colors.brown}/></View><View style={{flex:1}}><Text style={s.serviceAddTitle}>Agregar otra dirección</Text><Text style={s.serviceAddSub}>Ubícala con precisión en el mapa</Text></View><Ionicons name="map-outline" size={21} color={colors.brown}/></Pressable></View>)}
      {!loading&&!error&&mode==='pickup'&&<View><View style={s.serviceSectionHead}><View><Text style={s.serviceSectionKicker}>SUCURSALES</Text><Text style={s.serviceSectionTitle}>Recoge cerca de ti</Text></View><Text style={s.serviceCount}>{branches.filter(x=>x.pickup&&x.open).length} abiertas</Text></View>{branches.filter(item=>item.pickup).map(item=><Pressable key={item.id} style={[s.serviceOption,!item.open&&s.serviceOptionDisabled]} onPress={()=>item.open?onChoosePickup(item.id):Alert.alert('Sucursal cerrada',`Horario: ${item.scheduleLabel||'no disponible'}`)}><View style={s.serviceOptionIcon}><Ionicons name="storefront" size={21} color={colors.brown}/></View><View style={{flex:1}}><Text style={s.serviceOptionTitle}>{item.name.replace('Pizza Getto • ','')}</Text><Text numberOfLines={2} style={s.serviceOptionAddress}>{item.address}</Text><View style={s.serviceStatusRow}><View style={[s.serviceStatusDot,{backgroundColor:item.open?colors.green:colors.red}]}/><Text style={[s.serviceStatusText,{color:item.open?colors.green:colors.red}]}>{item.eta}</Text></View></View><Ionicons name="chevron-forward" size={20} color={colors.muted}/></Pressable>)}</View>}
      <View style={s.serviceFooter}><Ionicons name="lock-closed" size={13} color={colors.muted}/><Text style={s.serviceFooterText}>Puedes cambiar esta opción antes de confirmar tu pedido</Text></View>
    </View>
  </ScrollView></SafeAreaView>;
}

function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (p: Product) => void;
}) {
  const shop = useShop();
  const fav = shop.favorites.includes(product.id);
  return (
    <Pressable
      style={[s.productCard, product.promotion && s.promotedCard]}
      onPress={() => onOpen(product)}
    >
      {product.image ? (
        <Image source={{ uri: product.image }} style={s.productImage} />
      ) : (
        <View style={[s.productImage, s.imagePlaceholder]}>
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
        onPress={() => shop.toggleFavorite(product.id)}
      >
        <Ionicons
          name={fav ? "heart" : "heart-outline"}
          color={fav ? colors.red : colors.brown}
          size={19}
        />
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
            product.promotion.type !== "BUY_X_GET_Y" &&
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
            onPress={() =>
              product.itemTypeId === 3 || product.sidesCategories?.length
                ? onOpen(product)
                : shop.add(product)
            }
          >
            <Ionicons name="add" size={23} color={colors.brown} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function Cart({
  subtotal,
  branch,
  customer,
  initialMode,
  initialAddressId,
  onLogin,
  onClose,
  onSent,
}: {
  subtotal: number;
  branch: Branch;
  customer?: any;
  initialMode: 'delivery' | 'pickup';
  initialAddressId?: string;
  onLogin: () => void;
  onClose: () => void;
  onSent: (result: any) => void;
}) {
  const shop = useShop();
  const auth = useCustomerAuth();
  const deliveryType = initialMode;
  const [addressId, setAddressId] = useState<string | undefined>(
    initialAddressId ?? customer?.addresses?.[0]?.id,
  );
  const [addressText, setAddressText] = useState(
    customer?.addresses?.[0]?.street ?? "",
  );
  const [paymentMethodId, setPaymentMethodId] = useState(branch.paymentMethods?.[0]?.id ?? 1);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const addresses = customer?.addresses ?? [];
  useEffect(() => {
    if (!addressId && addresses[0]?.id) {
      setAddressId(addresses[0].id);
      setAddressText(addresses[0].street ?? "");
    }
  }, [customer, addressId]);
  const selectedAddress = addresses.find((x: any) => x.id === addressId);
  const delivery = deliveryType === "delivery" ? Number(selectedAddress?.detected_zone_price ?? 0) : 0;
  const total = subtotal + delivery;
  const scheduleOptions = useMemo(() => {
    const option = (label: string, date: Date | null) => ({ label, value: date?.toISOString() ?? null });
    const plusHour = new Date(Date.now() + 60 * 60_000);
    const tomorrowNoon = new Date(); tomorrowNoon.setDate(tomorrowNoon.getDate() + 1); tomorrowNoon.setHours(12, 0, 0, 0);
    const tomorrowEvening = new Date(tomorrowNoon); tomorrowEvening.setHours(18, 0, 0, 0);
    return [option('Lo antes posible', null), option(`Hoy · ${plusHour.toLocaleTimeString('es-DO',{hour:'numeric',minute:'2-digit'})}`, plusHour), option('Mañana · 12:00 PM', tomorrowNoon), option('Mañana · 6:00 PM', tomorrowEvening)];
  }, []);
  useEffect(() => {
    if (selectedAddress?.street) setAddressText(selectedAddress.street);
  }, [selectedAddress?.id]);
  const submit = async () => {
    if (!auth.session) {
      onLogin();
      return;
    }
    if (deliveryType === "delivery" && !addressId) {
      Alert.alert(
        "Dirección requerida",
        "Selecciona una dirección validada en el mapa.",
      );
      return;
    }
    if (deliveryType === "delivery" && Number(selectedAddress?.effective_location_id) !== branch.id) {
      Alert.alert("Sucursal incorrecta", "Esta dirección pertenece a otra sucursal. Regresa al inicio y vuelve a elegirla.");
      return;
    }
    setSending(true);
    try {
      const result = await sendOrder(branch, {
        customer: {
          name: auth.session.profile.name,
          phone: auth.session.profile.phone ?? "",
        },
        deliveryType,
        addressId,
        address: addressText.trim(),
        scheduledFor,
        paymentMethodId,
        lines: shop.cart,
      });
      onSent(result);
    } catch (error: any) {
      if(error?.code==='ORDER_CONFIRMATION_UNKNOWN'){
        Alert.alert('Estamos verificando tu pedido','La conexión se interrumpió. No vuelvas a enviarlo: lo confirmaremos automáticamente cuando regrese internet.');
        return;
      }
      Alert.alert(
        "No se pudo enviar",
        error?.response?.data?.message ??
          error?.message ??
          "Verifica la conexión e intenta nuevamente.",
      );
    } finally {
      setSending(false);
    }
  };
  const visible = shop.cart.filter(
    (line, index, all) =>
      !line.comboGroupId ||
      all.findIndex((x) => x.comboGroupId === line.comboGroupId) === index,
  );
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  return (
    <View style={[s.cartScreen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <View style={s.cartHeader}>
        <Pressable onPress={onClose} style={s.cartBack}>
          <Ionicons name="arrow-back" size={22} color={colors.brown} />
        </Pressable>
        <View style={{flex:1}}><Text style={s.cartKicker}>TU ORDEN</Text><Text style={s.cartTitle}>{step===1?'Revisa tu carrito':step===2?'Entrega y horario':'Confirma tu pedido'}</Text></View>
        <View style={s.cartItemCount}><Text style={s.cartItemCountText}>{shop.cart.reduce((sum,line)=>sum+line.quantity,0)}</Text></View>
      </View>
      <ScrollView contentContainerStyle={s.cartContent}>
        {shop.cart.length === 0 ? (
          <Empty icon="bag-outline" title="Tu carrito está vacío" />
        ) : (
          <>
            <View style={s.checkoutSteps}>{['Carrito','Entrega','Confirmar'].map((label, index) => { const number = index + 1; return <View key={label} style={s.checkoutStep}><View style={[s.checkoutStepLine,index===0&&{opacity:0},number<=step&&s.checkoutStepLineActive]}/><View style={[s.checkoutStepDot, number <= step && s.checkoutStepDotActive]}><Text style={[s.checkoutStepNumber, number <= step && s.checkoutStepNumberActive]}>{number < step ? '✓' : number}</Text></View><Text style={[s.checkoutStepLabel, number === step && s.checkoutStepLabelActive]}>{label}</Text></View>; })}</View>
            {step === 1 && <>
            {visible.map((x) => {
              const components = x.comboGroupId
                ? shop.cart.filter(
                    (line) => line.comboGroupId === x.comboGroupId,
                  )
                : [x];
              const lineTotal = components.reduce(
                (sum, line) => sum + line.unitTotal * line.quantity,
                0,
              );
              return (
                <View key={x.lineId} style={s.cartLine}>
                  {x.image ? (
                    <Image source={{ uri: x.image }} style={s.cartImage} />
                  ) : (
                    <View style={[s.cartImage, s.imagePlaceholder]}>
                      <Ionicons
                        name="pizza-outline"
                        size={28}
                        color={colors.brown}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.cartName}>{x.comboName || x.name}</Text>
                    <Text style={s.cartMeta}>
                      {x.comboGroupId
                        ? components
                            .map(
                              (line) =>
                                `${line.quantity}× ${line.name}${line.selectedSides.length ? ` (${line.selectedSides.map((side) => side.name).join(", ")})` : ""}`,
                            )
                            .join("\n")
                        : x.selectedSides
                            .map((side) => `${side.quantity}× ${side.name}`)
                            .join(", ") || x.category}
                    </Text>
                    <Text style={s.price}>{money(lineTotal)}</Text>
                  </View>
                  {x.comboGroupId ? (
                    <Pressable
                      style={s.removeCombo}
                      onPress={() => shop.decrement(x.lineId)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.red}
                      />
                    </Pressable>
                  ) : (
                    <View style={s.stepper}>
                      <Pressable onPress={() => shop.decrement(x.lineId)}>
                        <Ionicons name="remove" size={20} />
                      </Pressable>
                      <Text style={s.qty}>{x.quantity}</Text>
                      <Pressable onPress={() => shop.increment(x.lineId)}>
                        <Ionicons name="add" size={20} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={s.summary}><Row label="Subtotal" value={money(subtotal)} /><Text style={s.checkoutHint}>Podrás confirmar entrega y pago en los próximos pasos.</Text></View>
            </>}
            {step === 2 && <>
            <Text style={s.optionTitle}>Tu modalidad</Text>
            <View style={s.checkoutContext}>
              <Ionicons name={deliveryType === "delivery" ? "bicycle" : "storefront"} size={22} color={colors.brown} />
              <View style={{ flex:1 }}><Text style={s.checkoutContextTitle}>{deliveryType === "delivery" ? "Delivery" : "Recoger en sucursal"}</Text><Text style={s.checkoutContextSub}>{branch.name}</Text></View>
              <Ionicons name="checkmark-circle" size={21} color={colors.green} />
            </View>
            {deliveryType === "delivery" && (
              <>
                <Text style={s.optionTitle}>Dirección</Text>
                {addresses.length ? (
                  addresses.map((a: any) => (
                    <Choice
                      key={a.id}
                      label={`${a.label || "Dirección"} · ${a.street}`}
                      active={addressId === a.id}
                      onPress={() => { setAddressId(a.id); setAddressText(a.street ?? ""); }}
                    />
                  ))
                ) : (
                  <Pressable style={s.option} onPress={onLogin}>
                    <Text style={s.optionText}>
                      Agrega una dirección en tu perfil
                    </Text>
                  </Pressable>
                )}
                {selectedAddress && <View style={s.checkoutContext}><Ionicons name="navigate-circle" size={22} color={colors.green} /><View style={{ flex:1 }}><Text style={s.checkoutContextTitle}>{selectedAddress.detected_zone_name || 'Zona validada'}</Text><Text style={s.checkoutContextSub}>Atiende {branch.name} · Delivery {money(delivery)}</Text></View></View>}
              </>
            )}
            <Text style={s.optionTitle}>¿Cuándo lo quieres?</Text>
            <View style={s.checkoutOptions}>{scheduleOptions.map((option) => <Choice key={option.label} label={option.label} active={scheduledFor === option.value} onPress={() => setScheduledFor(option.value)} />)}</View>
            </>}
            {step === 3 && <>
            <Text style={s.optionTitle}>Método de pago</Text>
            <View style={s.checkoutOptions}>
              {(branch.paymentMethods?.length ? branch.paymentMethods : [{ id: 1, name: "EFECTIVO" }, { id: 2, name: "TARJETA" }]).map((method) => (
                <Choice key={method.id} label={method.name === "TARJETA" ? "Tarjeta al recibir" : method.name.charAt(0) + method.name.slice(1).toLowerCase()} active={paymentMethodId === method.id} onPress={() => setPaymentMethodId(method.id)} />
              ))}
            </View>
            <View style={s.summary}>
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Delivery" value={deliveryType === "delivery" ? money(delivery) : "Sin costo"} />
              <View style={s.divider} />
              <Row label="Total" value={money(total)} strong />
            </View>
            <View style={s.reviewCard}><Ionicons name="shield-checkmark" size={22} color={colors.green} /><View style={{ flex:1 }}><Text style={s.checkoutContextTitle}>Revisión segura</Text><Text style={s.checkoutContextSub}>Validaremos precios, inventario, cobertura y horario antes de crear el pedido.</Text></View></View>
            </>}
          </>
        )}
      </ScrollView>
      {shop.cart.length > 0 && (
        <View style={s.cartFooter}>
          {step > 1 && <Pressable accessibilityRole="button" onPress={() => setStep((step - 1) as 1 | 2)} style={s.backStep}><Ionicons name="arrow-back" size={20} color={colors.brown} /></Pressable>}
          <Pressable
            disabled={sending}
            style={[s.primary, s.cartPrimary, sending && { opacity: 0.6 }]}
            onPress={() => step < 3 ? setStep((step + 1) as 2 | 3) : submit()}
          >
            {sending ? (
              <ActivityIndicator color={colors.brown} />
            ) : (
              <Text style={s.primaryText}>
                {auth.session
                  ? step === 1 ? 'Continuar con la entrega' : step === 2 ? 'Continuar al pago' : `Confirmar pedido · ${money(total)}`
                  : "Iniciar sesión para ordenar"}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.option, active && s.optionActive]}>
      <View style={[s.radio, active && s.radioActive]} />
      <Text style={s.optionText}>{label}</Text>
    </Pressable>
  );
}
function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={strong ? s.totalText : s.summaryText}>{label}</Text>
      <Text style={strong ? s.totalText : s.summaryText}>{value}</Text>
    </View>
  );
}
function Empty({
  icon,
  title,
  body,
}: {
  icon: any;
  title: string;
  body?: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.brown} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {body && <Text style={s.emptyBody}>{body}</Text>}
    </View>
  );
}

function OrderConfirmation({ visible, order, onHome, onTrack }: { visible: boolean; order: any; onHome: () => void; onTrack: () => void }) {
  const eta = order?.scheduled_for ? new Date(order.scheduled_for).toLocaleString('es-DO',{weekday:'long',hour:'numeric',minute:'2-digit'}) : order?.mode === 'delivery' ? '30–45 minutos' : '15–25 minutos';
  return <Modal visible={visible} animationType="slide" onRequestClose={onHome}><SafeAreaView style={s.confirmScreen}>
    <View style={s.confirmIcon}><Ionicons name="checkmark" size={48} color="white" /></View>
    <Text style={s.confirmKicker}>PEDIDO CONFIRMADO</Text><Text style={s.confirmTitle}>¡Ya estamos preparando tu pizza!</Text>
    <Text style={s.confirmNumber}>Pedido #{order?.account_id}</Text>
    <View style={s.confirmEta}><Ionicons name="time" size={24} color={colors.brown} /><View><Text style={s.confirmEtaLabel}>Tiempo estimado</Text><Text style={s.confirmEtaValue}>{eta}</Text></View></View>
    <Text style={s.confirmBranch}>{order?.branchName}</Text><Text style={s.confirmBody}>Puedes seguir cada etapa del pedido desde la sección Pedidos.</Text>
    <Pressable onPress={onTrack} style={s.confirmPrimary}><Text style={s.confirmPrimaryText}>Seguir mi pedido</Text></Pressable>
    <Pressable onPress={onHome} style={s.confirmSecondary}><Text style={s.confirmSecondaryText}>Volver al inicio</Text></Pressable>
  </SafeAreaView></Modal>;
}

function SkeletonCards() {
  return <View style={s.grid}>{[1,2,3,4].map((item) => <View key={item} style={s.skeletonCard}><View style={s.skeletonImage} /><View style={s.skeletonLineWide} /><View style={s.skeletonLine} /></View>)}</View>;
}

function RewardsPanel({ session, loyalty, program, onLogin, onChanged }: { session: boolean; loyalty?: any; program:any; onLogin: () => void; onChanged:()=>void }) {
  const [redeeming,setRedeeming]=useState<number|null>(null); const ratio=Number(program.currency_amount_per_point||100); const rewards=program.rewards??[];
  if (!session) return <View style={s.rewardsEmpty}><View style={s.rewardsGift}><Ionicons name="gift" size={38} color={colors.brown} /></View><Text style={s.confirmTitle}>Convierte tus pedidos en premios</Text><Text style={s.emptyBody}>Inicia sesión para acumular 1 punto por cada {money(ratio)} y ver tus recompensas.</Text><Pressable onPress={onLogin} style={s.confirmPrimary}><Text style={s.confirmPrimaryText}>Iniciar sesión</Text></Pressable></View>;
  const balance = Number(loyalty?.balance ?? 0); const goal = Number(rewards[0]?.points_cost??50); const progress = Math.min(1, balance / goal);
  const redeem=async(r:any)=>{try{setRedeeming(r.id);const x=await redeemLoyaltyReward(r.id);Alert.alert('¡Premio canjeado!',`Tu código es ${x.code}. Válido hasta ${new Date(x.expires_at).toLocaleDateString('es-DO')}.`);onChanged()}catch(e:any){Alert.alert('No pudimos canjearlo',e?.response?.data?.message||'Intenta nuevamente.')}finally{setRedeeming(null)}};
  return <View><Text style={s.title}>Tus recompensas</Text><Text style={s.subtitle}>Cada pedido te acerca a algo delicioso.</Text>
    <LinearGradient colors={[colors.brownDark,colors.brown]} style={s.rewardsCard}><Text style={s.rewardsLabel}>PUNTOS DISPONIBLES</Text><Text style={s.rewardsBalance}>{balance}</Text><Text style={s.rewardsCaption}>1 punto por cada {money(ratio)} en pedidos</Text><View style={s.rewardsProgress}><View style={[s.rewardsProgressFill,{width:`${progress*100}%`}]} /></View><Text style={s.rewardsNext}>{balance >= goal ? '¡Ya puedes canjear una recompensa!' : `Te faltan ${Math.max(0,goal-balance)} puntos para tu próxima recompensa`}</Text></LinearGradient>
    <Text style={s.optionTitle}>Premios disponibles</Text>{rewards.map((r:any)=><View key={r.id} style={s.rewardMovement}><View style={s.rewardMovementIcon}><Ionicons name="gift" size={18} color={colors.orange}/></View><View style={{flex:1}}><Text style={s.checkoutContextTitle}>{r.name}</Text><Text style={s.checkoutContextSub}>{r.description}{r.terms?` · ${r.terms}`:''}</Text></View><Pressable disabled={balance<r.points_cost||redeeming===r.id} onPress={()=>redeem(r)} style={[s.campaignCta,(balance<r.points_cost||redeeming===r.id)&&{opacity:.45}]}><Text style={s.campaignCtaText}>{redeeming===r.id?'...':`${r.points_cost} pts`}</Text></Pressable></View>)}
    {!!loyalty?.redemptions?.length&&<><Text style={s.optionTitle}>Mis códigos</Text>{loyalty.redemptions.map((r:any)=><View key={r.id} style={s.rewardMovement}><View style={{flex:1}}><Text style={s.checkoutContextTitle}>{r.reward_name}</Text><Text style={s.checkoutContextSub}>Vence {new Date(r.expires_at).toLocaleDateString('es-DO')}</Text></View><Text style={s.rewardPoints}>{r.code}</Text></View>)}</>}
    <Text style={s.optionTitle}>Actividad reciente</Text>{(loyalty?.movements ?? []).length ? loyalty.movements.map((item:any)=><View key={item.id} style={s.rewardMovement}><View style={s.rewardMovementIcon}><Ionicons name={item.points >= 0 ? 'add' : 'remove'} size={18} color={item.points >= 0 ? colors.green : colors.red} /></View><View style={{flex:1}}><Text style={s.checkoutContextTitle}>{item.description || 'Movimiento de puntos'}</Text><Text style={s.checkoutContextSub}>{new Date(item.created_at).toLocaleDateString('es-DO')}</Text></View><Text style={[s.rewardPoints,{color:item.points>=0?colors.green:colors.red}]}>{item.points>=0?'+':''}{item.points}</Text></View>) : <Empty icon="sparkles-outline" title="Aún no tienes movimientos" body="Tus puntos aparecerán después de tu próximo pedido." />}
    {!!program.terms&&<><Text style={s.optionTitle}>Reglas y términos</Text><Text style={s.emptyBody}>{program.terms}</Text></>}
  </View>;
}

const s = StyleSheet.create({
  rewardsEmpty:{ alignItems:'center',paddingTop:48 },rewardsGift:{ width:78,height:78,borderRadius:26,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center' },rewardsCard:{ borderRadius:24,padding:22,marginTop:22,...shadow },rewardsLabel:{ fontSize:10,fontWeight:'900',letterSpacing:1.4,color:colors.yellow },rewardsBalance:{ fontSize:52,fontWeight:'900',color:'white',marginTop:3 },rewardsCaption:{ fontSize:12,color:'#E7D2CD' },rewardsProgress:{ height:8,borderRadius:4,backgroundColor:'rgba(255,255,255,.18)',marginTop:20,overflow:'hidden' },rewardsProgressFill:{ height:'100%',backgroundColor:colors.yellow,borderRadius:4 },rewardsNext:{ fontSize:11,fontWeight:'800',color:'white',marginTop:9 },rewardMovement:{ backgroundColor:'white',borderRadius:15,borderWidth:1,borderColor:colors.border,padding:13,flexDirection:'row',alignItems:'center',gap:10,marginBottom:9 },rewardMovementIcon:{ width:36,height:36,borderRadius:11,backgroundColor:colors.cream,alignItems:'center',justifyContent:'center' },rewardPoints:{ fontSize:15,fontWeight:'900' },
  confirmScreen:{ flex:1,backgroundColor:colors.cream,alignItems:'center',justifyContent:'center',padding:28 },confirmIcon:{ width:96,height:96,borderRadius:48,backgroundColor:colors.green,alignItems:'center',justifyContent:'center',marginBottom:24 },confirmKicker:{ fontSize:11,fontWeight:'900',letterSpacing:1.5,color:colors.green },confirmTitle:{ fontSize:29,lineHeight:34,fontWeight:'900',color:colors.text,textAlign:'center',marginTop:8 },confirmNumber:{ fontSize:15,fontWeight:'800',color:colors.muted,marginTop:10 },confirmEta:{ width:'100%',backgroundColor:'white',borderRadius:18,padding:16,flexDirection:'row',alignItems:'center',gap:12,marginTop:28,borderWidth:1,borderColor:colors.border },confirmEtaLabel:{ fontSize:11,color:colors.muted },confirmEtaValue:{ fontSize:18,fontWeight:'900',color:colors.brown,marginTop:2 },confirmBranch:{ fontSize:13,fontWeight:'900',color:colors.brown,marginTop:18 },confirmBody:{ fontSize:13,lineHeight:19,color:colors.muted,textAlign:'center',marginTop:7 },confirmPrimary:{ width:'100%',height:54,borderRadius:16,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center',marginTop:28 },confirmPrimaryText:{ fontSize:15,fontWeight:'900',color:colors.brown },confirmSecondary:{ padding:16 },confirmSecondaryText:{ fontSize:13,fontWeight:'800',color:colors.muted },
  campaigns:{ gap:12,paddingRight:18,marginBottom:14 },campaignCard:{ width:330,height:210,borderRadius:24,overflow:'hidden',backgroundColor:colors.brown,...shadow },campaignImage:{ width:'100%',height:'100%' },campaignShade:{ position:'absolute',left:0,right:0,top:0,bottom:0,padding:18,justifyContent:'space-between' },campaignBadge:{alignSelf:'flex-start',backgroundColor:colors.red,borderRadius:10,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:5},campaignBadgeText:{fontSize:10,fontWeight:'900',letterSpacing:.5,color:'white'},campaignBottom:{alignItems:'flex-start'},campaignTitle:{ fontSize:24,lineHeight:27,fontWeight:'900',color:'white',maxWidth:275 },campaignDescription:{ fontSize:11,color:'#F3E6E2',marginTop:4 },campaignCta:{ alignSelf:'flex-start',marginTop:10,backgroundColor:colors.yellow,borderRadius:11,paddingHorizontal:12,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:6 },campaignCtaText:{ fontSize:12,fontWeight:'900',color:colors.brown },
  skeletonCard:{ width:'48%',height:218,borderRadius:19,backgroundColor:'white',overflow:'hidden' },skeletonImage:{ height:125,backgroundColor:'#EEE8E4' },skeletonLineWide:{ height:14,borderRadius:7,backgroundColor:'#EEE8E4',margin:12,marginBottom:7 },skeletonLine:{ height:10,width:'58%',borderRadius:5,backgroundColor:'#F2EEEB',marginHorizontal:12 },
  checkoutSteps:{ flexDirection:'row',justifyContent:'space-between',marginBottom:22,paddingHorizontal:2,backgroundColor:'white',borderRadius:18,paddingVertical:13,borderWidth:1,borderColor:'#E9DED7' },
  checkoutStep:{ alignItems:'center',flex:1,gap:5,position:'relative' },checkoutStepLine:{position:'absolute',height:2,backgroundColor:'#E4D8D2',right:'50%',left:'-50%',top:14},checkoutStepLineActive:{backgroundColor:colors.brown},checkoutStepDot:{ width:30,height:30,borderRadius:15,backgroundColor:'#EEE5E0',alignItems:'center',justifyContent:'center',zIndex:1 },checkoutStepDotActive:{ backgroundColor:colors.brown },checkoutStepNumber:{ fontSize:11,fontWeight:'900',color:colors.muted },checkoutStepNumberActive:{ color:'white' },checkoutStepLabel:{ fontSize:9,fontWeight:'700',color:colors.muted },checkoutStepLabelActive:{ color:colors.brown,fontWeight:'900' },
  checkoutHint:{ fontSize:11,lineHeight:16,color:colors.muted,marginTop:10 },reviewCard:{ flexDirection:'row',gap:10,alignItems:'center',padding:13,borderRadius:14,backgroundColor:'#EDF9F1',borderWidth:1,borderColor:'#C9EBD5',marginTop:12 },backStep:{ width:50,height:52,borderRadius:15,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center' },
  availabilityBanner: { flexDirection:'row', alignItems:'center', gap:9, borderRadius:15, padding:12, marginBottom:2, borderWidth:1 },
  availabilityOpen: { backgroundColor:'#EDF9F1', borderColor:'#C9EBD5' },
  availabilityClosed: { backgroundColor:'#FFF1F1', borderColor:'#F3CCCC' },
  availabilityTitle: { fontSize:12, fontWeight:'900', color:colors.text },
  availabilityText: { fontSize:10, color:colors.muted, marginTop:2 },
  floatingCart: { position:'absolute', left:18, right:18, bottom:78, height:54, borderRadius:17, backgroundColor:colors.brown, flexDirection:'row', alignItems:'center', paddingHorizontal:14, zIndex:20, ...shadow },
  floatingCartCount: { width:30, height:30, borderRadius:10, backgroundColor:colors.yellow, alignItems:'center', justifyContent:'center' },
  floatingCartCountText: { fontSize:12, fontWeight:'900', color:colors.brown },
  floatingCartText: { flex:1, marginLeft:10, fontSize:14, fontWeight:'900', color:'white' },
  floatingCartTotal: { fontSize:14, fontWeight:'900', color:colors.yellow },
  checkoutOptions: { gap: 8 },
  addressInput: { minHeight: 78, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: "white", padding: 14, marginTop: 8, color: colors.text, textAlignVertical: "top" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNumber: { fontSize: 17, fontWeight: "900", color: colors.text },
  orderDate: { fontSize: 10, color: colors.muted, marginTop: 3 },
  statusBadge: {
    borderRadius: 10,
    backgroundColor: colors.yellowSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: { fontSize: 10, fontWeight: "900", color: colors.brown },
  orderBranch: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.brown,
    marginTop: 14,
  },
  orderAddress: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 3,
  },
  track: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.border,
    height: 3,
    marginHorizontal: 6,
    marginTop: 22,
  },
  trackDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.border,
    marginTop: -5,
  },
  trackDotActive: { backgroundColor: colors.green },
  trackLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  trackLabel: {
    fontSize: 8,
    color: colors.muted,
    maxWidth: 55,
    textAlign: "center",
  },
  orderBottom: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 15,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderType: { fontSize: 12, fontWeight: "800", color: colors.muted },
  promotedCard: { borderWidth: 1.5, borderColor: colors.red },
  promoBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    zIndex: 2,
    minHeight: 27,
    borderRadius: 10,
    backgroundColor: colors.red,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  promoBadgeText: { fontSize: 10, fontWeight: "900", color: "white" },
  originalPrice: {
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  promoPrice: { color: colors.red },
  removeCombo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF0ED",
    alignItems: "center",
    justifyContent: "center",
  },
  dataState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  dataStateText: { fontSize: 13, color: colors.muted, marginTop: 10 },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.yellow,
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryButtonLight: {
    alignSelf: "flex-start",
    marginBottom: 20,
    backgroundColor: colors.yellow,
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryText: { fontSize: 13, fontWeight: "900", color: colors.brown },
  safe: { flex: 1, backgroundColor: colors.brown },
  header: {
    height: 70,
    paddingHorizontal: 20,
    backgroundColor: colors.brown,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: "#D9BEB7",
  },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  branchName: { fontSize: 17, fontWeight: "800", color: colors.white },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -4,
    top: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: "white" },
  content: {
    padding: 18,
    paddingBottom: 110,
    backgroundColor: colors.cream,
    minHeight: "100%",
  },
  greeting: { marginBottom: 16 },
  title: {
    fontSize: 27,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 3 },
  contextCard: { marginTop: 16, backgroundColor: 'white', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.border, ...shadow },
  contextIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  contextTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  contextSub: { fontSize: 10, lineHeight: 15, color: colors.muted, marginTop: 3 },
  hero: {
    height: 190,
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    overflow: "hidden",
    ...shadow,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: colors.yellow,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: "900",
    color: "white",
    marginTop: 7,
    maxWidth: 220,
  },
  heroPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E7D2CD",
    marginTop: 7,
  },
  heroButton: {
    marginTop: 14,
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 15,
    alignSelf: "flex-start",
  },
  heroButtonText: { fontWeight: "900", color: colors.brown },
  pizzaEmoji: {
    fontSize: 83,
    position: "absolute",
    right: -8,
    bottom: 1,
    transform: [{ rotate: "-12deg" }],
  },
  search: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
    marginTop: 18,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  chips: { gap: 9, paddingVertical: 16 },
  chip: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 17,
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brown, borderColor: colors.brown },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  chipTextActive: { color: "white" },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
  link: { fontSize: 13, fontWeight: "800", color: colors.orange },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 19,
    overflow: "hidden",
    ...shadow,
  },
  productImage: {
    width: "100%",
    height: 125,
    backgroundColor: colors.yellowSoft,
  },
  heart: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  productBody: { padding: 12 },
  productName: { fontSize: 15, fontWeight: "900", color: colors.text },
  productDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 4,
    minHeight: 30,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  price: { fontSize: 15, fontWeight: "900", color: colors.brown },
  add: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    paddingTop: 10,
  },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navLabel: { fontSize: 10, fontWeight: "700", color: "#A49390" },
  navActive: { color: colors.brown, fontWeight: "900" },
  branchScreen: { flex: 1 },
  branchContent: { padding: 22, paddingTop: 60 },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 25,
    alignSelf: "center",
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-4deg" }],
  },
  logoPizza: { fontSize: 44 },
  brand: {
    textAlign: "center",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "white",
    marginTop: 16,
  },
  branchTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "white",
    marginTop: 45,
  },
  branchSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#D9BEB7",
    marginTop: 5,
    marginBottom: 20,
  },
  serviceSafe:{flex:1,backgroundColor:'#F8F3EE'},serviceScroll:{flexGrow:1,backgroundColor:'#F8F3EE'},
  serviceHero:{minHeight:330,paddingHorizontal:22,paddingTop:12,paddingBottom:54,overflow:'hidden'},
  serviceBrandRow:{flexDirection:'row',alignItems:'center',gap:9},serviceMark:{width:42,height:42,borderRadius:14,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center'},serviceBrand:{fontSize:15,fontWeight:'900',letterSpacing:1.5,color:'white'},serviceFresh:{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(255,255,255,.1)',paddingHorizontal:9,paddingVertical:6,borderRadius:20},serviceFreshDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.green},serviceFreshText:{fontSize:7,fontWeight:'900',letterSpacing:.7,color:'#F7E8E3'},
  serviceEyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.8,color:colors.yellow,marginTop:40},serviceTitle:{fontSize:39,lineHeight:42,fontWeight:'900',letterSpacing:-1.4,color:'white',marginTop:7,maxWidth:275},serviceSubtitle:{fontSize:12,lineHeight:18,color:'#DEC6BF',maxWidth:275,marginTop:10},
  servicePizzaArt:{position:'absolute',right:-48,bottom:-48,width:170,height:170,borderRadius:85,backgroundColor:'rgba(255,255,255,.06)',borderWidth:1,borderColor:'rgba(255,255,255,.1)',alignItems:'center',justifyContent:'center',transform:[{rotate:'12deg'}]},servicePizzaInner:{width:118,height:118,borderRadius:59,backgroundColor:'rgba(0,0,0,.12)',alignItems:'center',justifyContent:'center'},
  serviceBody:{marginTop:-28,borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:'#F8F3EE',paddingHorizontal:18,paddingTop:18,paddingBottom:24,minHeight:480},
  serviceModes:{flexDirection:'row',gap:10,marginBottom:20},serviceMode:{flex:1,minHeight:86,borderRadius:19,backgroundColor:'white',borderWidth:1,borderColor:'#E9DED7',padding:12,flexDirection:'row',alignItems:'center',gap:10,...shadow},serviceModeActive:{backgroundColor:colors.yellowSoft,borderColor:colors.yellow},serviceModeIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F4EAE4',alignItems:'center',justifyContent:'center'},serviceModeIconActive:{backgroundColor:colors.brown},serviceModeTitle:{fontSize:14,fontWeight:'900',color:colors.text},serviceModeTitleActive:{color:colors.brown},serviceModeSub:{fontSize:9,color:colors.muted,marginTop:2},
  serviceLoading:{paddingVertical:54,alignItems:'center',gap:13},serviceLoadingText:{fontSize:12,color:colors.muted,fontWeight:'700'},serviceError:{backgroundColor:'white',borderRadius:22,padding:24,alignItems:'center',borderWidth:1,borderColor:colors.border},
  servicePanel:{backgroundColor:'white',borderRadius:24,padding:22,alignItems:'center',borderWidth:1,borderColor:'#E9DED7',...shadow},servicePanelIcon:{width:58,height:58,borderRadius:20,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},servicePanelKicker:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:colors.orange,marginTop:17},servicePanelTitle:{fontSize:23,lineHeight:27,fontWeight:'900',color:colors.text,textAlign:'center',marginTop:5},servicePanelCopy:{fontSize:12,lineHeight:18,color:colors.muted,textAlign:'center',marginTop:8,maxWidth:290},servicePrimary:{height:54,borderRadius:16,backgroundColor:colors.brown,alignSelf:'stretch',marginTop:20,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},servicePrimaryText:{fontSize:14,fontWeight:'900',color:'white'},serviceGuest:{paddingVertical:15,alignSelf:'stretch',alignItems:'center'},serviceGuestText:{fontSize:12,fontWeight:'900',color:colors.brown,textDecorationLine:'underline'},serviceTrust:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#EDF8F0',paddingHorizontal:11,paddingVertical:8,borderRadius:12},serviceTrustText:{fontSize:9,fontWeight:'700',color:'#3E7250'},
  serviceSectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:12,paddingHorizontal:2},serviceSectionKicker:{fontSize:9,fontWeight:'900',letterSpacing:1.3,color:colors.orange},serviceSectionTitle:{fontSize:21,fontWeight:'900',color:colors.text,marginTop:3},serviceEdit:{fontSize:11,fontWeight:'900',color:colors.brown,textDecorationLine:'underline'},serviceCount:{fontSize:10,fontWeight:'800',color:colors.green,backgroundColor:'#E6F5EB',paddingHorizontal:10,paddingVertical:6,borderRadius:12},
  serviceOption:{backgroundColor:'white',borderRadius:19,borderWidth:1,borderColor:'#E9DED7',padding:14,flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},serviceOptionDisabled:{opacity:.58,backgroundColor:'#F5F1EE'},serviceOptionIcon:{width:46,height:46,borderRadius:15,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},serviceOptionTitleRow:{flexDirection:'row',alignItems:'center',gap:7},serviceOptionTitle:{fontSize:14,fontWeight:'900',color:colors.text},serviceDefault:{backgroundColor:colors.brown,borderRadius:7,paddingHorizontal:6,paddingVertical:3},serviceDefaultText:{fontSize:6,fontWeight:'900',letterSpacing:.7,color:'white'},serviceOptionAddress:{fontSize:10,lineHeight:14,color:colors.muted,marginTop:3},serviceStatusRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:6},serviceStatusDot:{width:6,height:6,borderRadius:3},serviceStatusText:{fontSize:9,fontWeight:'900'},
  serviceAdd:{borderRadius:19,borderWidth:1.5,borderStyle:'dashed',borderColor:'#CBB7AC',padding:14,flexDirection:'row',alignItems:'center',gap:12,marginTop:4},serviceAddIcon:{width:42,height:42,borderRadius:14,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center'},serviceAddTitle:{fontSize:13,fontWeight:'900',color:colors.brown},serviceAddSub:{fontSize:9,color:colors.muted,marginTop:2},serviceFooter:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,marginTop:20},serviceFooterText:{fontSize:9,color:colors.muted},
  modeSelector: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  modeCard: { flex: 1, minHeight: 112, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', padding: 15, justifyContent: 'center' },
  modeCardActive: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  modeTitle: { color: 'white', fontWeight: '900', fontSize: 16, marginTop: 7 },
  modeTitleActive: { color: colors.brown },
  modeCaption: { color: '#BDA19B', fontSize: 11, marginTop: 2 },
  setupSection: { color: '#D9BEB7', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  setupPanel: { backgroundColor: 'white', borderRadius: 22, padding: 24, alignItems: 'center' },
  setupTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 10 },
  setupBody: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 5 },
  setupPrimary: { backgroundColor: colors.yellow, height: 48, borderRadius: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 18, alignSelf: 'stretch' },
  setupPrimaryText: { color: colors.brown, fontWeight: '900', fontSize: 14 },
  unavailableText: { fontSize: 11, fontWeight: '800', color: colors.red },
  manageAddressBtn: { height: 52, borderRadius: 16, backgroundColor: colors.yellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 3 },
  manageAddressText: { color: colors.brown, fontSize: 13, fontWeight: '900' },
  branchCard: {
    minHeight: 105,
    borderRadius: 20,
    backgroundColor: "white",
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storeIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.yellowSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  branchCardName: { fontSize: 14, fontWeight: "900", color: colors.text },
  branchAddress: { fontSize: 11, color: colors.muted, marginVertical: 5 },
  openText: { fontSize: 11, fontWeight: "800", color: colors.green },
  modalShade: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(30,10,10,.55)",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  detailImage: { width: "100%", height: 270 },
  close: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  detailBody: { padding: 20, paddingBottom: 35 },
  detailTitle: { fontSize: 26, fontWeight: "900", color: colors.text },
  detailDesc: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 7,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.text,
    marginTop: 22,
    marginBottom: 8,
  },
  option: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
    marginBottom: 8,
    borderRadius: 15,
  },
  optionActive: { borderWidth: 2, borderColor: colors.yellow },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#BBAEAA",
    marginRight: 10,
  },
  radioActive: { borderWidth: 5, borderColor: colors.yellow },
  optionText: { flex: 1, fontWeight: "800", color: colors.text },
  optionPrice: { fontSize: 12, fontWeight: "700", color: colors.muted },
  primary: {
    height: 55,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { fontSize: 15, fontWeight: "900", color: colors.brown },
  cartScreen: { flex: 1, backgroundColor: '#F8F3EE' },
  cartHeader: {
    minHeight: 76,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brown,
    gap:12,
  },
  cartBack:{width:43,height:43,borderRadius:14,backgroundColor:'white',alignItems:'center',justifyContent:'center'},cartKicker:{fontSize:8,fontWeight:'900',letterSpacing:1.2,color:colors.yellow},cartTitle: { fontSize: 19, fontWeight: "900", color: 'white',marginTop:2 },cartItemCount:{minWidth:36,height:36,borderRadius:12,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center',paddingHorizontal:8},cartItemCountText:{fontSize:13,fontWeight:'900',color:colors.brown},
  cartContent: { padding: 16,paddingBottom:125 },
  cartLine: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 11,
    borderWidth:1,
    borderColor:'#E9DED7',
  },
  cartImage: { width: 76, height: 76, borderRadius: 16 },
  cartName: { fontSize: 14, lineHeight:18,fontWeight: "900", color: colors.text },
  cartMeta: { fontSize: 10,lineHeight:14, color: colors.muted, marginVertical: 5 },
  stepper: {
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.yellowSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
  },
  qty: { fontWeight: "900" },
  summary: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 17,
    marginTop: 10,
  },
  checkoutContext: { minHeight: 62, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkoutContextTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  checkoutContextSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 7,
  },
  summaryText: { fontSize: 14, color: colors.muted },
  totalText: { fontSize: 18, fontWeight: "900", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  cartFooter: {
    paddingHorizontal:14,
    paddingVertical:12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: '#E9DED7',
    flexDirection:'row',
    alignItems:'center',
    gap:10,
  },
  cartPrimary:{flex:1,marginTop:0},
  empty: { alignItems: "center", paddingVertical: 65, paddingHorizontal: 25 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.yellowSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
    marginTop: 15,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
    marginTop: 7,
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 22,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.yellowSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRow: {
    height: 60,
    backgroundColor: "white",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getMenu } from "@/features/catalog/api";
import { ComboBuilder } from "@/features/catalog/components/ComboBuilder";
import { ProductCustomizer } from "@/features/catalog/components/ProductCustomizer";
import { useShop } from "@/features/cart/store";
import { AuthDialog } from "@/features/auth/components/AuthDialog";
import { useCustomerAuth } from "@/features/auth/store";
import { DeliveryAddress, getOrderDetail } from "@/features/customer/api";
import { AddressesModal } from "@/features/customer/components/AddressesModal";
import { colors, font } from "@/shared/theme";
import { Product } from "@/shared/types";
import { OrdersTracking as OrdersTrackingFeature } from "@/features/orders/components/OrdersTracking";
import { ProfileContent } from "@/features/customer/components/ProfileContent";
import { usePendingOrderRecovery } from '@/features/orders/usePendingOrderRecovery';
import { useMobileExperienceData } from '@/features/catalog/useMobileExperienceData';
import { confirmSheet } from '@/shared/components/ConfirmSheet';
import { toast } from '@/shared/components/Toast';
import { haptics } from '@/shared/haptics';
import { CatalogSection } from './main/CatalogSection';
import { Cart } from './main/Cart';
import { FloatingCart } from './main/FloatingCart';
import { OrderConfirmation } from './main/OrderConfirmation';
import { RewardsPanel } from './main/RewardsPanel';
import { ServiceSelect } from './main/ServiceSelect';

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
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
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
  const insets = useSafeAreaInsets();
  const tabFade = useRef(new Animated.Value(1)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const customerAuth = useCustomerAuth();
  const recoverOrder = useCallback((order: any) => { shop.clear(); setCartOpen(false); setConfirmedOrder(order); void customerQueryRef.current?.(); }, [shop]);
  const customerQueryRef = useRef<null | (() => void)>(null);
  usePendingOrderRecovery(recoverOrder);
  useEffect(() => {
    customerAuth.restore();
    AsyncStorage.getItem('pizza-getto-last-tab').then((value) => { if (tabs.some((item) => item.id === value)) setTab(value as (typeof tabs)[number]['id']); }).catch(() => undefined);
  }, []);
  const selectTab = (next: (typeof tabs)[number]['id']) => {
    if (next !== tab) {
      haptics.select();
      tabFade.setValue(0);
      Animated.timing(tabFade, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    setTab(next);
    if (next !== 'menu') { setCategory('Todos'); setCampaignItemIds(null); setSelectedCampaignId(null); setSearch(''); }
    requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ y: 0, animated: false }));
    void AsyncStorage.setItem('pizza-getto-last-tab', next);
  };
  const { customerQuery, configQuery, menuQuery: query, branches: availableBranches, branch } = useMobileExperienceData(shop.branchId, tab);
  customerQueryRef.current = () => { void customerQuery.refetch(); };
  const loyaltyProgram = configQuery.data?.loyalty ?? null;
  const visibleTabs = loyaltyProgram ? tabs : tabs.filter((item) => item.id !== 'rewards');
  useEffect(() => { if (!loyaltyProgram && tab === 'rewards' && !configQuery.isLoading) selectTab('home'); }, [loyaltyProgram, tab, configQuery.isLoading]);
  const campaigns = (configQuery.data?.campaigns ?? []).filter((campaign) => !campaign.locationId || campaign.locationId === branch?.id);
  const selectedCampaign = campaigns.find(campaign => campaign.id === selectedCampaignId);
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
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) {
      badgePulse.setValue(1);
      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1.4, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(badgePulse, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, badgePulse]);
  const refreshing = query.isRefetching || configQuery.isRefetching || customerQuery.isRefetching;
  const refreshAll = async () => {
    await Promise.all([configQuery.refetch(), branch ? query.refetch() : Promise.resolve(), customerAuth.session ? customerQuery.refetch() : Promise.resolve()]);
    setLastUpdated(new Date());
  };
  const reorder = async (order: any) => {
    const target = availableBranches.find((item) => item.id === Number(order.location_id));
    if (!target) { haptics.warning(); return toast('La sucursal de este pedido ya no está disponible.', 'error'); }
    try {
      const [detail, menu] = await Promise.all([getOrderDetail(Number(order.account_id)), getMenu(target)]);
      const previous = (detail?.orders ?? []).flatMap((item: any) => item.order_details ?? []);
      const byId = new Map(menu.products.map((product) => [product.id, product]));
      const available = previous.filter((item: any) => byId.has(Number(item.item_id)));
      if (!available.length) { haptics.warning(); return toast('Ninguno de los productos de ese pedido está disponible actualmente.', 'error'); }
      shop.clear();
      const deliveryAddress = addresses.find((address) => Number(address.effective_location_id) === target.id);
      if (order.is_delivery && deliveryAddress) shop.chooseService('delivery', target.id, deliveryAddress.id);
      else shop.chooseService('pickup', target.id);
      let changedCustomizations = 0;
      available.forEach((item: any) => {
        const product = byId.get(Number(item.item_id))!;
        const currentSides = new Map((product.sidesCategories ?? []).flatMap((category) => category.sides).map((side) => [side.id, side]));
        const selectedById = new Map<number, { id: number; name: string; itemId?: number | null; price: number; quantity: number }>();
        for (const previousSide of (item.side_types ?? []).flatMap((type: any) => type.sides ?? [])) {
          const current = currentSides.get(Number(previousSide.id));
          if (!current) { changedCustomizations += 1; continue; }
          const selected = selectedById.get(current.id);
          if (selected) selected.quantity += 1;
          else selectedById.set(current.id, { id: current.id, name: current.name, itemId: current.item_id, price: current.price, quantity: 1 });
        }
        shop.add(product, {
          quantity: Math.max(1, Number(item.quantity) || 1),
          note: String(item.item_note ?? '').trim() || undefined,
          selectedSides: [...selectedById.values()],
        });
      });
      const missing = previous.length - available.length;
      setCartOpen(true);
      haptics.success();
      if (missing > 0 || changedCustomizations > 0) confirmSheet({ title: 'Carrito actualizado', icon: 'cart', confirmText: 'Entendido', cancelText: null, message: [missing > 0 ? `${missing} producto${missing === 1 ? '' : 's'} ya no estaba disponible.` : '', changedCustomizations > 0 ? `${changedCustomizations} opción${changedCustomizations === 1 ? '' : 'es'} ya no existe y fue omitida.` : '', 'Los precios y promociones fueron recalculados con el menú actual.'].filter(Boolean).join('\n') });
    } catch (error: any) { haptics.error(); toast(error?.response?.data?.message || 'No pudimos repetirlo. Actualiza e intenta nuevamente.', 'error'); }
  };

  const openContext = () => {
    if (shop.cart.length) {
      confirmSheet({
        title: "Cambiar entrega",
        message: "Al cambiar de dirección o sucursal limpiaremos el carrito para evitar productos o precios incorrectos.",
        icon: "swap-horizontal",
        confirmText: "Continuar y limpiar",
        destructive: true,
        onConfirm: () => { shop.clear(); setContextOpen(true); },
      });
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
          if (!address.effective_location_id) { haptics.warning(); return confirmSheet({ title: "Dirección sin cobertura", message: "Edita esta dirección y confirma el punto en el mapa.", icon: "map", confirmText: "Entendido", cancelText: null }); }
          if (address.delivery_open_now === false) { haptics.warning(); return confirmSheet({ title: "Delivery cerrado", message: `Esta zona no está recibiendo pedidos ahora. Horario: ${address.delivery_schedule_label || "consulta el horario del local"}.`, icon: "time", confirmText: "Entendido", cancelText: null }); }
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
        <Pressable accessibilityRole="button" accessibilityLabel={count > 0 ? `Abrir carrito, ${count} productos` : "Abrir carrito"} style={s.cartButton} onPress={() => { haptics.tap(); setCartOpen(true); }}>
          <Ionicons name="bag-handle" size={21} color={colors.brown} />
          {count > 0 && (
            <Animated.View style={[s.badge, { transform: [{ scale: badgePulse }] }]}>
              <Text style={s.badgeText}>{count}</Text>
            </Animated.View>
          )}
        </Pressable>
      </View>
      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.yellow} colors={[colors.yellow]} />}
      >
        <Animated.View style={{ opacity: tabFade, transform: [{ translateY: tabFade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        {(tab === "home" || tab === "menu") && (
          <CatalogSection
            tab={tab}
            branch={branch}
            serviceMode={shop.serviceMode}
            selectedAddress={selectedAddress}
            campaigns={campaigns}
            campaignItemIds={campaignItemIds}
            selectedCampaign={selectedCampaign}
            lastUpdated={lastUpdated}
            search={search}
            category={category}
            categories={categories}
            products={filtered}
            loading={query.isLoading}
            error={query.isError}
            menuAvailability={menuAvailability}
            onRefresh={refreshAll}
            onRetry={() => query.refetch()}
            onOpenContext={openContext}
            onSelectCampaign={(campaign) => { selectTab('menu'); setSelectedCampaignId(campaign.id); setCampaignItemIds(campaign.itemIds); setCategory('Ofertas'); }}
            onClearCampaign={() => { setCampaignItemIds(null); setSelectedCampaignId(null); setCategory('Todos'); }}
            onPickCategory={(x) => { haptics.select(); setCampaignItemIds(null); setSelectedCampaignId(null); setCategory(x); }}
            onSearch={setSearch}
            onSeeAll={() => selectTab("menu")}
            onOpenProduct={(product) =>
              product.itemTypeId === 3
                ? setSelectedCombo(product)
                : setSelected(product)
            }
          />
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
        </Animated.View>
      </ScrollView>
      {count > 0 && !cartOpen && (
        <FloatingCart count={count} subtotal={subtotal} bottom={66 + Math.max(insets.bottom, 12)} onPress={() => { haptics.tap(); setCartOpen(true); }} />
      )}
      <View style={[s.nav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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

const s = StyleSheet.create({
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
    fontFamily: font.extraBold,
    letterSpacing: 1.3,
    color: "#D9BEB7",
  },
  branchRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  branchName: { fontSize: 17, fontFamily: font.extraBold, color: colors.white },
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
  badgeText: { fontSize: 10, fontFamily: font.black, color: "white" },
  content: {
    padding: 18,
    paddingBottom: 150,
    backgroundColor: colors.cream,
    minHeight: "100%",
  },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    paddingTop: 10,
  },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navLabel: { fontSize: 10, fontFamily: font.bold, color: "#A49390" },
  navActive: { color: colors.brown, fontFamily: font.black },
});

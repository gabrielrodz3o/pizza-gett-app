import axios from 'axios';
import { Branch, Campaign, CartLine, ComboSlot, Product, SideCategory } from '@/shared/types';
import { appConfig } from '@/shared/config';
import { logger } from '@/shared/logger';
import { clearPendingOrder,savePendingOrder,submitPendingOrder } from '@/features/orders/pendingOrder';

const BASE_URL = appConfig.apiBaseUrl;

const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

const formatTime = (value?: string | null) => {
  if (!value) return '';
  const [rawHour, rawMinute] = String(value).split(':').map(Number);
  const period = rawHour >= 12 ? 'PM' : 'AM';
  return `${rawHour % 12 || 12}:${String(rawMinute || 0).padStart(2, '0')} ${period}`;
};
const formatSchedule = (start?: string | null, end?: string | null) => start && end
  ? `${formatTime(start)}–${formatTime(end)}`
  : start ? `Desde ${formatTime(start)}` : end ? `Hasta ${formatTime(end)}` : 'Disponible ahora';

// ── Request logger ─────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = process.env.EXPO_PUBLIC_API_TOKEN;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  logger.breadcrumb(`${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  logger.error(error,{area:'api-request'});
  return Promise.reject(error);
});

// ── Response logger ─────────────────────────────────────────────────────────
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  const status  = error?.response?.status;
  const url     = error?.config?.url;
  const code    = error?.response?.data?.code;
  const message = error?.response?.data?.message ?? error?.message;
  if (error?.code === 'ECONNABORTED') {
    logger.error(error,{area:'api-timeout',url});
  } else if (!error?.response) {
    logger.error(error,{area:'api-network',url});
  } else {
    if(status>=500)logger.error(error,{area:'api-server',url,status,code,message});
  }
  return Promise.reject(error);
});

const taxRate = (item: any) => {
  const match = String(item.tax_type_name ?? '').match(/(\d+(?:\.\d+)?)%/);
  return match ? Number(match[1]) / 100 : 0;
};

const resolveImage = (item: any, pocketbaseUrl = '') => {
  const direct = item?.image_url || item?.item_image_url || item?.storage_url;
  if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) return direct;
  let legacy = item?.image_json;
  if (typeof legacy === 'string') { try { legacy = JSON.parse(legacy); } catch { legacy = null; } }
  if (!legacy?.collectionId || !legacy?.id || !legacy?.documents || !pocketbaseUrl) return '';
  let base = pocketbaseUrl.replace(/\/+$/, '');
  if (!base.endsWith('/api')) base += '/api';
  return `${base}/files/${legacy.collectionId}/${legacy.id}/${legacy.documents}`;
};

const parseRecipe = (value: any) => {
  let recipe = value;
  if (typeof recipe === 'string') { try { recipe = JSON.parse(recipe); } catch { recipe = []; } }
  return (Array.isArray(recipe) ? recipe : []).map((x: any) => ({
    itemId: Number(x.item_id), name: String(x.item_name ?? ''), quantity: Math.max(1, Math.round(Number(x.quantity) || 1)),
  })).filter((x: any) => x.itemId > 0);
};

const mapProduct = (item: any, pocketbaseUrl: string, menuId?: number): Product => {
  const hasPromotion = Boolean(item.has_active_promotion && item.active_promotion);
  let rawPromotion = item.active_promotion;
  if (typeof rawPromotion === 'string') { try { rawPromotion = JSON.parse(rawPromotion); } catch { rawPromotion = null; } }
  const isQuantityPromotion = rawPromotion?.type === 'BUY_X_GET_Y';
  const originalNetPrice = Number(item.sale_price ?? 0);
  const netPrice = Number(hasPromotion && !isQuantityPromotion ? item.discounted_price ?? originalNetPrice : originalNetPrice);
  const rate = taxRate(item);
  return {
    id: Number(item.item_id),
    name: String(item.item_name ?? ''),
    description: String(item.item_note ?? ''),
    orderPrice: netPrice,
    price: Number((netPrice * (1 + rate)).toFixed(2)),
    originalPrice: Number((originalNetPrice * (1 + rate)).toFixed(2)),
    category: String(item.category_name ?? item.item_categorie_name ?? 'Menú'),
    image: resolveImage(item, pocketbaseUrl),
    popular: hasPromotion,
    promotion: hasPromotion && rawPromotion ? {
      id: rawPromotion.id == null ? undefined : Number(rawPromotion.id), name: String(rawPromotion.name ?? 'Oferta'), type: String(rawPromotion.type ?? 'OFFER'),
      discountPercentage: rawPromotion.discount_percentage == null ? undefined : Number(rawPromotion.discount_percentage),
      discountAmount: rawPromotion.discount_amount == null ? undefined : Number(rawPromotion.discount_amount),
      requiredQuantity: rawPromotion.required_quantity == null ? undefined : Number(rawPromotion.required_quantity),
      rewardQuantity: rawPromotion.reward_quantity == null ? undefined : Number(rawPromotion.reward_quantity),
    } : undefined,
    productionCenterId: item.production_center_id == null ? undefined : Number(item.production_center_id),
    taxTypeId: item.tax_type_id == null ? undefined : Number(item.tax_type_id),
    taxRate: rate,
    unitId: item.unit_id == null ? undefined : Number(item.unit_id),
    itemTypeId: item.item_type_id == null ? undefined : Number(item.item_type_id),
    menuId,
    recipe: parseRecipe(item.item_in_recipes),
    availableQuantity: Number(item.discount_warehouse_quantity ?? 0),
    sidesCategories: (Array.isArray(item.sides_categories) ? item.sides_categories : []).map((category: any): SideCategory => ({
      id: Number(category.id), name: String(category.name ?? 'Opciones'),
      is_multiple: Boolean(category.is_multiple), is_required: Boolean(category.is_required),
      min_select: Number(category.min_select ?? 0), max_select: category.max_select == null ? null : Number(category.max_select),
      sides: (category.sides ?? []).map((side: any) => ({
        id: Number(side.id), name: String(side.name ?? side.item_name ?? 'Opción'),
        item_id: side.item_id == null ? null : Number(side.item_id), price: Number(side.price ?? 0), image: resolveImage(side, pocketbaseUrl),
        max_quantity: Math.max(1, Number(side.max_quantity ?? 1)), negative_sale: Boolean(side.negative_sale),
      })),
    })),
  };
};

export type MenuResult = { products: Product[]; availability: { openNow: boolean; hasConfiguredMenu: boolean; scheduleLabel?: string } };
export async function getMenu(branch: Branch): Promise<MenuResult> {
  const { data } = await api.get('/v1/mobile/apps/pizza-getto/catalog', { params: { location_id: branch.id, catalogue_id: branch.catalogueId } });
  const unique = new Map<number, Product>();
  (data.data?.products ?? [])
    .filter((item: any) => Number(item.discount_warehouse_quantity ?? 0) > 0 || item.negative_sale === true)
    .map((item: any) => mapProduct(item, branch.pocketbaseUrl ?? '', Number(item.menu_id)))
    .filter((item: Product) => item.id > 0 && item.name && item.price >= 0)
    .forEach((item: Product) => unique.set(item.id, item));
  const schedule = data.data?.availability?.schedules?.[0];
  return { products: [...unique.values()], availability: {
    openNow: Boolean(data.data?.availability?.open_now),
    hasConfiguredMenu: Boolean(data.data?.availability?.has_configured_menu),
    scheduleLabel: schedule ? formatSchedule(schedule.from_time, schedule.to_time) : undefined,
  } };
}

export async function getComboDefinition(branch: Branch, combo: Product): Promise<{ slots: ComboSlot[]; products: Map<number, Product>; fallback: boolean }> {
  const { data: slotResponse } = await api.get(`/v1/mobile/apps/pizza-getto/catalog/combos/${combo.id}`, { params: { location_id: branch.id, catalogue_id: branch.catalogueId } });
  const rawSlots = Array.isArray(slotResponse?.data?.slots) ? slotResponse.data.slots : [];
  let slots: ComboSlot[] = rawSlots.map((slot: any) => ({
    id: Number(slot.id), name: String(slot.name), sequence: Number(slot.sequence ?? 0), isRequired: Boolean(slot.is_required), quantity: 1,
    options: (slot.options ?? []).map((option: any) => ({ id: Number(option.id), itemId: Number(option.item_id), name: String(option.item_name ?? ''), itemTypeId: Number(option.item_type_id), priceDelta: Number(option.price_delta ?? 0), sequence: Number(option.sequence ?? 0) })),
  }));
  const virtual = slots.length === 0;
  if (virtual) {
    let sequence = 0;
    slots = (combo.recipe ?? []).filter((x) => x.itemId !== combo.id).flatMap((child) => Array.from({ length: child.quantity }, (_, index) => ({
      name: child.quantity > 1 ? `${child.name} (${index + 1})` : child.name, sequence: ++sequence, isRequired: true, quantity: 1, virtual: true,
      options: [{ itemId: child.itemId, name: child.name, priceDelta: 0 }],
    })));
  }
  const itemIds = [...new Set(slots.flatMap((slot) => slot.options.map((option) => option.itemId)))];
  if (!itemIds.length || !combo.menuId) return { slots: [], products: new Map(), fallback: virtual };
  const { data } = await api.get('/v1/mobile/apps/pizza-getto/catalog', { params: { location_id: branch.id, catalogue_id: branch.catalogueId } });
  const products = new Map<number, Product>((data?.data?.products ?? []).filter((item: any) => itemIds.includes(Number(item.item_id))).map((item: any) => {
    const product = mapProduct(item, branch.pocketbaseUrl ?? '', combo.menuId);
    return [product.id, product];
  }));
  if (virtual) {
    const resolved = slots.every((slot) => products.has(slot.options[0]?.itemId));
    const customizable = slots.some((slot) => (products.get(slot.options[0]?.itemId)?.sidesCategories?.length ?? 0) > 0);
    if (!resolved || !customizable) return { slots: [], products, fallback: true };
    const compacted: ComboSlot[] = [];
    for (const slot of slots) {
      const itemId = slot.options[0].itemId;
      if (!(products.get(itemId)?.sidesCategories?.length ?? 0)) {
        const previous = compacted.find((x) => x.virtual && x.options[0]?.itemId === itemId && !(products.get(itemId)?.sidesCategories?.length ?? 0));
        if (previous) { previous.quantity += 1; previous.name = `${slot.options[0].name} ×${previous.quantity}`; continue; }
      }
      compacted.push(slot);
    }
    slots = compacted;
  }
  return { slots, products, fallback: false };
}

export async function getMobileAppConfig(slug = 'pizza-getto'): Promise<{ branches: Branch[]; campaigns: Campaign[]; loyalty: any | null }> {
  const { data } = await api.get(`/v1/mobile/apps/${slug}/bootstrap`);
  const payload = data.data;
  return {
    loyalty: payload.loyalty ?? null,
    campaigns: (payload.campaigns ?? []).map((campaign: any) => ({
      id: Number(campaign.id), name: String(campaign.name ?? ''), description: String(campaign.description ?? ''),
      bannerUrl: String(campaign.banner_url ?? ''), altText: String(campaign.banner_alt_text ?? campaign.name ?? 'Promoción'),
      ctaLabel: String(campaign.mobile_cta_label ?? 'Ver oferta'), locationId: campaign.location_id == null ? undefined : Number(campaign.location_id),
      itemIds: (Array.isArray(campaign.item_ids) ? campaign.item_ids : []).map(Number),
      type: String(campaign.promotion_type ?? ''), discountPercentage: campaign.discount_percentage == null ? undefined : Number(campaign.discount_percentage),
      discountAmount: campaign.discount_amount == null ? undefined : Number(campaign.discount_amount), endDate: campaign.end_date || undefined,
    })),
    branches: (payload.locations ?? []).map((location: any) => ({
      id: Number(location.id),
      catalogueId: Number(location.catalogue_id),
      name: `Pizza Getto • ${location.name}`,
      address: location.address || location.description || '',
      phone: String(location.phone ?? ''),
      eta: location.open_now ? `Abierto · ${formatSchedule(location.shopping_start_time, location.shopping_end_time)}` : `Cerrado · ${formatSchedule(location.shopping_start_time, location.shopping_end_time)}`,
      open: Boolean(location.open_now),
      scheduleLabel: formatSchedule(location.shopping_start_time, location.shopping_end_time),
      delivery: Boolean(location.channels?.delivery),
      pickup: Boolean(location.channels?.pickup),
      paymentMethods: (location.payment_methods ?? []).map((method: any) => ({ id: Number(method.id), name: String(method.name) })),
      pocketbaseUrl: data.assets?.pocketbase_url || undefined,
    })),
  };
}

export type Checkout = { customer: { name: string; phone: string }; deliveryType: 'delivery' | 'pickup'; address?: string; addressId?: string; scheduledFor?: string | null; paymentMethodId: number; lines: CartLine[] };
export async function sendOrder(branch: Branch, checkout: Checkout) {
  const payload = {
    channel: 'pizza_getto_app', location_id: branch.id, catalogue_id: branch.catalogueId,
    customer: checkout.customer, delivery_type: checkout.deliveryType, delivery_address: checkout.address, delivery_address_id: checkout.addressId,
    scheduled_for: checkout.scheduledFor || null,
    payment_method_id: checkout.paymentMethodId,
    order_details: checkout.lines.map((x) => ({ item_id: x.id, quantity: x.quantity, order_price: x.orderPrice, original_price: x.orderPrice, item_note: x.note ?? '', production_center_id: x.productionCenterId, tax_type_id: x.taxTypeId ?? 2, combo_group_id: x.comboGroupId ?? null, combo_item_id: x.comboItemId ?? null, combo_name: x.comboName ?? null, combo_tax_type_id: x.comboTaxTypeId ?? null, combo_unit_id: x.comboUnitId ?? null, sides: x.selectedSides.flatMap((side) => Array.from({ length: side.quantity }, () => ({ item_id: x.id, side_id: side.id }))) })),
  };
  const idempotencyKey=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pending={idempotencyKey,payload,branchName:branch.name,mode:checkout.deliveryType,createdAt:new Date().toISOString()};
  await savePendingOrder(pending);
  try{const response=await submitPendingOrder(pending);await clearPendingOrder();return response.data;}catch(error:any){
    if(error?.response?.status===401){try{const response=await submitPendingOrder(pending,true);await clearPendingOrder();return response.data;}catch(retryError){throw retryError;}}
    if(error?.response&&error.response.status<500)await clearPendingOrder();
    else error.code='ORDER_CONFIRMATION_UNKNOWN';
    throw error;
  }
}

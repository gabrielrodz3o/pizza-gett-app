import axios from 'axios';
import { CustomerSession, getValidCustomerAccessToken } from '@/features/auth/store';
import { appConfig } from '@/shared/config';

const customerApi = axios.create({ baseURL: appConfig.apiBaseUrl, timeout: 15_000 });
customerApi.interceptors.request.use(async(config) => {
  const isAuthCall=String(config.url??'').includes('/auth/');
  if(!isAuthCall){const token=await getValidCustomerAccessToken();if(token)config.headers.Authorization=`Bearer ${token}`;}
  return config;
});
customerApi.interceptors.response.use(response=>response,async(error)=>{
  const original=error?.config as any;
  const isAuthCall=String(original?.url??'').includes('/auth/');
  if(error?.response?.status===401&&original&&!original._customerRetried&&!isAuthCall){
    original._customerRetried=true;
    const token=await getValidCustomerAccessToken(true);
    if(token){original.headers={...(original.headers??{}),Authorization:`Bearer ${token}`};return customerApi.request(original);}
  }
  return Promise.reject(error);
});
const root = '/v1/mobile/apps/pizza-getto';
const formatSchedule = (start?: string, end?: string) => {
  const time = (value?: string) => { if (!value) return ''; const [h, m] = value.split(':').map(Number); return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  return start && end ? `${time(start)}–${time(end)}` : start ? `Desde ${time(start)}` : end ? `Hasta ${time(end)}` : 'Disponible ahora';
};

export const requestPhoneOtp = async (phone: string, linkToken?: string) => (await customerApi.post(`${root}/auth/otp/request`, { phone, link_token: linkToken })).data.data;
export const verifyPhoneOtp = async (challengeId: string, code: string, name?: string, linkToken?: string): Promise<CustomerSession> => {
  const { data } = await customerApi.post(`${root}/auth/otp/verify`, { challenge_id: challengeId, code, name, link_token: linkToken, device: { platform: 'mobile', app_version: '1.0.0' } });
  return { accessToken: data.data.access_token, refreshToken: data.data.refresh_token, profile: data.data.profile };
};
export const signInWithProviderToken = async (provider: 'google' | 'apple', idToken: string, name?: string): Promise<CustomerSession | { needsPhone: true; linkToken: string }> => {
  const { data } = await customerApi.post(`${root}/auth/social`, { provider, id_token: idToken, name });
  if (data.data.needs_phone) return { needsPhone: true, linkToken: data.data.link_token };
  return { accessToken: data.data.access_token, refreshToken: data.data.refresh_token, profile: data.data.profile };
};
export const getCustomerHome = async () => {
  const payload = (await customerApi.get(`${root}/me`)).data.data;
  return { ...payload, addresses: (payload.addresses ?? []).map((address: any) => ({
    ...address,
    delivery_schedule_label: formatSchedule(address.detected_zone_active_from, address.detected_zone_active_until),
  })) };
};

export type DeliveryAddress = {
  id: string; label: string; street: string; reference?: string;
  complement?: string; neighborhood?: string; district?: string;
  province?: string; notes?: string; is_default: boolean;
  latitude?: number; longitude?: number;
  detected_zone_id?: number; detected_location_id?: number;
  effective_location_id?: number; effective_location_name?: string;
  detected_zone_name?: string; detected_zone_price?: number;
  delivery_open_now?: boolean; delivery_schedule_label?: string;
};
export type AddressInput = Omit<DeliveryAddress, 'id'> & { latitude: number; longitude: number };

export const createAddress = async (body: AddressInput): Promise<DeliveryAddress> =>
  (await customerApi.post(`${root}/me/addresses`, body)).data.data;

export const updateAddress = async (id: string, body: AddressInput): Promise<DeliveryAddress> =>
  (await customerApi.put(`${root}/me/addresses/${id}`, body)).data.data;

export const deleteAddress = async (id: string): Promise<void> => {
  await customerApi.delete(`${root}/me/addresses/${id}`);
};

export type DeliveryZone = {
  id: number; locationId: number; locationName: string; name: string; price: number;
  color?: string; polygon: { latitude: number; longitude: number }[];
};

export const getAddressMapConfig = async (): Promise<{ zones: DeliveryZone[] }> => {
  const response = await customerApi.get(`${root}/bootstrap`);
  const locations = response.data?.data?.locations ?? [];
  return {
    zones: locations.flatMap((location: any) => (location.delivery_zones ?? []).map((zone: any) => ({
      id: Number(zone.id), locationId: Number(location.id), locationName: String(location.name ?? ''),
      name: String(zone.name ?? ''), price: Number(zone.price ?? 0), color: zone.color || undefined,
      polygon: (Array.isArray(zone.polygon) ? zone.polygon : []).map((point: any) => ({
        latitude: Number(point.lat), longitude: Number(point.lng),
      })).filter((point: any) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)),
    }))),
  };
};

export const detectAddressCoverage = async (latitude: number, longitude: number) =>
  (await customerApi.post(`${root}/me/addresses/coverage`, { latitude, longitude })).data.data as {
    within_coverage: boolean; zone_id?: number; zone_name?: string; zone_price?: number;
    location_id?: number; location_name?: string;
    available_now?: boolean; schedule_label?: string;
  };

export const getOrderDetail = async (id: number): Promise<any> =>
  (await customerApi.get(`${root}/orders/${id}`)).data.data;

export const redeemLoyaltyReward = async (rewardId: number): Promise<any> =>
  (await customerApi.post(`${root}/me/loyalty/rewards/${rewardId}/redeem`)).data.data;

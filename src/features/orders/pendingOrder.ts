import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { appConfig } from '@/shared/config';
import { getValidCustomerAccessToken } from '@/features/auth/store';

const KEY='pizza-getto-pending-order-v1';
export type PendingOrder={idempotencyKey:string;payload:any;branchName:string;mode:'delivery'|'pickup';createdAt:string};
export const savePendingOrder=(value:PendingOrder)=>SecureStore.setItemAsync(KEY,JSON.stringify(value),{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});
export const clearPendingOrder=()=>SecureStore.deleteItemAsync(KEY);
export async function getPendingOrder():Promise<PendingOrder|null>{try{const raw=await SecureStore.getItemAsync(KEY);return raw?JSON.parse(raw):null}catch{return null}}
export async function queryPendingOrder(value:PendingOrder){const token=await getValidCustomerAccessToken();if(!token)return null;const response=await axios.get(`${appConfig.apiBaseUrl}/v1/mobile/apps/pizza-getto/orders/requests/${encodeURIComponent(value.idempotencyKey)}`,{headers:{Authorization:`Bearer ${token}`},timeout:12_000});return response.data?.data;}
export async function submitPendingOrder(value:PendingOrder,forceRefresh=false){const token=await getValidCustomerAccessToken(forceRefresh);if(!token)throw new Error('Inicia sesión para ordenar');return axios.post(`${appConfig.apiBaseUrl}/v1/mobile/apps/pizza-getto/orders`,value.payload,{headers:{Authorization:`Bearer ${token}`,'Idempotency-Key':value.idempotencyKey},timeout:20_000});}

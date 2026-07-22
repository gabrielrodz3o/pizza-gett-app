import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { appConfig } from '@/shared/config';

const KEY = 'pizza-getto-customer-session-v2';
const LEGACY_KEY = 'pizza-getto-customer-session';
const BASE_URL = appConfig.apiBaseUrl;
const REFRESH_AHEAD_MS = 2 * 60_000;

export type CustomerProfile = { id: number; name: string; phone?: string; email?: string; avatarUrl?: string };
export type CustomerSession = { accessToken: string; refreshToken: string; profile: CustomerProfile };
type RefreshResult = { kind: 'success'; session: CustomerSession } | { kind: 'invalid' } | { kind: 'transient' };

function decodeJwt(token: string): any {
  try {
    const value=token.split('.')[1]?.replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(value));
  } catch { return null; }
}
const jwtExpiresAt=(token:string)=>Number(decodeJwt(token)?.exp||0)*1000;
const validSession=(value:any):value is CustomerSession=>Boolean(value&&typeof value.accessToken==='string'&&typeof value.refreshToken==='string'&&value.profile&&Number(value.profile.id)>0);

async function persist(session:CustomerSession){
  await SecureStore.setItemAsync(KEY,JSON.stringify(session),{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY});
}
async function removePersisted(){await Promise.all([SecureStore.deleteItemAsync(KEY),SecureStore.deleteItemAsync(LEGACY_KEY)]);}

async function requestRefresh(current:CustomerSession):Promise<RefreshResult>{
  try{
    const response=await fetch(`${BASE_URL}/v1/mobile/apps/pizza-getto/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:current.refreshToken})});
    if(response.status===400||response.status===401||response.status===403) return {kind:'invalid'};
    if(!response.ok) return {kind:'transient'};
    const payload=await response.json(),data=payload?.data;
    if(!data?.access_token||!data?.refresh_token) return {kind:'transient'};
    let profile=current.profile;
    try{
      const meResponse=await fetch(`${BASE_URL}/v1/mobile/apps/pizza-getto/me`,{headers:{Authorization:`Bearer ${data.access_token}`}});
      if(meResponse.ok) profile=(await meResponse.json())?.data?.profile??profile;
    }catch{/* El perfil almacenado sigue siendo válido si /me está temporalmente caído. */}
    return {kind:'success',session:{accessToken:data.access_token,refreshToken:data.refresh_token,profile}};
  }catch{return {kind:'transient'};}
}

let refreshPromise:Promise<CustomerSession|null>|null=null;

type AuthState={
  ready:boolean; session:CustomerSession|null;
  restore:()=>Promise<void>; signIn:(session:CustomerSession)=>Promise<void>; signOut:()=>Promise<void>;
  refreshSession:(force?:boolean)=>Promise<CustomerSession|null>;
};

export const useCustomerAuth=create<AuthState>((set,get)=>({
  ready:false,session:null,
  restore:async()=>{
    try{
      const raw=await SecureStore.getItemAsync(KEY)??await SecureStore.getItemAsync(LEGACY_KEY);
      if(!raw){set({session:null,ready:true});return;}
      const stored=JSON.parse(raw);
      if(!validSession(stored)){await removePersisted();set({session:null,ready:true});return;}
      // Mostrar inmediatamente la sesión persistida; una caída de red nunca debe sacar al cliente.
      set({session:stored,ready:true});
      if(raw===await SecureStore.getItemAsync(LEGACY_KEY)){await persist(stored);await SecureStore.deleteItemAsync(LEGACY_KEY);}
      if(Date.now()>=jwtExpiresAt(stored.accessToken)-REFRESH_AHEAD_MS) await get().refreshSession(true);
    }catch{set({ready:true});}
  },
  signIn:async(session)=>{if(!validSession(session))throw new Error('Sesión inválida');await persist(session);await SecureStore.deleteItemAsync(LEGACY_KEY);set({session,ready:true});},
  refreshSession:async(force=false)=>{
    const current=get().session;if(!current)return null;
    if(!force&&Date.now()<jwtExpiresAt(current.accessToken)-REFRESH_AHEAD_MS)return current;
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      const result=await requestRefresh(current);
      if(result.kind==='success'){
        // Persistir primero: una interrupción nunca deja memoria y disco con tokens rotados distintos.
        await persist(result.session);set({session:result.session,ready:true});return result.session;
      }
      if(result.kind==='invalid'){
        // Solo una confirmación 400/401/403 del endpoint refresh autoriza borrar la sesión.
        await removePersisted();set({session:null,ready:true});return null;
      }
      return get().session; // red, timeout o 5xx: conservar la sesión y reintentar más tarde.
    })().finally(()=>{refreshPromise=null;});
    return refreshPromise;
  },
  signOut:async()=>{
    const current=get().session;set({session:null,ready:true});await removePersisted();
    if(current?.refreshToken)fetch(`${BASE_URL}/v1/mobile/apps/pizza-getto/auth/logout`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:current.refreshToken})}).catch(()=>undefined);
  },
}));

export async function getValidCustomerAccessToken(forceRefresh=false){
  const state=useCustomerAuth.getState(),session=await state.refreshSession(forceRefresh);
  return session?.accessToken??null;
}

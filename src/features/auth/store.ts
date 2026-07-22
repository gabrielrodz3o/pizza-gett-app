import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY = 'pizza-getto-customer-session';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export type CustomerProfile = { id: number; name: string; phone?: string; email?: string; avatarUrl?: string };
export type CustomerSession = { accessToken: string; refreshToken: string; profile: CustomerProfile };

/** JWT expiry without verifying signature — just read the `exp` claim */
function jwtExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

async function doRefresh(refreshToken: string): Promise<CustomerSession | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/mobile/apps/pizza-getto/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    // We need the profile — decode from the new access token
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    // Fetch profile from /me with new token
    const meRes = await fetch(`${BASE_URL}/v1/mobile/apps/pizza-getto/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = meRes.ok ? (await meRes.json()).data : null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      profile: me?.profile ?? { id: payload.entity_id, name: 'Cliente' },
    };
  } catch {
    return null;
  }
}

type AuthState = {
  ready: boolean;
  session: CustomerSession | null;
  restore: () => Promise<void>;
  signIn: (session: CustomerSession) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useCustomerAuth = create<AuthState>((set, get) => ({
  ready: false,
  session: null,

  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) { set({ session: null, ready: true }); return; }
      const session: CustomerSession = JSON.parse(raw);
      const expiresAt = jwtExpiresAt(session.accessToken);
      const needsRefresh = Date.now() > expiresAt - 60_000; // refresh if < 60s left
      if (needsRefresh) {
        const refreshed = await doRefresh(session.refreshToken);
        if (refreshed) {
          await SecureStore.setItemAsync(KEY, JSON.stringify(refreshed));
          set({ session: refreshed, ready: true });
        } else {
          // Refresh token also expired — sign out silently
          await SecureStore.deleteItemAsync(KEY);
          set({ session: null, ready: true });
        }
      } else {
        set({ session, ready: true });
      }
    } catch {
      set({ session: null, ready: true });
    }
  },

  signIn: async (session) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    set({ session });
  },

  signOut: async () => {
    const { session } = get();
    // Best-effort server-side revocation
    if (session?.refreshToken) {
      fetch(`${BASE_URL}/v1/mobile/apps/pizza-getto/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      }).catch(() => {});
    }
    await SecureStore.deleteItemAsync(KEY);
    set({ session: null });
  },
}));

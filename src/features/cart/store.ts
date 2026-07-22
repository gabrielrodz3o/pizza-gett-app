import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CartLine, Product, SelectedSide } from '@/shared/types';

type State = {
  branchId: number | null; serviceMode: 'delivery' | 'pickup' | null; selectedAddressId: string | null; cart: CartLine[]; favorites: number[];
  chooseBranch: (id: number) => void; add: (p: Product, options?: { selectedSides?: SelectedSide[]; note?: string; quantity?: number }) => void;
  chooseService: (mode: 'delivery' | 'pickup', branchId: number, addressId?: string | null) => void;
  resetService: () => void;
  addCombo: (lines: CartLine[]) => void;
  updateLine: (lineId: string, options: { selectedSides: SelectedSide[]; note?: string; quantity: number }) => void;
  increment: (lineId: string) => void; decrement: (lineId: string) => void; clear: () => void; toggleFavorite: (id: number) => void;
};
export const useShop = create<State>()(persist((set) => ({
  branchId: null, serviceMode: null, selectedAddressId: null, cart: [], favorites: [],
  chooseBranch: (branchId) => set({ branchId }),
  chooseService: (serviceMode, branchId, selectedAddressId = null) => set({ serviceMode, branchId, selectedAddressId }),
  resetService: () => set({ serviceMode: null, branchId: null, selectedAddressId: null }),
  add: (p, options = {}) => set((s) => {
    const selectedSides = options.selectedSides ?? [];
    const sideTotal = selectedSides.reduce((sum, side) => sum + side.price * side.quantity, 0);
    const quantity = Math.max(1, options.quantity ?? 1);
    const customizable = selectedSides.length > 0 || (p.sidesCategories?.length ?? 0) > 0 || !!options.note;
    const found = customizable ? undefined : s.cart.find((x) => x.id === p.id && x.selectedSides.length === 0);
    if (found) return { cart: s.cart.map((x) => x.lineId === found.lineId ? { ...x, quantity: x.quantity + quantity } : x) };
    const lineId = `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return { cart: [...s.cart, { ...p, lineId, size: 'Única', quantity, note: options.note, selectedSides, unitTotal: p.price + sideTotal }] };
  }),
  addCombo: (lines) => set((s) => ({ cart: [...s.cart, ...lines] })),
  updateLine: (lineId, options) => set((s) => ({
    cart: s.cart.map((x) => {
      if (x.lineId !== lineId || x.comboGroupId) return x;
      const selectedSides = options.selectedSides ?? [];
      const sideTotal = selectedSides.reduce((sum, side) => sum + side.price * side.quantity, 0);
      return { ...x, selectedSides, note: options.note, quantity: Math.max(1, options.quantity || 1), unitTotal: x.price + sideTotal };
    }),
  })),
  increment: (lineId) => set((s) => {
    const target = s.cart.find((x) => x.lineId === lineId); const group = target?.comboGroupId;
    if (group) return { cart: s.cart };
    return { cart: s.cart.map((x) => x.lineId === lineId ? { ...x, quantity: x.quantity + 1 } : x) };
  }),
  decrement: (lineId) => set((s) => {
    const target = s.cart.find((x) => x.lineId === lineId); const group = target?.comboGroupId;
    if (group) return { cart: s.cart.filter((x) => x.comboGroupId !== group) };
    return { cart: s.cart.flatMap((x) => x.lineId !== lineId ? [x] : x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []) };
  }),
  clear: () => set({ cart: [] }),
  toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })),
}), { name: 'pizza-getto-shop-real-v3', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ branchId: s.branchId, serviceMode: s.serviceMode, selectedAddressId: s.selectedAddressId, cart: s.cart, favorites: s.favorites }) }));

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ----------------------------- Types ----------------------------- */

/** Structurally compatible with MenuItem in RestaurantDetails. */
export interface CartItem {
   id: string;
   name: string;
   description: string;
   price: number;
   image?: string;
   vegetarian?: boolean;
   spicy?: boolean;
}

export interface CartLine {
   item: CartItem;
   qty: number;
   note: string;
}

export interface CartRestaurant {
   id: string;
   name: string;
   image: string;
   deliveryFee: number;
   deliveryMinutes: number;
   minOrder: number;
}

interface CartState {
   restaurant: CartRestaurant | null;
   lines: Record<string, CartLine>;

   /**
    * Set an item's quantity (0 removes it).
    * Returns false, without changing anything, if the cart holds items from a
    * different restaurant. Ask the user, then call clear() and try again.
    */
   setQty: (restaurant: CartRestaurant, item: CartItem, qty: number, note?: string) => boolean;
   setNote: (itemId: string, note: string) => void;
   removeItem: (itemId: string) => void;
   clear: () => void;
}

/* ------------------------------ Store ------------------------------ */

export const useCartStore = create<CartState>()(
   persist(
      (set, get) => ({
         restaurant: null,
         lines: {},

         setQty: (restaurant, item, qty, note) => {
            const { restaurant: current, lines } = get();
            if (current && current.id !== restaurant.id && Object.keys(lines).length > 0) return false;

            const next = { ...lines };
            if (qty <= 0) delete next[item.id];
            else next[item.id] = { item, qty, note: note ?? lines[item.id]?.note ?? "" };

            set({ lines: next, restaurant: Object.keys(next).length ? restaurant : null });
            return true;
         },

         setNote: (itemId, note) =>
            set((s) => (s.lines[itemId] ? { lines: { ...s.lines, [itemId]: { ...s.lines[itemId], note } } } : s)),

         removeItem: (itemId) =>
            set((s) => {
               const next = { ...s.lines };
               delete next[itemId];
               return { lines: next, restaurant: Object.keys(next).length ? s.restaurant : null };
            }),

         clear: () => set({ lines: {}, restaurant: null }),
      }),
      {
         name: "cart:v1",
         storage: createJSONStorage(() => AsyncStorage),
         partialize: (s) => ({ restaurant: s.restaurant, lines: s.lines }),
      }
   )
);

/* --------------------------- Selectors --------------------------- */

// Select primitives only. For the list, read `s.lines` and derive with useMemo.
export const selectItemCount = (s: CartState) => Object.values(s.lines).reduce((n, l) => n + l.qty, 0);
export const selectSubtotal = (s: CartState) =>
   Object.values(s.lines).reduce((sum, l) => sum + l.qty * l.item.price, 0);
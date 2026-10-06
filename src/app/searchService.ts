import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { RestaurantSummary } from "./restaurant-details";

/* ----------------------------- Types ----------------------------- */

export type SortKey = "relevance" | "rating" | "deliveryTime" | "priceLow";

export interface SearchFilters {
   sort: SortKey;
   openNow: boolean;
   freeDelivery: boolean;
   minRating: number; // 0 = any
   maxPriceLevel: 1 | 2 | 3 | 4;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
   sort: "relevance",
   openNow: false,
   freeDelivery: false,
   minRating: 0,
   maxPriceLevel: 4,
};

export type Suggestion =
   | { type: "restaurant"; label: string; restaurant: RestaurantSummary }
   | { type: "cuisine"; label: string }
   | { type: "dish"; label: string };

export const POPULAR_CUISINES = [
   { label: "Pizza", emoji: "🍕" },
   { label: "Burgers", emoji: "🍔" },
   { label: "Sushi", emoji: "🍣" },
   { label: "Indian", emoji: "🍛" },
   { label: "Mexican", emoji: "🌮" },
   { label: "Healthy", emoji: "🥗" },
   { label: "Dessert", emoji: "🍰" },
   { label: "Coffee", emoji: "☕" },
];

export const TRENDING = ["Spicy ramen", "Vegan bowls", "Late night", "Free delivery", "Margherita"];

/* --------------------- Data layer (replace me) --------------------- */

const DB: (RestaurantSummary & { dishes: string[] })[] = [
   { id: "1", name: "Napoli Fire", cuisine: "Pizza", image: "https://picsum.photos/seed/pizza/600/400", rating: 4.7, reviewCount: 812, deliveryMinutes: 25, deliveryFee: 0, priceLevel: 2, distanceKm: 1.2, isOpen: true, promo: "20% off first order", dishes: ["Margherita", "Diavola", "Garlic knots"] },
   { id: "2", name: "Smash Shack", cuisine: "Burgers", image: "https://picsum.photos/seed/burger/600/400", rating: 4.4, reviewCount: 530, deliveryMinutes: 20, deliveryFee: 1.99, priceLevel: 1, distanceKm: 0.8, isOpen: true, dishes: ["Smash burger", "Fries", "Milkshake"] },
   { id: "3", name: "Kaito Sushi", cuisine: "Sushi", image: "https://picsum.photos/seed/sushi/600/400", rating: 4.9, reviewCount: 240, deliveryMinutes: 40, deliveryFee: 3.5, priceLevel: 4, distanceKm: 3.4, isOpen: true, dishes: ["Salmon nigiri", "Spicy ramen", "Dragon roll"] },
   { id: "4", name: "Masala Route", cuisine: "Indian", image: "https://picsum.photos/seed/indian/600/400", rating: 4.5, reviewCount: 678, deliveryMinutes: 35, deliveryFee: 0, priceLevel: 2, distanceKm: 2.1, isOpen: false, dishes: ["Butter chicken", "Biryani", "Naan"] },
   { id: "5", name: "Casa Taco", cuisine: "Mexican", image: "https://picsum.photos/seed/taco/600/400", rating: 4.2, reviewCount: 301, deliveryMinutes: 30, deliveryFee: 2.49, priceLevel: 1, distanceKm: 1.9, isOpen: true, promo: "Free drink over $20", dishes: ["Al pastor tacos", "Burrito", "Churros"] },
   { id: "6", name: "Green Bowl", cuisine: "Healthy", image: "https://picsum.photos/seed/salad/600/400", rating: 4.6, reviewCount: 410, deliveryMinutes: 22, deliveryFee: 0.99, priceLevel: 2, distanceKm: 1.0, isOpen: true, dishes: ["Vegan bowls", "Smoothie", "Quinoa salad"] },
   { id: "7", name: "Sugar Lab", cuisine: "Dessert", image: "https://picsum.photos/seed/dessert/600/400", rating: 4.8, reviewCount: 155, deliveryMinutes: 28, deliveryFee: 1.5, priceLevel: 3, distanceKm: 2.7, isOpen: true, dishes: ["Cheesecake", "Gelato", "Brownie"] },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => s.trim().toLowerCase();

/** Swap with e.g. fetch(`/search/suggestions?q=${q}`) */
export async function fetchSuggestions(q: string): Promise<Suggestion[]> {
   await wait(150);
   const n = norm(q);
   if (!n) return [];
   const out: Suggestion[] = [];

   DB.filter((r) => norm(r.name).includes(n))
      .slice(0, 3)
      .forEach((r) => out.push({ type: "restaurant", label: r.name, restaurant: r }));

   Array.from(new Set(DB.map((r) => r.cuisine)))
      .filter((c) => norm(c).includes(n))
      .forEach((c) => out.push({ type: "cuisine", label: c }));

   Array.from(new Set(DB.flatMap((r) => r.dishes)))
      .filter((d) => norm(d).includes(n))
      .slice(0, 3)
      .forEach((d) => out.push({ type: "dish", label: d }));

   return out;
}

const PAGE_SIZE = 4;

/** Swap with e.g. fetch(`/search?q=${q}&sort=${filters.sort}&page=${page}`) */
export async function searchRestaurants(
   q: string,
   filters: SearchFilters,
   page: number
): Promise<{ items: RestaurantSummary[]; hasMore: boolean }> {
   await wait(600);
   const n = norm(q);
   let list = DB.filter(
      (r) =>
         norm(r.name).includes(n) ||
         norm(r.cuisine).includes(n) ||
         r.dishes.some((d) => norm(d).includes(n))
   ).filter(
      (r) =>
         r.rating >= filters.minRating &&
         r.priceLevel <= filters.maxPriceLevel &&
         (!filters.openNow || r.isOpen) &&
         (!filters.freeDelivery || r.deliveryFee === 0)
   );

   const sorters: Record<SortKey, ((a: RestaurantSummary, b: RestaurantSummary) => number) | null> = {
      relevance: null,
      rating: (a, b) => b.rating - a.rating,
      deliveryTime: (a, b) => a.deliveryMinutes - b.deliveryMinutes,
      priceLow: (a, b) => a.priceLevel - b.priceLevel,
   };
   const s = sorters[filters.sort];
   if (s) list = [...list].sort(s);

   const start = page * PAGE_SIZE;
   return {
      items: list.slice(start, start + PAGE_SIZE).map(({ dishes: _d, ...r }) => r),
      hasMore: start + PAGE_SIZE < list.length,
   };
}

/* ------------------------ Recent searches ------------------------ */

const RECENT_KEY = "search:recent";
const MAX_RECENT = 8;

export function useRecentSearches() {
   const [recent, setRecent] = useState<string[]>([]);

   useEffect(() => {
      AsyncStorage.getItem(RECENT_KEY)
         .then((v) => v && setRecent(JSON.parse(v)))
         .catch(() => { });
   }, []);

   const persist = useCallback((next: string[]) => {
      setRecent(next);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => { });
   }, []);

   const add = useCallback(
      (term: string) => {
         const t = term.trim();
         if (!t) return;
         persist([t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT));
      },
      [recent, persist]
   );

   const remove = useCallback((term: string) => persist(recent.filter((r) => r !== term)), [recent, persist]);
   const clear = useCallback(() => persist([]), [persist]);

   return { recent, add, remove, clear };
}

export function useDebounce<T>(value: T, delay = 250): T {
   const [v, setV] = useState(value);
   useEffect(() => {
      const t = setTimeout(() => setV(value), delay);
      return () => clearTimeout(t);
   }, [value, delay]);
   return v;
}
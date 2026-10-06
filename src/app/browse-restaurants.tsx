import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ----------------------------- Types ----------------------------- */

type SortKey = "recommended" | "rating" | "deliveryTime" | "priceLow";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  image: string;
  rating: number;
  reviewCount: number;
  deliveryMinutes: number;
  deliveryFee: number;
  priceLevel: 1 | 2 | 3 | 4;
  distanceKm: number;
  isOpen: boolean;
  promo?: string;
}

interface Filters {
  sort: SortKey;
  minRating: number; // 0 = any
  maxPriceLevel: 1 | 2 | 3 | 4;
  openNow: boolean;
  freeDelivery: boolean;
}

const DEFAULT_FILTERS: Filters = {
  sort: "recommended",
  minRating: 0,
  maxPriceLevel: 4,
  openNow: false,
  freeDelivery: false,
};

const CUISINES = ["All", "Pizza", "Burgers", "Sushi", "Indian", "Mexican", "Healthy", "Dessert"];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "rating", label: "Top rated" },
  { key: "deliveryTime", label: "Fastest delivery" },
  { key: "priceLow", label: "Price: low to high" },
];

/* --------------------- Data layer (replace me) --------------------- */

const MOCK: Restaurant[] = [
  { id: "1", name: "Napoli Fire", cuisine: "Pizza", image: "https://picsum.photos/seed/pizza/600/400", rating: 4.7, reviewCount: 812, deliveryMinutes: 25, deliveryFee: 0, priceLevel: 2, distanceKm: 1.2, isOpen: true, promo: "20% off first order" },
  { id: "2", name: "Smash Shack", cuisine: "Burgers", image: "https://picsum.photos/seed/burger/600/400", rating: 4.4, reviewCount: 530, deliveryMinutes: 20, deliveryFee: 1.99, priceLevel: 1, distanceKm: 0.8, isOpen: true },
  { id: "3", name: "Kaito Sushi", cuisine: "Sushi", image: "https://picsum.photos/seed/sushi/600/400", rating: 4.9, reviewCount: 240, deliveryMinutes: 40, deliveryFee: 3.5, priceLevel: 4, distanceKm: 3.4, isOpen: true },
  { id: "4", name: "Masala Route", cuisine: "Indian", image: "https://picsum.photos/seed/indian/600/400", rating: 4.5, reviewCount: 678, deliveryMinutes: 35, deliveryFee: 0, priceLevel: 2, distanceKm: 2.1, isOpen: false },
  { id: "5", name: "Casa Taco", cuisine: "Mexican", image: "https://picsum.photos/seed/taco/600/400", rating: 4.2, reviewCount: 301, deliveryMinutes: 30, deliveryFee: 2.49, priceLevel: 1, distanceKm: 1.9, isOpen: true, promo: "Free drink over $20" },
  { id: "6", name: "Green Bowl", cuisine: "Healthy", image: "https://picsum.photos/seed/salad/600/400", rating: 4.6, reviewCount: 410, deliveryMinutes: 22, deliveryFee: 0.99, priceLevel: 2, distanceKm: 1.0, isOpen: true },
  { id: "7", name: "Sugar Lab", cuisine: "Dessert", image: "https://picsum.photos/seed/dessert/600/400", rating: 4.8, reviewCount: 155, deliveryMinutes: 28, deliveryFee: 1.5, priceLevel: 3, distanceKm: 2.7, isOpen: true },
];

const PAGE_SIZE = 5;

/** Swap with a real API call, e.g. fetch(`/restaurants?page=${page}&q=${query}`) */
async function fetchRestaurants(page: number): Promise<{ items: Restaurant[]; hasMore: boolean }> {
  await new Promise((r) => setTimeout(r, 700));
  const start = page * PAGE_SIZE;
  const items = MOCK.slice(start, start + PAGE_SIZE);
  return { items, hasMore: start + PAGE_SIZE < MOCK.length };
}

/* --------------------------- Utilities ---------------------------- */

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const priceLabel = (n: number) => "$".repeat(n);

/* ------------------------- Small components ------------------------ */

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    className={`mr-2 rounded-full border px-4 py-2 ${
      active ? "border-orange-500 bg-orange-500" : "border-neutral-300 bg-white"
    }`}
  >
    <Text className={`text-sm font-medium ${active ? "text-white" : "text-neutral-700"}`}>
      {label}
    </Text>
  </Pressable>
);

const RestaurantCard = ({
  item,
  favorite,
  onToggleFavorite,
  onPress,
}: {
  item: Restaurant;
  favorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${item.name}, ${item.cuisine}, rated ${item.rating}`}
    className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm active:opacity-90"
  >
    <View>
      <Image
        source={{ uri: item.image }}
        className={`h-44 w-full ${item.isOpen ? "" : "opacity-50"}`}
        resizeMode="cover"
      />
      {item.promo && item.isOpen && (
        <View className="absolute left-3 top-3 rounded-md bg-orange-500 px-2 py-1">
          <Text className="text-xs font-semibold text-white">{item.promo}</Text>
        </View>
      )}
      {!item.isOpen && (
        <View className="absolute left-3 top-3 rounded-md bg-neutral-800 px-2 py-1">
          <Text className="text-xs font-semibold text-white">Closed</Text>
        </View>
      )}
      <Pressable
        onPress={onToggleFavorite}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white"
      >
        <Text className="text-lg">{favorite ? "❤️" : "🤍"}</Text>
      </Pressable>
    </View>

    <View className="p-3">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-lg font-bold text-neutral-900" numberOfLines={1}>
          {item.name}
        </Text>
        <View className="flex-row items-center rounded-md bg-green-100 px-2 py-0.5">
          <Text className="text-sm font-semibold text-green-800">★ {item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text className="mt-1 text-sm text-neutral-500">
        {item.cuisine} • {priceLabel(item.priceLevel)} • {item.reviewCount} reviews
      </Text>
      <View className="mt-2 flex-row items-center">
        <Text className="text-sm text-neutral-700">🕒 {item.deliveryMinutes} min</Text>
        <Text className="mx-2 text-neutral-300">|</Text>
        <Text className="text-sm text-neutral-700">
          {item.deliveryFee === 0 ? "Free delivery" : `$${item.deliveryFee.toFixed(2)} delivery`}
        </Text>
        <Text className="mx-2 text-neutral-300">|</Text>
        <Text className="text-sm text-neutral-700">{item.distanceKm} km</Text>
      </View>
    </View>
  </Pressable>
);

const SkeletonCard = () => (
  <View className="mb-5 overflow-hidden rounded-2xl bg-white">
    <View className="h-44 w-full bg-neutral-200" />
    <View className="p-3">
      <View className="h-5 w-2/3 rounded bg-neutral-200" />
      <View className="mt-2 h-4 w-1/2 rounded bg-neutral-200" />
      <View className="mt-3 h-4 w-3/4 rounded bg-neutral-200" />
    </View>
  </View>
);

/* ---------------------------- Filter sheet ---------------------------- */

const FilterSheet = ({
  visible,
  filters,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: Filters;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) => {
  const [draft, setDraft] = useState<Filters>(filters);
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="flex-row items-center justify-between py-3"
    >
      <Text className="text-base text-neutral-800">{label}</Text>
      <View className={`h-6 w-11 rounded-full p-0.5 ${value ? "bg-orange-500" : "bg-neutral-300"}`}>
        <View className={`h-5 w-5 rounded-full bg-white ${value ? "ml-5" : "ml-0"}`} />
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="max-h-[80%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-neutral-900">Filters</Text>
          <Pressable onPress={() => setDraft(DEFAULT_FILTERS)}>
            <Text className="font-semibold text-orange-600">Reset</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="mb-2 font-semibold text-neutral-900">Sort by</Text>
          <View className="flex-row flex-wrap">
            {SORT_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                label={o.label}
                active={draft.sort === o.key}
                onPress={() => setDraft({ ...draft, sort: o.key })}
              />
            ))}
          </View>

          <Text className="mb-2 mt-5 font-semibold text-neutral-900">Minimum rating</Text>
          <View className="flex-row">
            {[0, 3.5, 4, 4.5].map((r) => (
              <Chip
                key={r}
                label={r === 0 ? "Any" : `${r}+`}
                active={draft.minRating === r}
                onPress={() => setDraft({ ...draft, minRating: r })}
              />
            ))}
          </View>

          <Text className="mb-2 mt-5 font-semibold text-neutral-900">Max price</Text>
          <View className="flex-row">
            {([1, 2, 3, 4] as const).map((p) => (
              <Chip
                key={p}
                label={priceLabel(p)}
                active={draft.maxPriceLevel === p}
                onPress={() => setDraft({ ...draft, maxPriceLevel: p })}
              />
            ))}
          </View>

          <View className="mt-4 border-t border-neutral-100">
            <Toggle label="Open now" value={draft.openNow} onChange={(v) => setDraft({ ...draft, openNow: v })} />
            <Toggle label="Free delivery" value={draft.freeDelivery} onChange={(v) => setDraft({ ...draft, freeDelivery: v })} />
          </View>
        </ScrollView>

        <Pressable
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          className="mt-4 items-center rounded-xl bg-orange-500 py-4 active:bg-orange-600"
        >
          <Text className="text-base font-bold text-white">Show results</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

/* ----------------------------- Screen ----------------------------- */

export default function BrowseRestaurants({
  onSelectRestaurant,
}: {
  onSelectRestaurant?: (restaurant: Restaurant) => void;
}) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const [cuisine, setCuisine] = useState("All");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const load = useCallback(async (reset: boolean) => {
    try {
      setError(null);
      const nextPage = reset ? 0 : page + 1;
      const res = await fetchRestaurants(nextPage);
      setRestaurants((prev) => (reset ? res.items : [...prev, ...res.items]));
      setPage(nextPage);
      setHasMore(res.hasMore);
    } catch {
      setError("Couldn't load restaurants. Check your connection and try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const onEndReached = () => {
    if (loading || loadingMore || !hasMore || error) return;
    setLoadingMore(true);
    load(false);
  };

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const activeFilterCount =
    (filters.sort !== "recommended" ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.maxPriceLevel < 4 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.freeDelivery ? 1 : 0);

  const visible = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let list = restaurants.filter((r) => {
      if (cuisine !== "All" && r.cuisine !== cuisine) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.cuisine.toLowerCase().includes(q)) return false;
      if (r.rating < filters.minRating) return false;
      if (r.priceLevel > filters.maxPriceLevel) return false;
      if (filters.openNow && !r.isOpen) return false;
      if (filters.freeDelivery && r.deliveryFee > 0) return false;
      if (favoritesOnly && !favorites.has(r.id)) return false;
      return true;
    });

    const sorters: Record<SortKey, ((a: Restaurant, b: Restaurant) => number) | null> = {
      recommended: null,
      rating: (a, b) => b.rating - a.rating,
      deliveryTime: (a, b) => a.deliveryMinutes - b.deliveryMinutes,
      priceLow: (a, b) => a.priceLevel - b.priceLevel,
    };
    const sorter = sorters[filters.sort];
    if (sorter) list = [...list].sort(sorter);
    return list;
  }, [restaurants, debouncedQuery, cuisine, filters, favoritesOnly, favorites]);

  const clearAll = () => {
    setQuery("");
    setCuisine("All");
    setFilters(DEFAULT_FILTERS);
    setFavoritesOnly(false);
  };

  /* ---- Header (search + chips) ---- */
  const header = (
    <View className="pb-2">
      <View className="flex-row items-center">
        <View className="h-12 flex-1 flex-row items-center rounded-xl bg-white px-3">
          <Text className="mr-2 text-base">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search restaurants or cuisines"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 text-base text-neutral-900"
            accessibilityLabel="Search restaurants"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
              <Text className="text-neutral-400">✕</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          className="ml-2 h-12 w-12 items-center justify-center rounded-xl bg-white"
        >
          <Text className="text-lg">⚙️</Text>
          {activeFilterCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-orange-500">
              <Text className="text-xs font-bold text-white">{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
        <Chip label={favoritesOnly ? "❤️ Favorites" : "🤍 Favorites"} active={favoritesOnly} onPress={() => setFavoritesOnly((v) => !v)} />
        {CUISINES.map((c) => (
          <Chip key={c} label={c} active={cuisine === c} onPress={() => setCuisine(c)} />
        ))}
      </ScrollView>

      {!loading && (
        <Text className="mb-1 mt-4 text-sm text-neutral-500">
          {visible.length} {visible.length === 1 ? "restaurant" : "restaurants"} found
        </Text>
      )}
    </View>
  );

  /* ---- Empty / error states ---- */
  const empty = error ? (
    <View className="items-center px-6 py-16">
      <Text className="text-4xl">📡</Text>
      <Text className="mt-3 text-center text-base text-neutral-700">{error}</Text>
      <Pressable
        onPress={() => {
          setLoading(true);
          load(true);
        }}
        className="mt-4 rounded-xl bg-orange-500 px-6 py-3"
      >
        <Text className="font-bold text-white">Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View className="items-center px-6 py-16">
      <Text className="text-4xl">🍽️</Text>
      <Text className="mt-3 text-lg font-semibold text-neutral-800">No restaurants match</Text>
      <Text className="mt-1 text-center text-neutral-500">Try a different search or loosen your filters.</Text>
      <Pressable onPress={clearAll} className="mt-4 rounded-xl border border-orange-500 px-6 py-3">
        <Text className="font-bold text-orange-600">Clear all filters</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
      <View className="px-4 pb-1 pt-2">
        <Text className="text-sm text-neutral-500">Delivering to</Text>
        <Text className="text-2xl font-extrabold text-neutral-900">Browse restaurants</Text>
      </View>

      {loading ? (
        <View className="px-4 pt-2">
          {header}
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" color="#f97316" /> : null}
          contentContainerClassName="px-4 pb-10"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
          renderItem={({ item }) => (
            <RestaurantCard
              item={item}
              favorite={favorites.has(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              onPress={() => onSelectRestaurant?.(item)}
            />
          )}
        />
      )}

      <FilterSheet visible={filterOpen} filters={filters} onClose={() => setFilterOpen(false)} onApply={setFilters} />
    </SafeAreaView>
  );
}
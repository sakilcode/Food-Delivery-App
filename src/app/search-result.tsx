import { useCallback, useEffect, useRef, useState } from "react";
import {
   ActivityIndicator,
   FlatList,
   Image,
   Modal,
   Pressable,
   RefreshControl,
   ScrollView,
   Text,
   View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RestaurantSummary } from "./RestaurantDetails";
import {
   DEFAULT_SEARCH_FILTERS,
   SearchFilters,
   SortKey,
   TRENDING,
   searchRestaurants,
} from "./searchService";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
   { key: "relevance", label: "Relevance" },
   { key: "rating", label: "Top rated" },
   { key: "deliveryTime", label: "Fastest delivery" },
   { key: "priceLow", label: "Price: low to high" },
];

const priceLabel = (n: number) => "$".repeat(n);

/* ------------------------- Small components ------------------------ */

const FilterChip = ({
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
      className={`mr-2 rounded-full border px-4 py-2 ${active ? "border-orange-500 bg-orange-50" : "border-neutral-300 bg-white"
         }`}
   >
      <Text className={`text-sm font-medium ${active ? "text-orange-700" : "text-neutral-700"}`}>{label}</Text>
   </Pressable>
);

const ResultCard = ({ item, onPress }: { item: RestaurantSummary; onPress: () => void }) => (
   <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.cuisine}, rated ${item.rating}`}
      className="mb-3 flex-row overflow-hidden rounded-2xl bg-white p-3 active:opacity-90"
   >
      <View>
         <Image
            source={{ uri: item.image }}
            className={`h-28 w-28 rounded-xl bg-neutral-200 ${item.isOpen ? "" : "opacity-50"}`}
         />
         {!item.isOpen && (
            <View className="absolute bottom-2 left-2 rounded bg-neutral-800 px-1.5 py-0.5">
               <Text className="text-xs font-semibold text-white">Closed</Text>
            </View>
         )}
      </View>
      <View className="ml-3 flex-1 justify-between">
         <View>
            <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
               {item.name}
            </Text>
            <Text className="mt-0.5 text-sm text-neutral-500">
               {item.cuisine} • {priceLabel(item.priceLevel)} • {item.distanceKm} km
            </Text>
            <View className="mt-1.5 flex-row items-center">
               <View className="rounded bg-green-100 px-1.5 py-0.5">
                  <Text className="text-xs font-semibold text-green-800">★ {item.rating.toFixed(1)}</Text>
               </View>
               <Text className="ml-2 text-xs text-neutral-500">({item.reviewCount})</Text>
            </View>
         </View>
         <View>
            <Text className="text-sm text-neutral-700">
               🕒 {item.deliveryMinutes} min •{" "}
               {item.deliveryFee === 0 ? "Free delivery" : `$${item.deliveryFee.toFixed(2)} delivery`}
            </Text>
            {item.promo && item.isOpen && (
               <Text className="mt-1 text-xs font-semibold text-orange-600">🎉 {item.promo}</Text>
            )}
         </View>
      </View>
   </Pressable>
);

const SkeletonRow = () => (
   <View className="mb-3 flex-row rounded-2xl bg-white p-3">
      <View className="h-28 w-28 rounded-xl bg-neutral-200" />
      <View className="ml-3 flex-1">
         <View className="h-5 w-2/3 rounded bg-neutral-200" />
         <View className="mt-2 h-4 w-1/2 rounded bg-neutral-200" />
         <View className="mt-3 h-4 w-3/4 rounded bg-neutral-200" />
      </View>
   </View>
);

/* ----------------------------- Sort sheet ----------------------------- */

const SortSheet = ({
   visible,
   value,
   onClose,
   onSelect,
}: {
   visible: boolean;
   value: SortKey;
   onClose: () => void;
   onSelect: (k: SortKey) => void;
}) => (
   <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
         <Text className="mb-2 text-xl font-bold text-neutral-900">Sort by</Text>
         {SORT_OPTIONS.map((o) => (
            <Pressable
               key={o.key}
               onPress={() => {
                  onSelect(o.key);
                  onClose();
               }}
               accessibilityRole="radio"
               accessibilityState={{ checked: value === o.key }}
               className="flex-row items-center justify-between border-b border-neutral-100 py-4"
            >
               <Text className={`text-base ${value === o.key ? "font-bold text-orange-600" : "text-neutral-800"}`}>
                  {o.label}
               </Text>
               {value === o.key && <Text className="text-orange-600">✓</Text>}
            </Pressable>
         ))}
      </View>
   </Modal>
);

/* ----------------------------- Screen ----------------------------- */

export function SearchResult({
   query,
   onBack,
   onEditQuery,
   onSelectRestaurant,
   onSearchAgain,
}: {
   query: string;
   onBack?: () => void;
   /** Tapping the query pill: go back to SearchScreen with the query prefilled. */
   onEditQuery?: () => void;
   onSelectRestaurant?: (restaurant: RestaurantSummary) => void;
   /** Used by the "Try another search" suggestions in the empty state. */
   onSearchAgain?: (query: string) => void;
}) {
   const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
   const [results, setResults] = useState<RestaurantSummary[]>([]);
   const [page, setPage] = useState(0);
   const [hasMore, setHasMore] = useState(false);
   const [loading, setLoading] = useState(true);
   const [loadingMore, setLoadingMore] = useState(false);
   const [refreshing, setRefreshing] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [sortOpen, setSortOpen] = useState(false);

   // Guards against out-of-order responses when filters change quickly.
   const requestId = useRef(0);

   const load = useCallback(
      async (reset: boolean, nextPage = 0) => {
         const id = ++requestId.current;
         try {
            setError(null);
            const res = await searchRestaurants(query, filters, nextPage);
            if (id !== requestId.current) return;
            setResults((prev) => (reset ? res.items : [...prev, ...res.items]));
            setPage(nextPage);
            setHasMore(res.hasMore);
         } catch {
            if (id === requestId.current) setError("Couldn't load results. Check your connection and try again.");
         } finally {
            if (id === requestId.current) {
               setLoading(false);
               setLoadingMore(false);
               setRefreshing(false);
            }
         }
      },
      [query, filters]
   );

   // Reload from page 0 whenever the query or filters change.
   useEffect(() => {
      setLoading(true);
      load(true);
   }, [load]);

   const onEndReached = () => {
      if (loading || loadingMore || refreshing || !hasMore || error) return;
      setLoadingMore(true);
      load(false, page + 1);
   };

   const patch = (p: Partial<SearchFilters>) => setFilters((f) => ({ ...f, ...p }));
   const sortLabel = SORT_OPTIONS.find((o) => o.key === filters.sort)?.label ?? "Sort";
   const hasFilters =
      filters.openNow || filters.freeDelivery || filters.minRating > 0 || filters.maxPriceLevel < 4;

   const header = (
      <View>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-3">
            <FilterChip
               label={`⇅ ${sortLabel}`}
               active={filters.sort !== "relevance"}
               onPress={() => setSortOpen(true)}
            />
            <FilterChip label="Open now" active={filters.openNow} onPress={() => patch({ openNow: !filters.openNow })} />
            <FilterChip
               label="Free delivery"
               active={filters.freeDelivery}
               onPress={() => patch({ freeDelivery: !filters.freeDelivery })}
            />
            <FilterChip
               label="Rating 4.5+"
               active={filters.minRating === 4.5}
               onPress={() => patch({ minRating: filters.minRating === 4.5 ? 0 : 4.5 })}
            />
            <FilterChip
               label="Under $$$"
               active={filters.maxPriceLevel === 2}
               onPress={() => patch({ maxPriceLevel: filters.maxPriceLevel === 2 ? 4 : 2 })}
            />
         </ScrollView>
         {!loading && !error && results.length > 0 && (
            <Text className="mb-2 text-sm text-neutral-500">
               Results for “{query}”
            </Text>
         )}
      </View>
   );

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
      <View className="items-center px-6 py-14">
         <Text className="text-4xl">🔎</Text>
         <Text className="mt-3 text-lg font-semibold text-neutral-800">No results for “{query}”</Text>
         <Text className="mt-1 text-center text-neutral-500">
            {hasFilters ? "Try removing a filter or check the spelling." : "Check the spelling or try a broader term."}
         </Text>
         {hasFilters && (
            <Pressable
               onPress={() => setFilters(DEFAULT_SEARCH_FILTERS)}
               className="mt-4 rounded-xl border border-orange-500 px-6 py-3"
            >
               <Text className="font-bold text-orange-600">Clear filters</Text>
            </Pressable>
         )}
         {onSearchAgain && (
            <View className="mt-6 flex-row flex-wrap justify-center">
               {TRENDING.slice(0, 4).map((t) => (
                  <Pressable
                     key={t}
                     onPress={() => onSearchAgain(t)}
                     className="mb-2 mr-2 rounded-full border border-neutral-300 px-4 py-2"
                  >
                     <Text className="text-sm text-neutral-700">🔥 {t}</Text>
                  </Pressable>
               ))}
            </View>
         )}
      </View>
   );

   return (
      <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
         {/* Top bar with tappable query pill */}
         <View className="flex-row items-center px-4 pb-1 pt-2">
            <Pressable
               onPress={onBack}
               hitSlop={10}
               accessibilityRole="button"
               accessibilityLabel="Go back"
               className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white"
            >
               <Text className="text-xl">←</Text>
            </Pressable>
            <Pressable
               onPress={onEditQuery}
               accessibilityRole="search"
               accessibilityLabel={`Search: ${query}. Tap to edit`}
               className="h-12 flex-1 flex-row items-center rounded-xl bg-white px-3"
            >
               <Text className="mr-2 text-base">🔍</Text>
               <Text className="flex-1 text-base text-neutral-900" numberOfLines={1}>
                  {query}
               </Text>
               <Text className="text-neutral-400">✕</Text>
            </Pressable>
         </View>

         {loading ? (
            <View className="px-4">
               {header}
               <SkeletonRow />
               <SkeletonRow />
               <SkeletonRow />
            </View>
         ) : (
            <FlatList
               data={results}
               keyExtractor={(i) => i.id}
               ListHeaderComponent={header}
               ListEmptyComponent={empty}
               ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" color="#f97316" /> : null}
               contentContainerClassName="px-4 pb-10"
               showsVerticalScrollIndicator={false}
               onEndReached={onEndReached}
               onEndReachedThreshold={0.4}
               refreshControl={
                  <RefreshControl
                     refreshing={refreshing}
                     onRefresh={() => {
                        setRefreshing(true);
                        load(true);
                     }}
                     tintColor="#f97316"
                  />
               }
               renderItem={({ item }) => <ResultCard item={item} onPress={() => onSelectRestaurant?.(item)} />}
            />
         )}

         <SortSheet
            visible={sortOpen}
            value={filters.sort}
            onClose={() => setSortOpen(false)}
            onSelect={(sort) => patch({ sort })}
         />
      </SafeAreaView>
   );
}

export default function SearchResultScreen() {
   const query = "pizza";

   const handleBack = () => {
      // Go back
   };

   const handleEditQuery = () => {
      // Open search screen with current query
   };

   const handleRestaurantSelect = (restaurant) => {
      // Handle selected restaurant
   };

   const handleSearchAgain = (query) => {
      // Search again with the new query
   };

   <SearchResultScreen
      query={query}
      onBack={handleBack}
      onEditQuery={handleEditQuery}
      onSelectRestaurant={handleRestaurantSelect}
      onSearchAgain={handleSearchAgain}
   />

   return (
      <SearchResult
         query="pizza"
         onBack={handleBack}
         onEditQuery={handleEditQuery}
         onSelectRestaurant={handleRestaurantSelect}
         onSearchAgain={handleSearchAgain}
      />
   )
}


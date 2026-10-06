import { useEffect, useRef, useState } from "react";
import {
   ActivityIndicator,
   Keyboard,
   Pressable,
   ScrollView,
   Text,
   TextInput,
   View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RestaurantSummary } from "./restaurant-details";
import {
   POPULAR_CUISINES,
   Suggestion,
   TRENDING,
   fetchSuggestions,
   useDebounce,
   useRecentSearches,
} from "./searchService";

const SUGGESTION_ICON: Record<Suggestion["type"], string> = {
  restaurant: "🏪",
  cuisine: "🍽️",
  dish: "🥘",
};

const SUGGESTION_HINT: Record<Suggestion["type"], string> = {
  restaurant: "Restaurant",
  cuisine: "Cuisine",
  dish: "Dish",
};

export default function SearchScreen({
  initialQuery = "",
  onBack,
  onSubmit,
  onSelectRestaurant,
}: {
  initialQuery?: string;
  onBack?: () => void;
  /** Called with the final query; navigate to SearchResultScreen here. */
  onSubmit: (query: string) => void;
  onSelectRestaurant?: (restaurant: RestaurantSummary) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebounce(query);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { recent, add, remove, clear } = useRecentSearches();

  const trimmed = query.trim();
  const typing = trimmed.length > 0;

  /* Live suggestions (ignores stale responses) */
  useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSuggestions(q)
      .then((s) => !cancelled && setSuggestions(s))
      .catch(() => !cancelled && setSuggestions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const submit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    Keyboard.dismiss();
    add(t);
    onSubmit(t);
  };

  const pickSuggestion = (s: Suggestion) => {
    if (s.type === "restaurant") {
      add(s.label);
      onSelectRestaurant ? onSelectRestaurant(s.restaurant) : submit(s.label);
    } else {
      submit(s.label);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Search bar */}
      <View className="flex-row items-center px-4 pb-3 pt-2">
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
        >
          <Text className="text-xl">←</Text>
        </Pressable>
        <View className="h-12 flex-1 flex-row items-center rounded-xl bg-neutral-100 px-3">
          <Text className="mr-2 text-base">🔍</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submit(query)}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            placeholder="Restaurants, cuisines, dishes"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-base text-neutral-900"
            accessibilityLabel="Search"
          />
          {loading && <ActivityIndicator size="small" color="#f97316" className="mr-2" />}
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              hitSlop={10}
              accessibilityLabel="Clear search"
            >
              <Text className="text-neutral-400">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" className="flex-1">
        {typing ? (
          /* ---------- Suggestions ---------- */
          <View>
            <Pressable
              onPress={() => submit(query)}
              className="flex-row items-center border-b border-neutral-100 px-4 py-4 active:bg-neutral-50"
            >
              <Text className="mr-3 text-lg">🔍</Text>
              <Text className="flex-1 text-base text-neutral-900" numberOfLines={1}>
                Search for <Text className="font-bold">“{trimmed}”</Text>
              </Text>
            </Pressable>

            {suggestions.map((s, i) => (
              <Pressable
                key={`${s.type}-${s.label}-${i}`}
                onPress={() => pickSuggestion(s)}
                className="flex-row items-center border-b border-neutral-100 px-4 py-3.5 active:bg-neutral-50"
              >
                <Text className="mr-3 text-lg">{SUGGESTION_ICON[s.type]}</Text>
                <View className="flex-1">
                  <Text className="text-base text-neutral-900">{s.label}</Text>
                  <Text className="text-xs text-neutral-500">
                    {SUGGESTION_HINT[s.type]}
                    {s.type === "restaurant" ? ` • ${s.restaurant.cuisine}` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setQuery(s.label)}
                  hitSlop={10}
                  accessibilityLabel={`Use ${s.label} in search box`}
                >
                  <Text className="text-lg text-neutral-400">↖</Text>
                </Pressable>
              </Pressable>
            ))}

            {!loading && suggestions.length === 0 && (
              <Text className="px-4 py-6 text-center text-neutral-500">
                No suggestions. Press search to look for “{trimmed}”.
              </Text>
            )}
          </View>
        ) : (
          /* ---------- Idle: recent, popular, trending ---------- */
          <View className="px-4 pb-10">
            {recent.length > 0 && (
              <View className="mb-6">
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-neutral-900">Recent searches</Text>
                  <Pressable onPress={clear} hitSlop={10}>
                    <Text className="font-semibold text-orange-600">Clear all</Text>
                  </Pressable>
                </View>
                {recent.map((term) => (
                  <View key={term} className="flex-row items-center border-b border-neutral-100">
                    <Pressable
                      onPress={() => submit(term)}
                      className="flex-1 flex-row items-center py-3.5"
                      accessibilityLabel={`Search ${term} again`}
                    >
                      <Text className="mr-3 text-lg text-neutral-400">🕘</Text>
                      <Text className="text-base text-neutral-800">{term}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => remove(term)}
                      hitSlop={10}
                      accessibilityLabel={`Remove ${term} from history`}
                      className="px-2 py-2"
                    >
                      <Text className="text-neutral-400">✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Text className="mb-3 text-lg font-bold text-neutral-900">Popular cuisines</Text>
            <View className="mb-6 flex-row flex-wrap">
              {POPULAR_CUISINES.map((c) => (
                <Pressable
                  key={c.label}
                  onPress={() => submit(c.label)}
                  className="mb-3 w-1/4 items-center active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                >
                  <View className="h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                    <Text className="text-3xl">{c.emoji}</Text>
                  </View>
                  <Text className="mt-1 text-xs font-medium text-neutral-700">{c.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-3 text-lg font-bold text-neutral-900">Trending</Text>
            <View className="flex-row flex-wrap">
              {TRENDING.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => submit(t)}
                  className="mb-2 mr-2 rounded-full border border-neutral-300 px-4 py-2 active:bg-neutral-100"
                >
                  <Text className="text-sm text-neutral-700">🔥 {t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
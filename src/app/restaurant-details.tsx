import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
   ActivityIndicator,
   Image,
   Linking,
   Modal,
   Platform,
   Pressable,
   ScrollView,
   SectionList,
   Share,
   Text,
   TextInput,
   View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/* ----------------------------- Types ----------------------------- */

/** Same shape as the Restaurant used in BrowseRestaurants. */
export interface RestaurantSummary {
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

interface MenuItem {
   id: string;
   name: string;
   description: string;
   price: number;
   image?: string;
   popular?: boolean;
   vegetarian?: boolean;
   spicy?: boolean;
}

interface MenuCategory {
   title: string;
   data: MenuItem[];
}

interface Review {
   id: string;
   author: string;
   rating: number;
   date: string;
   text: string;
}

interface RestaurantInfo {
   address: string;
   phone: string;
   latitude: number;
   longitude: number;
   hours: { day: string; time: string }[];
   about: string;
   minOrder: number;
}

interface RestaurantDetailsData {
   info: RestaurantInfo;
   menu: MenuCategory[];
   reviews: Review[];
}

interface CartLine {
   item: MenuItem;
   qty: number;
   note: string;
}

/* --------------------- Data layer (replace me) --------------------- */

/** Swap with a real API call, e.g. fetch(`/restaurants/${id}`) */
async function fetchRestaurantDetails(_id: string): Promise<RestaurantDetailsData> {
   await new Promise((r) => setTimeout(r, 700));
   return {
      info: {
         address: "128 Market Street, Downtown",
         phone: "+1 555 010 2030",
         latitude: 37.7937,
         longitude: -122.3965,
         about: "Wood-fired, small-batch cooking with ingredients from local farms. Everything is made to order.",
         minOrder: 12,
         hours: [
            { day: "Mon – Thu", time: "11:00 – 22:00" },
            { day: "Fri – Sat", time: "11:00 – 23:30" },
            { day: "Sunday", time: "12:00 – 21:00" },
         ],
      },
      menu: [
         {
            title: "Popular",
            data: [
               { id: "m1", name: "Margherita", description: "San Marzano tomato, fior di latte, basil, olive oil.", price: 12.5, popular: true, vegetarian: true, image: "https://picsum.photos/seed/m1/200/200" },
               { id: "m2", name: "Diavola", description: "Spicy salami, chili oil, mozzarella, tomato.", price: 14.0, popular: true, spicy: true, image: "https://picsum.photos/seed/m2/200/200" },
            ],
         },
         {
            title: "Pizzas",
            data: [
               { id: "m3", name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, parmesan, fontina.", price: 15.0, vegetarian: true, image: "https://picsum.photos/seed/m3/200/200" },
               { id: "m4", name: "Prosciutto & Rocket", description: "Prosciutto di Parma, rocket, shaved grana.", price: 16.5, image: "https://picsum.photos/seed/m4/200/200" },
            ],
         },
         {
            title: "Sides",
            data: [
               { id: "m5", name: "Garlic Knots", description: "Six knots, herb butter, parmesan.", price: 6.0, vegetarian: true },
               { id: "m6", name: "Burrata Salad", description: "Burrata, cherry tomato, basil, balsamic.", price: 9.5, vegetarian: true, image: "https://picsum.photos/seed/m6/200/200" },
            ],
         },
         {
            title: "Drinks",
            data: [
               { id: "m7", name: "Lemon Soda", description: "House-made, not too sweet.", price: 3.5, vegetarian: true },
               { id: "m8", name: "Sparkling Water", description: "750 ml bottle.", price: 4.0, vegetarian: true },
            ],
         },
      ],
      reviews: [
         { id: "r1", author: "Amara K.", rating: 5, date: "2 days ago", text: "Crust was perfect and it arrived hot. Will order again." },
         { id: "r2", author: "Daniel P.", rating: 4, date: "1 week ago", text: "Great flavours, delivery took a bit longer than quoted." },
         { id: "r3", author: "Mei L.", rating: 5, date: "3 weeks ago", text: "The Diavola has a real kick. Loved the garlic knots too." },
      ],
   };
}

/* --------------------------- Utilities ---------------------------- */

const money = (n: number) => `$${n.toFixed(2)}`;
const priceLabel = (n: number) => "$".repeat(n);
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/* ------------------------- Small components ------------------------ */

const Stepper = ({
   qty,
   onChange,
   min = 0,
}: {
   qty: number;
   onChange: (n: number) => void;
   min?: number;
}) => (
   <View className="flex-row items-center rounded-full border border-neutral-300 bg-white">
      <Pressable
         onPress={() => onChange(Math.max(min, qty - 1))}
         hitSlop={6}
         accessibilityLabel="Decrease quantity"
         className="h-9 w-9 items-center justify-center"
      >
         <Text className="text-xl text-neutral-800">−</Text>
      </Pressable>
      <Text className="min-w-[24px] text-center text-base font-semibold text-neutral-900">{qty}</Text>
      <Pressable
         onPress={() => onChange(qty + 1)}
         hitSlop={6}
         accessibilityLabel="Increase quantity"
         className="h-9 w-9 items-center justify-center"
      >
         <Text className="text-xl text-orange-600">+</Text>
      </Pressable>
   </View>
);

const Tag = ({ label, tone }: { label: string; tone: "green" | "red" | "orange" }) => {
   const styles = {
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      orange: "bg-orange-100 text-orange-800",
   }[tone].split(" ");
   return (
      <View className={`mr-1.5 rounded px-1.5 py-0.5 ${styles[0]}`}>
         <Text className={`text-xs font-medium ${styles[1]}`}>{label}</Text>
      </View>
   );
};

const MenuRow = ({
   item,
   qty,
   disabled,
   onPress,
   onChangeQty,
}: {
   item: MenuItem;
   qty: number;
   disabled: boolean;
   onPress: () => void;
   onChangeQty: (n: number) => void;
}) => (
   <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${money(item.price)}`}
      className="flex-row border-b border-neutral-100 bg-white px-4 py-4 active:bg-neutral-50"
   >
      <View className="flex-1 pr-3">
         <Text className="text-base font-semibold text-neutral-900">{item.name}</Text>
         <Text className="mt-0.5 text-sm text-neutral-500" numberOfLines={2}>
            {item.description}
         </Text>
         <View className="mt-2 flex-row items-center">
            <Text className="mr-2 text-base font-semibold text-neutral-900">{money(item.price)}</Text>
            {item.popular && <Tag label="Popular" tone="orange" />}
            {item.vegetarian && <Tag label="Veg" tone="green" />}
            {item.spicy && <Tag label="Spicy" tone="red" />}
         </View>
      </View>

      <View className="items-center justify-between">
         {item.image ? (
            <Image source={{ uri: item.image }} className="h-24 w-24 rounded-xl bg-neutral-200" />
         ) : (
            <View className="h-24 w-0" />
         )}
         <View className={item.image ? "-mt-4" : ""}>
            {qty > 0 ? (
               <Stepper qty={qty} onChange={onChangeQty} />
            ) : (
               <Pressable
                  onPress={() => !disabled && onChangeQty(1)}
                  disabled={disabled}
                  accessibilityLabel={`Add ${item.name}`}
                  className={`rounded-full border px-5 py-1.5 ${disabled ? "border-neutral-200 bg-neutral-100" : "border-orange-500 bg-white"
                     }`}
               >
                  <Text className={`font-bold ${disabled ? "text-neutral-400" : "text-orange-600"}`}>Add</Text>
               </Pressable>
            )}
         </View>
      </View>
   </Pressable>
);

/* --------------------------- Item sheet --------------------------- */

const ItemSheet = ({
   item,
   initial,
   onClose,
   onSave,
}: {
   item: MenuItem | null;
   initial?: CartLine;
   onClose: () => void;
   onSave: (qty: number, note: string) => void;
}) => {
   const [qty, setQty] = useState(1);
   const [note, setNote] = useState("");

   useEffect(() => {
      if (item) {
         setQty(initial?.qty ?? 1);
         setNote(initial?.note ?? "");
      }
   }, [item, initial]);

   if (!item) return null;
   const isEdit = !!initial;

   return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
         <Pressable className="flex-1 bg-black/40" onPress={onClose} />
         <View className="max-h-[85%] rounded-t-3xl bg-white pb-8">
            <ScrollView keyboardShouldPersistTaps="handled">
               {item.image && <Image source={{ uri: item.image }} className="h-52 w-full rounded-t-3xl" />}
               <View className="p-5">
                  <Text className="text-2xl font-bold text-neutral-900">{item.name}</Text>
                  <View className="mt-2 flex-row">
                     {item.vegetarian && <Tag label="Vegetarian" tone="green" />}
                     {item.spicy && <Tag label="Spicy" tone="red" />}
                  </View>
                  <Text className="mt-3 text-base leading-6 text-neutral-600">{item.description}</Text>

                  <Text className="mb-2 mt-5 font-semibold text-neutral-900">Special instructions</Text>
                  <TextInput
                     value={note}
                     onChangeText={setNote}
                     placeholder="Allergies, no onions, extra crispy…"
                     placeholderTextColor="#9ca3af"
                     multiline
                     maxLength={140}
                     className="min-h-[72px] rounded-xl border border-neutral-200 p-3 text-base text-neutral-900"
                     textAlignVertical="top"
                  />
               </View>
            </ScrollView>

            <View className="flex-row items-center px-5 pt-2">
               <Stepper qty={qty} onChange={setQty} min={isEdit ? 0 : 1} />
               <Pressable
                  onPress={() => {
                     onSave(qty, note.trim());
                     onClose();
                  }}
                  className={`ml-4 flex-1 items-center rounded-xl py-4 ${qty === 0 ? "bg-red-500" : "bg-orange-500"
                     }`}
               >
                  <Text className="text-base font-bold text-white">
                     {qty === 0 ? "Remove from cart" : `${isEdit ? "Update" : "Add"} · ${money(item.price * qty)}`}
                  </Text>
               </Pressable>
            </View>
         </View>
      </Modal>
   );
};

/* ----------------------------- Screen ----------------------------- */

export function RestaurantDetails({
   restaurant,
   onBack,
   onCheckout,
}: {
   restaurant: RestaurantSummary;
   onBack?: () => void;
   onCheckout?: (lines: CartLine[], total: number) => void;
}) {
   const insets = useSafeAreaInsets();
   const listRef = useRef<SectionList<MenuItem, MenuCategory>>(null);

   const [data, setData] = useState<RestaurantDetailsData | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [favorite, setFavorite] = useState(false);
   const [cart, setCart] = useState<Record<string, CartLine>>({});
   const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
   const [activeCategory, setActiveCategory] = useState(0);

   const load = useCallback(async () => {
      try {
         setError(null);
         setData(await fetchRestaurantDetails(restaurant.id));
      } catch {
         setError("Couldn't load this restaurant. Check your connection and try again.");
      }
   }, [restaurant.id]);

   useEffect(() => {
      load();
   }, [load]);

   /* Cart helpers */
   const setQty = (item: MenuItem, qty: number, note?: string) =>
      setCart((prev) => {
         const next = { ...prev };
         if (qty <= 0) delete next[item.id];
         else next[item.id] = { item, qty, note: note ?? prev[item.id]?.note ?? "" };
         return next;
      });

   const lines = useMemo(() => Object.values(cart), [cart]);
   const itemCount = lines.reduce((s, l) => s + l.qty, 0);
   const subtotal = lines.reduce((s, l) => s + l.qty * l.item.price, 0);
   const total = subtotal + (itemCount > 0 ? restaurant.deliveryFee : 0);
   const minOrder = data?.info.minOrder ?? 0;
   const belowMin = subtotal < minOrder;

   /* Actions */
   const onShare = () =>
      Share.share({ message: `Check out ${restaurant.name} (${restaurant.cuisine}) — rated ${restaurant.rating}★` });

   const onCall = () => data && Linking.openURL(`tel:${data.info.phone.replace(/\s/g, "")}`);

   const onDirections = () => {
      if (!data) return;
      const { latitude, longitude } = data.info;
      const label = encodeURIComponent(restaurant.name);
      const url = Platform.select({
         ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`,
         default: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      });
      Linking.openURL(url);
   };

   const scrollToCategory = (index: number) => {
      setActiveCategory(index);
      listRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 60, animated: true });
   };

   /* ---- Loading / error ---- */
   if (!data) {
      return (
         <SafeAreaView className="flex-1 items-center justify-center bg-white">
            {error ? (
               <View className="items-center px-6">
                  <Text className="text-4xl">📡</Text>
                  <Text className="mt-3 text-center text-base text-neutral-700">{error}</Text>
                  <Pressable onPress={load} className="mt-4 rounded-xl bg-orange-500 px-6 py-3">
                     <Text className="font-bold text-white">Try again</Text>
                  </Pressable>
                  <Pressable onPress={onBack} className="mt-3 p-2">
                     <Text className="font-semibold text-neutral-600">Go back</Text>
                  </Pressable>
               </View>
            ) : (
               <ActivityIndicator size="large" color="#f97316" />
            )}
         </SafeAreaView>
      );
   }

   /* ---- Header: hero + summary + category chips ---- */
   const header = (
      <View>
         <View>
            <Image source={{ uri: restaurant.image }} className="h-64 w-full bg-neutral-200" resizeMode="cover" />
            <View
               style={{ top: insets.top + 8 }}
               className="absolute left-4 right-4 flex-row items-center justify-between"
            >
               <Pressable
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  className="h-10 w-10 items-center justify-center rounded-full bg-white"
               >
                  <Text className="text-xl">←</Text>
               </Pressable>
               <View className="flex-row">
                  <Pressable
                     onPress={onShare}
                     accessibilityLabel="Share restaurant"
                     className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                  >
                     <Text className="text-lg">⬆️</Text>
                  </Pressable>
                  <Pressable
                     onPress={() => setFavorite((v) => !v)}
                     accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
                     className="h-10 w-10 items-center justify-center rounded-full bg-white"
                  >
                     <Text className="text-lg">{favorite ? "❤️" : "🤍"}</Text>
                  </Pressable>
               </View>
            </View>
         </View>

         <View className="-mt-5 rounded-t-3xl bg-white px-4 pb-4 pt-5">
            <View className="flex-row items-start justify-between">
               <View className="flex-1 pr-3">
                  <Text className="text-2xl font-extrabold text-neutral-900">{restaurant.name}</Text>
                  <Text className="mt-1 text-sm text-neutral-500">
                     {restaurant.cuisine} • {priceLabel(restaurant.priceLevel)} • {restaurant.distanceKm} km
                  </Text>
               </View>
               <View className="items-center rounded-lg bg-green-100 px-2.5 py-1.5">
                  <Text className="font-bold text-green-800">★ {restaurant.rating.toFixed(1)}</Text>
                  <Text className="text-xs text-green-800">{restaurant.reviewCount}+</Text>
               </View>
            </View>

            <View className="mt-3 flex-row">
               <View className="mr-2 rounded-full bg-neutral-100 px-3 py-1.5">
                  <Text className="text-sm text-neutral-700">🕒 {restaurant.deliveryMinutes} min</Text>
               </View>
               <View className="mr-2 rounded-full bg-neutral-100 px-3 py-1.5">
                  <Text className="text-sm text-neutral-700">
                     🛵 {restaurant.deliveryFee === 0 ? "Free" : money(restaurant.deliveryFee)}
                  </Text>
               </View>
               <View className="rounded-full bg-neutral-100 px-3 py-1.5">
                  <Text className="text-sm text-neutral-700">Min {money(minOrder)}</Text>
               </View>
            </View>

            {!restaurant.isOpen && (
               <View className="mt-3 rounded-xl bg-neutral-800 p-3">
                  <Text className="font-semibold text-white">Closed right now</Text>
                  <Text className="mt-0.5 text-sm text-neutral-300">You can browse the menu, but ordering is paused.</Text>
               </View>
            )}
            {restaurant.promo && restaurant.isOpen && (
               <View className="mt-3 rounded-xl bg-orange-50 p-3">
                  <Text className="font-semibold text-orange-700">🎉 {restaurant.promo}</Text>
               </View>
            )}
            <Text className="mt-3 text-base leading-6 text-neutral-600">{data.info.about}</Text>
         </View>

         <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="border-b border-neutral-100 bg-white px-4 py-3"
         >
            {data.menu.map((c, i) => (
               <Pressable
                  key={c.title}
                  onPress={() => scrollToCategory(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeCategory === i }}
                  className={`mr-2 rounded-full px-4 py-2 ${activeCategory === i ? "bg-orange-500" : "bg-neutral-100"}`}
               >
                  <Text className={`text-sm font-medium ${activeCategory === i ? "text-white" : "text-neutral-700"}`}>
                     {c.title}
                  </Text>
               </Pressable>
            ))}
         </ScrollView>
      </View>
   );

   /* ---- Footer: info + reviews ---- */
   const footer = (
      <View className="mt-3">
         <View className="bg-white p-4">
            <Text className="mb-3 text-lg font-bold text-neutral-900">Info</Text>
            <Text className="text-base text-neutral-700">📍 {data.info.address}</Text>
            <View className="mt-3">
               {data.info.hours.map((h) => (
                  <View key={h.day} className="flex-row justify-between py-1">
                     <Text className="text-sm text-neutral-500">{h.day}</Text>
                     <Text className="text-sm text-neutral-800">{h.time}</Text>
                  </View>
               ))}
            </View>
            <View className="mt-4 flex-row">
               <Pressable onPress={onCall} className="mr-2 flex-1 items-center rounded-xl border border-neutral-300 py-3">
                  <Text className="font-semibold text-neutral-800">📞 Call</Text>
               </Pressable>
               <Pressable onPress={onDirections} className="flex-1 items-center rounded-xl border border-neutral-300 py-3">
                  <Text className="font-semibold text-neutral-800">🗺️ Directions</Text>
               </Pressable>
            </View>
         </View>

         <View className="mt-3 bg-white p-4">
            <Text className="mb-1 text-lg font-bold text-neutral-900">Reviews</Text>
            {data.reviews.map((r) => (
               <View key={r.id} className="border-t border-neutral-100 py-3">
                  <View className="flex-row items-center justify-between">
                     <Text className="font-semibold text-neutral-900">{r.author}</Text>
                     <Text className="text-xs text-neutral-400">{r.date}</Text>
                  </View>
                  <Text className="mt-0.5 text-sm text-amber-500">{stars(r.rating)}</Text>
                  <Text className="mt-1 text-sm leading-5 text-neutral-600">{r.text}</Text>
               </View>
            ))}
         </View>
         <View style={{ height: itemCount > 0 ? 110 : 30 }} />
      </View>
   );

   return (
      <View className="flex-1 bg-neutral-100">
         <SectionList<MenuItem, MenuCategory>
            ref={listRef}
            sections={data.menu}
            keyExtractor={(i) => i.id}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => { }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            onViewableItemsChanged={({ viewableItems }) => {
               const first = viewableItems.find((v) => v.section);
               if (first) {
                  const idx = data.menu.findIndex((c) => c.title === (first.section as MenuCategory).title);
                  if (idx >= 0) setActiveCategory(idx);
               }
            }}
            renderSectionHeader={({ section }) => (
               <Text className="bg-neutral-100 px-4 pb-2 pt-5 text-lg font-bold text-neutral-900">{section.title}</Text>
            )}
            renderItem={({ item }) => (
               <MenuRow
                  item={item}
                  qty={cart[item.id]?.qty ?? 0}
                  disabled={!restaurant.isOpen}
                  onPress={() => setActiveItem(item)}
                  onChangeQty={(n) => setQty(item, n)}
               />
            )}
         />

         {itemCount > 0 && (
            <View
               style={{ paddingBottom: Math.max(insets.bottom, 12) }}
               className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-4 pt-3"
            >
               {belowMin && (
                  <Text className="mb-2 text-center text-sm text-neutral-500">
                     Add {money(minOrder - subtotal)} more to reach the minimum order
                  </Text>
               )}
               <Pressable
                  disabled={belowMin || !restaurant.isOpen}
                  onPress={() => onCheckout?.(lines, total)}
                  accessibilityRole="button"
                  className={`flex-row items-center justify-between rounded-xl px-4 py-4 ${belowMin ? "bg-neutral-300" : "bg-orange-500 active:bg-orange-600"
                     }`}
               >
                  <View className="h-7 w-7 items-center justify-center rounded-md bg-white/25">
                     <Text className="font-bold text-white">{itemCount}</Text>
                  </View>
                  <Text className="text-base font-bold text-white">View cart</Text>
                  <Text className="text-base font-bold text-white">{money(total)}</Text>
               </Pressable>
            </View>
         )}

         <ItemSheet
            item={activeItem}
            initial={activeItem ? cart[activeItem.id] : undefined}
            onClose={() => setActiveItem(null)}
            onSave={(qty, note) => activeItem && setQty(activeItem, qty, note)}
         />
      </View>
   );
}

export default function RestaurantDetailsScreen() {
   return (
      <RestaurantDetails
         restaurant={{
            id: "r1",
            name: "Flame & Basil",
            cuisine: "Italian",
            image: "https://picsum.photos/seed/flame-basil/900/600",
            rating: 4.8,
            reviewCount: 324,
            deliveryMinutes: 25,
            deliveryFee: 2.99,
            priceLevel: 2,
            distanceKm: 1.4,
            isOpen: true,
            promo: "20% off your first order",
         }}
         onBack={() => console.log("Back pressed")}
         onCheckout={(lines, total) => {
            console.log("Checkout:", lines, total);
         }}
      />
   )
}
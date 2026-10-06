import React, { useMemo, useState } from "react";
import {
   ActivityIndicator,
   Alert,
   Image,
   KeyboardAvoidingView,
   Modal,
   Platform,
   Pressable,
   ScrollView,
   Switch,
   Text,
   TextInput,
   View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CartLine, useCartStore } from "./cartStore";

/* ----------------------------- Types ----------------------------- */

type OrderType = "delivery" | "pickup";

interface Address {
   id: string;
   label: string;
   line: string;
}

interface PaymentMethod {
   id: string;
   label: string;
   detail: string;
   icon: string;
}

interface Promo {
   code: string;
   kind: "percent" | "freeDelivery";
   value: number; // percent for "percent"
}

interface OrderPayload {
   restaurantId: string;
   lines: CartLine[];
   orderType: OrderType;
   address?: Address;
   schedule: string; // "asap" or a slot label
   paymentId: string;
   tip: number;
   promo?: string;
   instructions: string;
   contactless: boolean;
   total: number;
}

/* --------------------- Data layer (replace me) --------------------- */

// Load these from your user profile / payment provider.
const ADDRESSES: Address[] = [
   { id: "a1", label: "Home", line: "42 Maple Avenue, Apt 5B" },
   { id: "a2", label: "Work", line: "128 Market Street, Floor 9" },
];

const PAYMENTS: PaymentMethod[] = [
   { id: "p1", label: "Visa", detail: "•••• 4242", icon: "💳" },
   { id: "p2", label: "Apple Pay", detail: "Default wallet", icon: "" },
   { id: "p3", label: "Cash", detail: "Pay on arrival", icon: "💵" },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Swap with e.g. fetch(`/promos/validate?code=${code}`) */
async function validatePromo(code: string): Promise<Promo> {
   await wait(500);
   const c = code.trim().toUpperCase();
   if (c === "WELCOME20") return { code: c, kind: "percent", value: 20 };
   if (c === "FREESHIP") return { code: c, kind: "freeDelivery", value: 0 };
   throw new Error("This code isn't valid or has expired.");
}

/** Swap with e.g. fetch("/orders", { method: "POST", body }) */
async function placeOrder(_payload: OrderPayload): Promise<{ orderId: string }> {
   await wait(1200);
   return { orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}` };
}

/* --------------------------- Utilities ---------------------------- */

const money = (n: number) => `$${n.toFixed(2)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

const SERVICE_FEE_RATE = 0.05;
const TAX_RATE = 0.08;
const TIP_OPTIONS = [0, 0.1, 0.15, 0.2];

function buildTimeSlots(): string[] {
   const slots: string[] = [];
   const t = new Date(Date.now() + 45 * 60 * 1000);
   t.setMinutes(Math.ceil(t.getMinutes() / 30) * 30, 0, 0);
   for (let i = 0; i < 8; i++) {
      slots.push(t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      t.setMinutes(t.getMinutes() + 30);
   }
   return slots;
}

/* ------------------------- Small components ------------------------ */

const Card = ({ children, title }: { children: React.ReactNode; title?: string }) => (
   <View className="mb-3 bg-white p-4">
      {title && <Text className="mb-3 text-lg font-bold text-neutral-900">{title}</Text>}
      {children}
   </View>
);

const Segmented = ({
   options,
   value,
   onChange,
}: {
   options: { key: string; label: string }[];
   value: string;
   onChange: (k: string) => void;
}) => (
   <View className="flex-row rounded-xl bg-neutral-100 p-1">
      {options.map((o) => (
         <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === o.key }}
            className={`flex-1 items-center rounded-lg py-2.5 ${value === o.key ? "bg-white shadow-sm" : ""}`}
         >
            <Text className={`font-semibold ${value === o.key ? "text-neutral-900" : "text-neutral-500"}`}>
               {o.label}
            </Text>
         </Pressable>
      ))}
   </View>
);

const Stepper = ({ qty, onChange }: { qty: number; onChange: (n: number) => void }) => (
   <View className="flex-row items-center rounded-full border border-neutral-300 bg-white">
      <Pressable
         onPress={() => onChange(qty - 1)}
         hitSlop={6}
         accessibilityLabel="Decrease quantity"
         className="h-8 w-8 items-center justify-center"
      >
         <Text className="text-lg text-neutral-800">{qty === 1 ? "🗑" : "−"}</Text>
      </Pressable>
      <Text className="min-w-[22px] text-center font-semibold text-neutral-900">{qty}</Text>
      <Pressable
         onPress={() => onChange(qty + 1)}
         hitSlop={6}
         accessibilityLabel="Increase quantity"
         className="h-8 w-8 items-center justify-center"
      >
         <Text className="text-lg text-orange-600">+</Text>
      </Pressable>
   </View>
);

const RowButton = ({
   icon,
   title,
   subtitle,
   onPress,
}: {
   icon: string;
   title: string;
   subtitle?: string;
   onPress: () => void;
}) => (
   <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center rounded-xl border border-neutral-200 p-3 active:bg-neutral-50"
   >
      <Text className="mr-3 text-xl">{icon}</Text>
      <View className="flex-1">
         <Text className="text-base font-semibold text-neutral-900">{title}</Text>
         {subtitle && <Text className="text-sm text-neutral-500">{subtitle}</Text>}
      </View>
      <Text className="text-neutral-400">›</Text>
   </Pressable>
);

function PickerSheet<T>({
   visible,
   title,
   options,
   selectedKey,
   getKey,
   renderLabel,
   onSelect,
   onClose,
}: {
   visible: boolean;
   title: string;
   options: T[];
   selectedKey: string;
   getKey: (o: T) => string;
   renderLabel: (o: T) => { title: string; subtitle?: string; icon?: string };
   onSelect: (o: T) => void;
   onClose: () => void;
}) {
   return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
         <Pressable className="flex-1 bg-black/40" onPress={onClose} />
         <View className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <Text className="mb-2 text-xl font-bold text-neutral-900">{title}</Text>
            <ScrollView>
               {options.map((o) => {
                  const l = renderLabel(o);
                  const selected = getKey(o) === selectedKey;
                  return (
                     <Pressable
                        key={getKey(o)}
                        onPress={() => {
                           onSelect(o);
                           onClose();
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        className="flex-row items-center border-b border-neutral-100 py-4"
                     >
                        {l.icon ? <Text className="mr-3 text-xl">{l.icon}</Text> : null}
                        <View className="flex-1">
                           <Text className={`text-base ${selected ? "font-bold text-orange-600" : "text-neutral-900"}`}>
                              {l.title}
                           </Text>
                           {l.subtitle && <Text className="text-sm text-neutral-500">{l.subtitle}</Text>}
                        </View>
                        {selected && <Text className="text-orange-600">✓</Text>}
                     </Pressable>
                  );
               })}
            </ScrollView>
         </View>
      </Modal>
   );
}

const SummaryRow = ({
   label,
   value,
   bold,
   green,
}: {
   label: string;
   value: string;
   bold?: boolean;
   green?: boolean;
}) => (
   <View className="flex-row justify-between py-1">
      <Text className={bold ? "text-base font-bold text-neutral-900" : "text-sm text-neutral-600"}>{label}</Text>
      <Text
         className={
            bold ? "text-base font-bold text-neutral-900" : `text-sm ${green ? "text-green-700" : "text-neutral-800"}`
         }
      >
         {value}
      </Text>
   </View>
);

/* ----------------------------- Screen ----------------------------- */

export function Cart({
   onBack,
   onBrowse,
   onOrderPlaced,
}: {
   onBack?: () => void;
   /** Shown on the empty-cart screen. */
   onBrowse?: () => void;
   onOrderPlaced?: (orderId: string) => void;
}) {
   const insets = useSafeAreaInsets();
   const restaurant = useCartStore((s) => s.restaurant);
   const linesMap = useCartStore((s) => s.lines);
   const setQty = useCartStore((s) => s.setQty);
   const setNote = useCartStore((s) => s.setNote);
   const removeItem = useCartStore((s) => s.removeItem);
   const clear = useCartStore((s) => s.clear);

   const lines = useMemo(() => Object.values(linesMap), [linesMap]);

   const [orderType, setOrderType] = useState<OrderType>("delivery");
   const [address, setAddress] = useState<Address>(ADDRESSES[0]);
   const [schedule, setSchedule] = useState("asap");
   const [payment, setPayment] = useState<PaymentMethod>(PAYMENTS[0]);
   const [tipRate, setTipRate] = useState(0.1);
   const [contactless, setContactless] = useState(true);
   const [instructions, setInstructions] = useState("");
   const [editingNote, setEditingNote] = useState<string | null>(null);

   const [promoInput, setPromoInput] = useState("");
   const [promo, setPromo] = useState<Promo | null>(null);
   const [promoError, setPromoError] = useState<string | null>(null);
   const [promoLoading, setPromoLoading] = useState(false);

   const [sheet, setSheet] = useState<null | "address" | "time" | "payment">(null);
   const [placing, setPlacing] = useState(false);
   const [orderError, setOrderError] = useState<string | null>(null);

   const timeSlots = useMemo(buildTimeSlots, []);

   /* ---- Totals ---- */
   const isDelivery = orderType === "delivery";
   const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.item.price, 0));
   const baseDeliveryFee = isDelivery ? restaurant?.deliveryFee ?? 0 : 0;
   const deliveryFee = promo?.kind === "freeDelivery" ? 0 : baseDeliveryFee;
   const discount = promo?.kind === "percent" ? round2(subtotal * (promo.value / 100)) : 0;
   const serviceFee = round2(subtotal * SERVICE_FEE_RATE);
   const tax = round2((subtotal - discount + serviceFee) * TAX_RATE);
   const tip = isDelivery ? round2(subtotal * tipRate) : 0;
   const total = round2(subtotal - discount + deliveryFee + serviceFee + tax + tip);

   const minOrder = restaurant?.minOrder ?? 0;
   const belowMin = isDelivery && subtotal < minOrder;
   const canOrder = lines.length > 0 && !belowMin && !placing;

   /* ---- Actions ---- */
   const confirmRemove = (line: CartLine) =>
      Alert.alert("Remove item?", `Remove ${line.item.name} from your cart?`, [
         { text: "Cancel", style: "cancel" },
         { text: "Remove", style: "destructive", onPress: () => removeItem(line.item.id) },
      ]);

   const changeQty = (line: CartLine, n: number) => {
      if (!restaurant) return;
      if (n <= 0) confirmRemove(line);
      else setQty(restaurant, line.item, n);
   };

   const confirmClear = () =>
      Alert.alert("Clear cart?", "This removes all items from your cart.", [
         { text: "Cancel", style: "cancel" },
         { text: "Clear", style: "destructive", onPress: clear },
      ]);

   const applyPromo = async () => {
      if (!promoInput.trim()) return;
      setPromoLoading(true);
      setPromoError(null);
      try {
         setPromo(await validatePromo(promoInput));
         setPromoInput("");
      } catch (e) {
         setPromoError(e instanceof Error ? e.message : "Couldn't apply this code.");
      } finally {
         setPromoLoading(false);
      }
   };

   const submit = async () => {
      if (!restaurant || !canOrder) return;
      setPlacing(true);
      setOrderError(null);
      try {
         const { orderId } = await placeOrder({
            restaurantId: restaurant.id,
            lines,
            orderType,
            address: isDelivery ? address : undefined,
            schedule,
            paymentId: payment.id,
            tip,
            promo: promo?.code,
            instructions: instructions.trim(),
            contactless: isDelivery && contactless,
            total,
         });
         clear();
         onOrderPlaced?.(orderId);
      } catch {
         setOrderError("We couldn't place your order. You haven't been charged. Please try again.");
      } finally {
         setPlacing(false);
      }
   };

   /* ---- Empty cart ---- */
   if (!restaurant || lines.length === 0) {
      return (
         <SafeAreaView className="flex-1 bg-white">
            <View className="px-4 pt-2">
               <Pressable
                  onPress={onBack}
                  accessibilityLabel="Go back"
                  className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
               >
                  <Text className="text-xl">←</Text>
               </Pressable>
            </View>
            <View className="flex-1 items-center justify-center px-8">
               <Text className="text-6xl">🛒</Text>
               <Text className="mt-4 text-xl font-bold text-neutral-900">Your cart is empty</Text>
               <Text className="mt-1 text-center text-neutral-500">Add something tasty from a restaurant to get started.</Text>
               <Pressable onPress={onBrowse} className="mt-6 rounded-xl bg-orange-500 px-8 py-4">
                  <Text className="font-bold text-white">Browse restaurants</Text>
               </Pressable>
            </View>
         </SafeAreaView>
      );
   }

   const eta =
      schedule === "asap"
         ? isDelivery
            ? `${restaurant.deliveryMinutes}–${restaurant.deliveryMinutes + 10} min`
            : "Ready in 15–20 min"
         : `Today, ${schedule}`;

   return (
      <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
         {/* Top bar */}
         <View className="flex-row items-center justify-between bg-white px-4 pb-3 pt-2">
            <Pressable
               onPress={onBack}
               hitSlop={10}
               accessibilityRole="button"
               accessibilityLabel="Go back"
               className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
            >
               <Text className="text-xl">←</Text>
            </Pressable>
            <Text className="text-lg font-bold text-neutral-900">Your cart</Text>
            <Pressable onPress={confirmClear} hitSlop={10} accessibilityLabel="Clear cart">
               <Text className="font-semibold text-red-600">Clear</Text>
            </Pressable>
         </View>

         <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
            <ScrollView
               keyboardShouldPersistTaps="handled"
               keyboardDismissMode="on-drag"
               showsVerticalScrollIndicator={false}
               contentContainerStyle={{ paddingBottom: 140 }}
            >
               {/* Restaurant + order type */}
               <Card>
                  <View className="mb-4 flex-row items-center">
                     <Image source={{ uri: restaurant.image }} className="h-12 w-12 rounded-xl bg-neutral-200" />
                     <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-neutral-900">{restaurant.name}</Text>
                        <Text className="text-sm text-neutral-500">{eta}</Text>
                     </View>
                  </View>
                  <Segmented
                     options={[
                        { key: "delivery", label: "Delivery" },
                        { key: "pickup", label: "Pickup" },
                     ]}
                     value={orderType}
                     onChange={(k) => setOrderType(k as OrderType)}
                  />
               </Card>

               {/* Delivery details */}
               <Card title={isDelivery ? "Delivery details" : "Pickup details"}>
                  {isDelivery ? (
                     <RowButton icon="📍" title={address.label} subtitle={address.line} onPress={() => setSheet("address")} />
                  ) : (
                     <View className="rounded-xl border border-neutral-200 p-3">
                        <Text className="text-base font-semibold text-neutral-900">Pick up at {restaurant.name}</Text>
                        <Text className="text-sm text-neutral-500">Bring your order number to the counter.</Text>
                     </View>
                  )}
                  <View className="h-2" />
                  <RowButton
                     icon="🕒"
                     title={schedule === "asap" ? "As soon as possible" : `Today, ${schedule}`}
                     subtitle={eta}
                     onPress={() => setSheet("time")}
                  />
                  {isDelivery && (
                     <View className="mt-3 flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                           <Text className="text-base text-neutral-900">Contactless delivery</Text>
                           <Text className="text-sm text-neutral-500">Leave my order at the door</Text>
                        </View>
                        <Switch
                           value={contactless}
                           onValueChange={setContactless}
                           trackColor={{ true: "#f97316" }}
                           accessibilityLabel="Contactless delivery"
                        />
                     </View>
                  )}
                  <TextInput
                     value={instructions}
                     onChangeText={setInstructions}
                     placeholder={isDelivery ? "Note for the courier (gate code, floor…)" : "Note for the restaurant"}
                     placeholderTextColor="#9ca3af"
                     multiline
                     maxLength={200}
                     className="mt-3 min-h-[56px] rounded-xl border border-neutral-200 p-3 text-base text-neutral-900"
                     textAlignVertical="top"
                  />
               </Card>

               {/* Items */}
               <Card title={`Items (${lines.reduce((n, l) => n + l.qty, 0)})`}>
                  {lines.map((line, idx) => (
                     <View key={line.item.id} className={`py-3 ${idx > 0 ? "border-t border-neutral-100" : ""}`}>
                        <View className="flex-row items-center">
                           {line.item.image && (
                              <Image source={{ uri: line.item.image }} className="mr-3 h-14 w-14 rounded-lg bg-neutral-200" />
                           )}
                           <View className="flex-1 pr-2">
                              <Text className="text-base font-semibold text-neutral-900">{line.item.name}</Text>
                              <Text className="text-sm text-neutral-500">{money(line.item.price * line.qty)}</Text>
                           </View>
                           <Stepper qty={line.qty} onChange={(n) => changeQty(line, n)} />
                        </View>

                        {editingNote === line.item.id ? (
                           <TextInput
                              autoFocus
                              value={line.note}
                              onChangeText={(t) => setNote(line.item.id, t)}
                              onBlur={() => setEditingNote(null)}
                              placeholder="Special instructions"
                              placeholderTextColor="#9ca3af"
                              maxLength={140}
                              className="mt-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                           />
                        ) : (
                           <Pressable onPress={() => setEditingNote(line.item.id)} hitSlop={6} className="mt-1.5">
                              <Text className={`text-sm ${line.note ? "text-neutral-600" : "font-medium text-orange-600"}`}>
                                 {line.note ? `📝 ${line.note}` : "+ Add note"}
                              </Text>
                           </Pressable>
                        )}
                     </View>
                  ))}
                  <Pressable onPress={onBack} className="mt-2 items-center rounded-xl border border-neutral-300 py-3">
                     <Text className="font-semibold text-neutral-800">+ Add more items</Text>
                  </Pressable>
               </Card>

               {/* Promo */}
               <Card title="Promo code">
                  {promo ? (
                     <View className="flex-row items-center justify-between rounded-xl bg-green-50 p-3">
                        <Text className="font-semibold text-green-800">🎉 {promo.code} applied</Text>
                        <Pressable onPress={() => setPromo(null)} hitSlop={10}>
                           <Text className="font-semibold text-neutral-600">Remove</Text>
                        </Pressable>
                     </View>
                  ) : (
                     <>
                        <View className="flex-row">
                           <TextInput
                              value={promoInput}
                              onChangeText={(t) => {
                                 setPromoInput(t);
                                 setPromoError(null);
                              }}
                              onSubmitEditing={applyPromo}
                              autoCapitalize="characters"
                              autoCorrect={false}
                              placeholder="Enter code"
                              placeholderTextColor="#9ca3af"
                              className="h-12 flex-1 rounded-xl border border-neutral-200 px-3 text-base text-neutral-900"
                           />
                           <Pressable
                              onPress={applyPromo}
                              disabled={promoLoading || !promoInput.trim()}
                              className={`ml-2 h-12 w-24 items-center justify-center rounded-xl ${promoInput.trim() ? "bg-neutral-900" : "bg-neutral-300"
                                 }`}
                           >
                              {promoLoading ? (
                                 <ActivityIndicator color="#fff" />
                              ) : (
                                 <Text className="font-bold text-white">Apply</Text>
                              )}
                           </Pressable>
                        </View>
                        {promoError && <Text className="mt-2 text-sm text-red-600">{promoError}</Text>}
                     </>
                  )}
               </Card>

               {/* Tip */}
               {isDelivery && (
                  <Card title="Tip your courier">
                     <View className="flex-row">
                        {TIP_OPTIONS.map((r) => {
                           const active = tipRate === r;
                           return (
                              <Pressable
                                 key={r}
                                 onPress={() => setTipRate(r)}
                                 accessibilityRole="button"
                                 accessibilityState={{ selected: active }}
                                 className={`mr-2 flex-1 items-center rounded-xl border py-3 ${active ? "border-orange-500 bg-orange-50" : "border-neutral-300"
                                    }`}
                              >
                                 <Text className={`font-semibold ${active ? "text-orange-700" : "text-neutral-800"}`}>
                                    {r === 0 ? "None" : `${r * 100}%`}
                                 </Text>
                                 {r > 0 && <Text className="text-xs text-neutral-500">{money(subtotal * r)}</Text>}
                              </Pressable>
                           );
                        })}
                     </View>
                  </Card>
               )}

               {/* Payment */}
               <Card title="Payment">
                  <RowButton
                     icon={payment.icon || "💰"}
                     title={payment.label}
                     subtitle={payment.detail}
                     onPress={() => setSheet("payment")}
                  />
               </Card>

               {/* Summary */}
               <Card title="Order summary">
                  <SummaryRow label="Subtotal" value={money(subtotal)} />
                  {discount > 0 && <SummaryRow label={`Discount (${promo?.code})`} value={`−${money(discount)}`} green />}
                  {isDelivery && (
                     <SummaryRow
                        label="Delivery fee"
                        value={deliveryFee === 0 ? "Free" : money(deliveryFee)}
                        green={deliveryFee === 0}
                     />
                  )}
                  <SummaryRow label="Service fee" value={money(serviceFee)} />
                  <SummaryRow label="Tax" value={money(tax)} />
                  {tip > 0 && <SummaryRow label="Courier tip" value={money(tip)} />}
                  <View className="my-2 h-px bg-neutral-200" />
                  <SummaryRow label="Total" value={money(total)} bold />
               </Card>
            </ScrollView>
         </KeyboardAvoidingView>

         {/* Sticky checkout bar */}
         <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-4 pt-3"
         >
            {belowMin && (
               <Text className="mb-2 text-center text-sm text-neutral-600">
                  Add {money(minOrder - subtotal)} more to reach the {money(minOrder)} minimum for delivery, or switch to pickup.
               </Text>
            )}
            {orderError && <Text className="mb-2 text-center text-sm text-red-600">{orderError}</Text>}
            <Pressable
               onPress={submit}
               disabled={!canOrder}
               accessibilityRole="button"
               accessibilityState={{ disabled: !canOrder }}
               className={`h-14 flex-row items-center justify-between rounded-xl px-5 ${canOrder ? "bg-orange-500 active:bg-orange-600" : "bg-neutral-300"
                  }`}
            >
               {placing ? (
                  <ActivityIndicator color="#fff" className="flex-1" />
               ) : (
                  <>
                     <Text className="text-base font-bold text-white">Place order</Text>
                     <Text className="text-base font-bold text-white">{money(total)}</Text>
                  </>
               )}
            </Pressable>
         </View>

         {/* Sheets */}
         <PickerSheet
            visible={sheet === "address"}
            title="Deliver to"
            options={ADDRESSES}
            selectedKey={address.id}
            getKey={(a) => a.id}
            renderLabel={(a) => ({ title: a.label, subtitle: a.line, icon: "📍" })}
            onSelect={setAddress}
            onClose={() => setSheet(null)}
         />
         <PickerSheet
            visible={sheet === "time"}
            title={isDelivery ? "Delivery time" : "Pickup time"}
            options={["asap", ...timeSlots]}
            selectedKey={schedule}
            getKey={(s) => s}
            renderLabel={(s) => ({ title: s === "asap" ? "As soon as possible" : `Today, ${s}`, icon: "🕒" })}
            onSelect={setSchedule}
            onClose={() => setSheet(null)}
         />
         <PickerSheet
            visible={sheet === "payment"}
            title="Payment method"
            options={PAYMENTS}
            selectedKey={payment.id}
            getKey={(p) => p.id}
            renderLabel={(p) => ({ title: p.label, subtitle: p.detail, icon: p.icon || "💰" })}
            onSelect={setPayment}
            onClose={() => setSheet(null)}
         />
      </SafeAreaView>
   );
}


export default function CartScreen() {
   const handleBack = () => {
      // Go back
   };

   const handleBrowse = () => {
      // Open restaurant/search screen
   };

   const handleOrderPlaced = (orderId) => {
      // Handle successful order
   };

   return (
      <Cart
         onBack={handleBack}
         onBrowse={handleBrowse}
         onOrderPlaced={handleOrderPlaced}
      />
   )
}

import { useState } from "react";
import {
   Image,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   ScrollView,
   Text,
   TextInput,
   TextInputProps,
   View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type UserProfile = {
   profilePicUrl?: string;
   username: string;
   firstName: string;
   lastName: string;
   email: string;
   bio: string;
};

type Props = {
   initialProfile?: UserProfile;
   onSave?: (profile: UserProfile) => void;
   onChangePhoto?: () => void;
};

const DEFAULT_PROFILE: UserProfile = {
   profilePicUrl: undefined,
   username: "",
   firstName: "",
   lastName: "",
   email: "",
   bio: "",
};

const BIO_MAX = 160;

type FieldProps = TextInputProps & {
   label: string;
};

const Field = ({ label, style, ...inputProps }: FieldProps) => (
   <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-600">{label}</Text>
      <TextInput
         className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
         placeholderTextColor="#94a3b8"
         {...inputProps}
      />
   </View>
);

export default function UserProfileScreen({
   initialProfile = DEFAULT_PROFILE,
   onSave,
   onChangePhoto,
}: Props) {
   const [profile, setProfile] = useState<UserProfile>(initialProfile);

   const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
      setProfile((prev) => ({ ...prev, [key]: value }));

   const initials =
      `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase() ||
      "?";

   return (
      <SafeAreaView className="flex-1 bg-slate-50">
         <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
         >
            <ScrollView
               contentContainerClassName="px-5 pb-10 pt-6"
               keyboardShouldPersistTaps="handled"
            >
               {/* Profile picture */}
               <View className="mb-8 items-center">
                  <Pressable onPress={onChangePhoto} accessibilityRole="button">
                     {profile.profilePicUrl ? (
                        <Image
                           source={{ uri: profile.profilePicUrl }}
                           className="h-28 w-28 rounded-full bg-slate-200"
                        />
                     ) : (
                        <View className="h-28 w-28 items-center justify-center rounded-full bg-indigo-100">
                           <Text className="text-3xl font-semibold text-indigo-600">
                              {initials}
                           </Text>
                        </View>
                     )}
                  </Pressable>
                  <Pressable onPress={onChangePhoto} className="mt-3">
                     <Text className="text-sm font-medium text-indigo-600">
                        Change photo
                     </Text>
                  </Pressable>
               </View>

               {/* Fields */}
               <Field
                  label="Username"
                  value={profile.username}
                  onChangeText={(t) => update("username", t)}
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect={false}
               />

               <View className="flex-row gap-3">
                  <View className="flex-1">
                     <Field
                        label="First name"
                        value={profile.firstName}
                        onChangeText={(t) => update("firstName", t)}
                        placeholder="First name"
                        autoCapitalize="words"
                        textContentType="givenName"
                     />
                  </View>
                  <View className="flex-1">
                     <Field
                        label="Last name"
                        value={profile.lastName}
                        onChangeText={(t) => update("lastName", t)}
                        placeholder="Last name"
                        autoCapitalize="words"
                        textContentType="familyName"
                     />
                  </View>
               </View>

               <Field
                  label="Email"
                  value={profile.email}
                  onChangeText={(t) => update("email", t)}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
               />

               <View className="mb-6">
                  <Text className="mb-1.5 text-sm font-medium text-slate-600">
                     Bio
                  </Text>
                  <TextInput
                     className="h-28 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
                     value={profile.bio}
                     onChangeText={(t) => update("bio", t.slice(0, BIO_MAX))}
                     placeholder="Tell people a little about yourself"
                     placeholderTextColor="#94a3b8"
                     multiline
                     textAlignVertical="top"
                  />
                  <Text className="mt-1 text-right text-xs text-slate-400">
                     {profile.bio.length}/{BIO_MAX}
                  </Text>
               </View>

               <Pressable
                  onPress={() => onSave?.(profile)}
                  className="items-center rounded-xl bg-indigo-600 py-4 active:bg-indigo-700"
                  accessibilityRole="button"
               >
                  <Text className="text-base font-semibold text-white">
                     Save changes
                  </Text>
               </Pressable>
            </ScrollView>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
}
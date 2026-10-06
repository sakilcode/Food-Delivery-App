// import { Text, View } from "react-native";

// export default function SignIn() {
//    return (
//       <View className="bg-blue-700">
//          <Text>Sign IN Scren</Text>
//       </View>
//    )
// }

import { useRef, useState } from 'react';
import {
   ActivityIndicator,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   ScrollView,
   Text,
   TextInput,
   View,
} from 'react-native';

type Props = {
   /** Throw an Error with a user-friendly message to show it on the form. */
   onSubmit?: (email: string, password: string) => Promise<void>;
   onForgotPassword?: () => void;
   onSignUp?: () => void;
};

type FieldErrors = { email?: string; password?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({
   onSubmit,
   onForgotPassword,
   onSignUp,
}: Props) {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [errors, setErrors] = useState<FieldErrors>({});
   const [formError, setFormError] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);
   const passwordRef = useRef<TextInput>(null);

   const validate = (): boolean => {
      const next: FieldErrors = {};
      if (!email.trim()) next.email = 'Enter your email address.';
      else if (!EMAIL_RE.test(email.trim()))
         next.email = 'Enter a valid email, like name@example.com.';
      if (!password) next.password = 'Enter your password.';
      else if (password.length < 8)
         next.password = 'Password must be at least 8 characters.';
      setErrors(next);
      return Object.keys(next).length === 0;
   };

   const handleLogin = async () => {
      if (loading) return;
      setFormError(null);
      if (!validate()) return;
      setLoading(true);
      try {
         await onSubmit?.(email.trim(), password);
      } catch (e) {
         setFormError(
            e instanceof Error ? e.message : 'Could not sign in. Try again.'
         );
      } finally {
         setLoading(false);
      }
   };

   return (
      <KeyboardAvoidingView
         className="flex-1 bg-slate-50"
         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
         <ScrollView
            contentContainerClassName="flex-grow justify-center px-6 py-10"
            keyboardShouldPersistTaps="handled"
         >
            <View className="mb-10">
               <Text className="text-4xl font-bold text-slate-900">Welcome back</Text>
               <Text className="mt-2 text-base text-slate-500">
                  Sign in to continue to your account.
               </Text>
            </View>

            {formError && (
               <View
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                  accessibilityRole="alert"
               >
                  <Text className="text-sm text-red-700">{formError}</Text>
               </View>
            )}

            {/* Email */}
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Email</Text>
            <TextInput
               className={`rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 ${errors.email ? 'border-red-400' : 'border-slate-300'
                  }`}
               placeholder="name@example.com"
               placeholderTextColor="#94a3b8"
               value={email}
               onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
               }}
               autoCapitalize="none"
               autoCorrect={false}
               autoComplete="email"
               keyboardType="email-address"
               textContentType="emailAddress"
               returnKeyType="next"
               onSubmitEditing={() => passwordRef.current?.focus()}
               editable={!loading}
               accessibilityLabel="Email"
            />
            {errors.email && (
               <Text className="mt-1.5 text-sm text-red-600">{errors.email}</Text>
            )}

            {/* Password */}
            <View className="mb-1.5 mt-5 flex-row items-center justify-between">
               <Text className="text-sm font-medium text-slate-700">Password</Text>
               <Pressable onPress={onForgotPassword} hitSlop={8}>
                  <Text className="text-sm font-medium text-indigo-600">
                     Forgot password?
                  </Text>
               </Pressable>
            </View>
            <View
               className={`flex-row items-center rounded-xl border bg-white ${errors.password ? 'border-red-400' : 'border-slate-300'
                  }`}
            >
               <TextInput
                  ref={passwordRef}
                  className="flex-1 px-4 py-3.5 text-base text-slate-900"
                  placeholder="At least 8 characters"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(t) => {
                     setPassword(t);
                     if (errors.password)
                        setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                  accessibilityLabel="Password"
               />
               <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  className="px-4 py-3.5"
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
               >
                  <Text className="text-sm font-medium text-slate-500">
                     {showPassword ? 'Hide' : 'Show'}
                  </Text>
               </Pressable>
            </View>
            {errors.password && (
               <Text className="mt-1.5 text-sm text-red-600">{errors.password}</Text>
            )}

            {/* Submit */}
            <Pressable
               onPress={handleLogin}
               disabled={loading}
               accessibilityRole="button"
               accessibilityState={{ disabled: loading, busy: loading }}
               className={`mt-8 h-14 items-center justify-center rounded-xl ${loading ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'
                  }`}
            >
               {loading ? (
                  <ActivityIndicator color="#fff" />
               ) : (
                  <Text className="text-base font-semibold text-white">Sign in</Text>
               )}
            </Pressable>

            <View className="mt-8 flex-row justify-center">
               <Text className="text-sm text-slate-500">New here? </Text>
               <Pressable onPress={onSignUp} hitSlop={8}>
                  <Text className="text-sm font-semibold text-indigo-600">
                     Create an account
                  </Text>
               </Pressable>
            </View>
         </ScrollView>
      </KeyboardAvoidingView>
   );
}
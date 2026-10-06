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
  onSubmit?: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  onSignIn?: () => void;
};

type FieldErrors = { username?: string; email?: string; password?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

const passwordChecks = (pw: string) => [
  { label: 'At least 8 characters', ok: pw.length >= 8 },
  { label: 'A letter and a number', ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw) },
];

export default function SignUpScreen({ onSubmit, onSignIn }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const clear = (key: keyof FieldErrors) =>
    errors[key] && setErrors((p) => ({ ...p, [key]: undefined }));

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const u = username.trim();
    if (!u) next.username = 'Choose a username.';
    else if (u.length < 3 || u.length > 20)
      next.username = 'Username must be 3 to 20 characters.';
    else if (!USERNAME_RE.test(u))
      next.username = 'Use only letters, numbers and underscores.';

    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email.trim()))
      next.email = 'Enter a valid email, like name@example.com.';

    if (!password) next.password = 'Create a password.';
    else if (!passwordChecks(password).every((c) => c.ok))
      next.password = 'Password must meet the requirements below.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (loading) return;
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit?.(username.trim(), email.trim(), password);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : 'Could not create your account. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900';

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
          <Text className="text-4xl font-bold text-slate-900">Create account</Text>
          <Text className="mt-2 text-base text-slate-500">
            Sign up to get started.
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

        {/* Username */}
        <Text className="mb-1.5 text-sm font-medium text-slate-700">Username</Text>
        <TextInput
          className={`${inputBase} ${
            errors.username ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="e.g. jane_doe"
          placeholderTextColor="#94a3b8"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            clear('username');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!loading}
          accessibilityLabel="Username"
        />
        {errors.username && (
          <Text className="mt-1.5 text-sm text-red-600">{errors.username}</Text>
        )}

        {/* Email */}
        <Text className="mb-1.5 mt-5 text-sm font-medium text-slate-700">Email</Text>
        <TextInput
          ref={emailRef}
          className={`${inputBase} ${
            errors.email ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="name@example.com"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            clear('email');
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
        <Text className="mb-1.5 mt-5 text-sm font-medium text-slate-700">Password</Text>
        <View
          className={`flex-row items-center rounded-xl border bg-white ${
            errors.password ? 'border-red-400' : 'border-slate-300'
          }`}
        >
          <TextInput
            ref={passwordRef}
            className="flex-1 px-4 py-3.5 text-base text-slate-900"
            placeholder="Create a password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clear('password');
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSignUp}
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

        {/* Live password requirements */}
        <View className="mt-3 gap-1">
          {passwordChecks(password).map((c) => (
            <Text
              key={c.label}
              className={`text-sm ${c.ok ? 'text-emerald-600' : 'text-slate-500'}`}
            >
              {c.ok ? '✓ ' : '• '}
              {c.label}
            </Text>
          ))}
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSignUp}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
          className={`mt-8 h-14 items-center justify-center rounded-xl ${
            loading ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Create account</Text>
          )}
        </Pressable>

        <View className="mt-8 flex-row justify-center">
          <Text className="text-sm text-slate-500">Already have an account? </Text>
          <Pressable onPress={onSignIn} hitSlop={8}>
            <Text className="text-sm font-semibold text-indigo-600">Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
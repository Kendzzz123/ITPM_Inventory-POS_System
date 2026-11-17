import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { api, API_ROUTES } from '@/config/apiConfig';
import { saveToken } from '@/services/authService';
import { setGlobalUserRole } from '@/store/appState';
import { DEFAULT_PASSWORDS } from '@/constants/app';
import { ROUTES, homeRouteFor } from '@/constants/routes';


// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',    // Brand yellow
  red: '#EC0000',       // Primary buttons, links
  cream: '#FFFDF5',     // Light cream screen background
  white: '#FFFFFF',     // Input fields, text on red buttons
  nearBlack: '#0F1015', // Titles, labels, and body text
};

export default function LoginScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // One red line above the Log in button (design), e.g. "Invalid Password".
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showError = (message: string) => setErrorMsg(message);
  const clearError = () => setErrorMsg(null);

  const handleLogin = async () => {
    clearError();
    if (!email.trim()) {
      showError('Please enter your email.');
      return;
    }
    if (!password) {
      showError('Please enter your password.');
      return;
    }

setLoading(true);
    try {
      const response = await api.post(API_ROUTES.LOGIN, {
        email: email.trim(),
        password: password,
      });

      await saveToken(response.data.token);

      const userRole = response.data?.user?.role?.toLowerCase() || '';
      setGlobalUserRole(userRole === 'manager' ? 'manager' : 'cashier');

      const isDefaultPassword =
        response.data?.mustChangePassword === true || DEFAULT_PASSWORDS.includes(password);

      // If new staff/user logged in with default password, require password change first
      if (isDefaultPassword) {
        router.replace({
          pathname: ROUTES.CHANGE_PASSWORD,
          params: { role: userRole },
        } as Href);
        return;
      }

      // Otherwise land on Home Page based on role
      router.replace(homeRouteFor(userRole));
    } catch (error: any) {
      // The server says which field is wrong: 'email' (no such account) or 'password'.
      // Those two use the design's wording; anything else (suspended account,
      // too many attempts, server offline) shows the server's own message.
      const field = error.response?.data?.field;
      if (field === 'email') showError('Invalid Email Address');
      else if (field === 'password') showError('Invalid Password');
      else showError(error.response?.data?.message || error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Top Yellow Brand Banner */}
            <View style={styles.banner}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.bannerSubtitle}>
                Inventory system and POS
              </Text>
            </View>

            {/* Bottom Form Section */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.subtitle}>Please log in your account.</Text>

              {/* Email Field */}
              <View style={[styles.inputGroup, styles.emailGroup]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    clearError();
                  }}
                />
              </View>

              {/* Password Field with Eye Icon */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      clearError();
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeIconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password Link */}
              <Pressable
                style={styles.forgotContainer}
                onPress={() => router.push(ROUTES.FORGOT_PASSWORD)}
              >
                <Text style={styles.forgotText}>Forgot Password</Text>
              </Pressable>

              {/* Login error, between Forgot Password and Log in (design) */}
              <View style={styles.errorSlot}>
                {!!errorMsg && (
                  <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
                    {errorMsg}
                  </Text>
                )}
              </View>

              {/* Primary Red Log In Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.loginButtonPressed,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Log in</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  // Sizes follow the 360 x 800 design frame.
  banner: {
    backgroundColor: COLORS.yellow,
    paddingTop: Platform.OS === 'ios' ? 60 : 75,
    paddingBottom: 64,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logo: {
    width: 343,
    maxWidth: '100%',
    height: 140,
  },
  bannerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
    marginTop: 15,
  },
  formContainer: {
    paddingHorizontal: 25,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    paddingTop: 16,
    fontFamily: 'Poppins_700Bold',
    fontSize: 27.5,
    textAlign: 'center',
    color: COLORS.nearBlack,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.nearBlack,
    marginTop: 0,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 0,
  },
  emailGroup: {
    marginBottom: 27,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.nearBlack,
    marginBottom: 4,
    marginLeft: 3,
  },
  input: {
    height: 47,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.nearBlack,
  },
  // Same box as the Email input, with room for the eye button on the right.
  passwordContainer: {
    height: 47,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0, // lets the input shrink so the eye stays inside the box on web
    height: '100%',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.nearBlack,
  },
  eyeIconBtn: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: 16,
    marginRight: 7,
    marginBottom: 24,
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.red,
    textDecorationLine: 'underline',
  },
  // Always takes the same space, so the button doesn't jump when a message shows.
  errorSlot: {
    minHeight: 18,
    marginBottom: 17,
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'center',
  },
  loginButton: {
    alignSelf: 'center',
    width: 188,
    height: 38,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 18,
  },
});

// TEST: unknown email -> "Invalid Email Address" above Log in; wrong password -> "Invalid Password"; no red outline
// TEST: eye button shows/hides the password
// TEST: suspended account / too many attempts -> the server's message in the same spot; typing clears it

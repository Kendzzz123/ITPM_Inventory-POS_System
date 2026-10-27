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
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { showAlert } from '@/utils/alert';
import { API_URL } from '@/config/apiConfig';
import { saveToken, clearToken } from '@/services/authService';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password.');
      if (Platform.OS !== 'web') {
        showAlert('Error', 'Please enter your email and password.');
      }
      return;
    }

setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
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
      const message =
        error.response?.data?.message || error.message || 'Failed to connect to server';
      setErrorMsg(message);
      if (Platform.OS !== 'web') {
        showAlert('Login Failed', message);
      }
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setErrorMsg(null);
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
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        setErrorMsg(null);
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.eyeIconBtn}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
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

                {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

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
        </TouchableWithoutFeedback>
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
  banner: {
    backgroundColor: COLORS.yellow,
    paddingTop: Platform.OS === 'ios' ? 60 : 75,
    paddingBottom: 46,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logo: {
    width: 250,
    height: 115,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: COLORS.nearBlack,
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 34,
    paddingTop: 28,
    paddingBottom: 40,
  },
  title: {
    paddingTop: 16,
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    textAlign: 'center',
    color: COLORS.nearBlack,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    textAlign: 'center',
    color: COLORS.nearBlack,
    marginTop: 4,
    marginBottom: 26,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: COLORS.nearBlack,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.white,
    borderWidth: 1.8,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.nearBlack,
  },
  passwordContainer: {
    height: 48,
    backgroundColor: COLORS.white,
    borderWidth: 1.8,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
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
    marginTop: 2,
    marginBottom: 24,
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.red,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'center',
    marginBottom: 14,
  },
  loginButton: {
    alignSelf: 'center',
    width: 220,
    height: 48,
    backgroundColor: COLORS.red,
    borderRadius: 14,
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
    fontSize: 16,
  },
});
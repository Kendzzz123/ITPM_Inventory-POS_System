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
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { saveToken } from './Role';
const YOUR_PC_IP = '192.168.1.36';
// When running on Web / iOS simulator use localhost; on Android emulator use 10.0.2.2
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`, // Used by both iOS & Android physical devices
});


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim(),
        password: password,
      });

      console.log('Login success:', response.data);
      await saveToken(response.data.token);   // <-- add this
      router.replace('/dashboard module/dashboard');

    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Failed to connect to server';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
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
            <View style={styles.banner}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.bannerSubtitle}>Inventory system and POS</Text>
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
                  placeholder="manager@example.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Forgot Password */}
              <Pressable 
                style={styles.forgotContainer}
                onPress={() => router.push('/forgotpassword')}
              >
                <Text style={styles.forgotText}>Forgot Password</Text>
              </Pressable>

              {/* Red Log In Button */}
              <Pressable 
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.loginButtonPressed
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>Log in</Text>
                )}
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    minHeight: 820,
    maxWidth: 500,
    backgroundColor: '#fffdf5',
  },
  banner: {
    backgroundColor: '#f6b800',
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logo: {
    width: 260,
    height: 120,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#1a1a1a',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 36,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    paddingTop: 30,
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    color: '#262626',
    marginTop: 4,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f6b800',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#111827',
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 24,
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#e11d48',
    textDecorationLine: 'underline',
  },
  loginButton: {
    margin: 50,
    height: 48,
    backgroundColor: '#e60000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 16,
  },
});
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';

// Change YOUR_PC_IP to your local IPv4 address if testing on a physical phone
const YOUR_PC_IP = '192.168.1.23';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, {
        email: email.trim(),
      });

      Alert.alert('Success', 'A 6-digit code has been sent to your email.');
      
      // Move to OTP screen and pass the email
      router.push({
        pathname: '/OTP',
        params: { email: email.trim() },
      });
    } catch (error: any) {
      console.error('Send OTP Error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Could not send verification code';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.card}>
          <Pressable onPress={() => router.replace('/')}>
            <MaterialIcons name="chevron-left" size={50} color="black" />
          </Pressable>

          <View style={styles.new}>
            <View style={styles.circleContainer}>
              <MaterialCommunityIcons
                name="key-variant"
                size={32}
                color="#ec0000"
                style={styles.verticalKey}
              />
            </View>
          </View>

          {/* Bottom Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>Enter your email and we’ll send you a 6-digit code.</Text>

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
                editable={!loading}
              />
            </View>

            {/* Red Send Code Button */}
            <Pressable 
              style={({ pressed }) => [
                styles.SendCodeButton,
                pressed && styles.SendCodeButtonPressed
              ]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.SendCode}>Send code</Text>
              )}
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  new: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalKey: {
    transform: [{ rotate: '45deg' }],
  },
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  card: {
    width: '100%',
    minHeight: 820,
    maxWidth: 420,
    backgroundColor: '#fffcef',
  },
  formContainer: {
    paddingHorizontal: 36,
    paddingTop: 30,
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
    fontSize: 11,
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
  SendCodeButton: {
    margin: 50,
    height: 48,
    backgroundColor: '#e60000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  SendCodeButtonPressed: {
    opacity: 0.85,
  },
  SendCode: {
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 16,
  },
});
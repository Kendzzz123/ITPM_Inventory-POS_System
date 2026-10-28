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
} from 'react-native';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { showAlert } from '@/utils/alert';
import { API_URL } from '@/config/apiConfig';


export default function NewPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; otp?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!newPassword || !confirmPassword) {
      showAlert('Required', 'Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Mismatch', 'Passwords do not match. Please verify and re-enter.');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Password Length', 'Password must be at least 6 characters.');
      return;
    }

    if (!params.email || !params.otp) {
      showAlert('Session Expired', 'Missing reset session details. Please request a new code.');
      router.replace('/forgot-password');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        email: params.email,
        otp: params.otp,
        newPassword: newPassword,
      });

      showAlert(
        'Success',
        response.data.message || 'Password reset successful!',
        [
          {
            text: 'Log In',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Reset Password Error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Failed to update password. Please try again.';
      showAlert('Update Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // No reset session (e.g. opened after an app reload) -> back to Login.
  if (!params.email || !params.otp) {
    return <Redirect href="/" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.card}>
          <Pressable onPress={() => router.push({ pathname: '/otp', params: { email: params.email } })}>
            <MaterialIcons name="chevron-left" size={50} color="black" style={styles.backButton} />
          </Pressable>

          <View style={styles.new}>
            <View style={styles.circleContainer}>
              <MaterialCommunityIcons
                name="lock"
                size={32}
                color="#ec0000"
              />
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>Kindly enter your new password</Text>

            {/* New Password Field with Eye Icon */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New password (min. 6 characters)"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.eyeIconBtn}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm New Password Field with Eye Icon */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.eyeIconBtn}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Button */}
            <Pressable
              style={({ pressed }) => [
                styles.SendCodeButton,
                pressed && styles.SendCodeButtonPressed,
              ]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.SendCode}>Confirm</Text>
              )}
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    paddingTop: 40,
  },
  new: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
  passwordContainer: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f6b800',
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
    fontSize: 15,
    color: '#111827',
  },
  eyeIconBtn: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  SendCodeButton: {
    height: 48,
    backgroundColor: '#e60000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginHorizontal: 50,
  },
  SendCodeButtonPressed: {
    opacity: 0.85,
  },
  SendCode: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 16,
  },
});
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { getToken } from './Role';

const YOUR_PC_IP = '192.168.1.40'; // Keep synced with your PC IP
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',     // Brand yellow
  red: '#EC0000',        // Primary buttons, alert icons
  cream: '#FFFDF5',      // Light cream screen background
  modalCream: '#FDFBF0', // Confirmation dialog surface
  white: '#FFFFFF',      // Input fields, text on red buttons
  nearBlack: '#0F1015',  // Titles, labels, and body text
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePressConfirm = () => {
    setErrorMsg(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    if (newPassword === 'Mr-liempo123' || newPassword === 'Mr.liempo123') {
      setErrorMsg('Please choose a password different from the default password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setConfirmModalVisible(true);
  };

  const handleSaveNewPassword = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.put(
        `${API_URL}/protected/change-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setConfirmModalVisible(false);

      // Automatically land on Home Page after changing default password
      if (params.role?.toLowerCase() === 'cashier') {
        router.replace('/dashboard module/cashier-dashboard' as Href);
      } else {
        router.replace('/dashboard module/dashboard' as Href);
      }
    } catch (err: any) {
      setConfirmModalVisible(false);
      setErrorMsg(
        err.response?.data?.message || 'Failed to update password. Please try again.'
      );
    } finally {
      setSubmitting(false);
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Top Bar (Back Arrow on Left) */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.replace('/')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={30} color={COLORS.nearBlack} />
              </TouchableOpacity>
            </View>

            {/* Circular Open-Padlock Icon */}
            <View style={styles.lockCircle}>
              <MaterialCommunityIcons name="lock-open" size={64} color={COLORS.red} />
            </View>

            {/* Title & Security Subtitle */}
            <Text style={styles.pageTitle}>Change Password</Text>
            <Text style={styles.subtitle}>
              Kindly enter your new password to ensure account's security.
            </Text>

            {/* Input Fields with Eye Icons */}
            <View style={styles.formSection}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      setErrorMsg(null);
                    }}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeIconBtn}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      setErrorMsg(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeIconBtn}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {/* Primary Red Confirm Button */}
            <TouchableOpacity
              style={styles.confirmMainBtn}
              activeOpacity={0.85}
              onPress={handlePressConfirm}
            >
              <Text style={styles.confirmMainBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Change Password Confirmation Dialog */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="lock" size={50} color={COLORS.red} />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}change your password?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={() => setConfirmModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.85}
                onPress={handleSaveNewPassword}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 26,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 22,
  },
  lockCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1,
    borderColor: COLORS.nearBlack,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: COLORS.nearBlack,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: COLORS.nearBlack,
    marginBottom: 34,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
    gap: 20,
    marginBottom: 24,
  },
  fieldGroup: {
    width: '100%',
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    marginBottom: 6,
    marginLeft: 2,
  },
  passwordContainer: {
    width: '100%',
    height: 50,
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
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.red,
    marginBottom: 14,
    textAlign: 'center',
  },
  confirmMainBtn: {
    marginTop: 10,
    width: 220,
    height: 48,
    backgroundColor: COLORS.red,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmMainBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 21, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.modalCream,
    borderRadius: 34,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalIconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: COLORS.nearBlack,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.white,
  },
  modalPrompt: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: COLORS.red,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
    fontSize: 12.5,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 12.5,
  },
});
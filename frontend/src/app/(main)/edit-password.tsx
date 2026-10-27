import React, { useState, useEffect } from 'react';
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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { showAlert } from '@/utils/alert';
import { API_URL } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getDarkMode, setGlobalDarkMode, getUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';


// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',     // Brand yellow
  red: '#EC0000',        // Primary buttons, links, alert icons
  cream: '#FFFDF5',      // Light cream screen background
  modalCream: '#FDFBF0', // Confirmation dialog background
  white: '#FFFFFF',      // Input fields, cards, text on red buttons
  nearBlack: '#0F1015',  // Titles, labels, and body text
  darkBg: '#181920',
  darkCard: '#22242E',
};

export default function EditPasswordScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Role, Dark Mode & Side Drawer State
  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState<boolean>(getDarkMode());
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const isCashierDark = role === 'cashier' && darkMode;
  const iconColor = isCashierDark ? COLORS.white : COLORS.nearBlack;
  const textColor = { color: iconColor };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenConfirmModal = () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      showAlert('Invalid Password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Password Mismatch', 'New Password and Confirm New Password do not match.');
      return;
    }
    setConfirmModalVisible(true);
  };

  const handleConfirmPasswordChange = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.put(
        `${API_URL}/protected/change-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmModalVisible(false);
      showAlert('Success', 'Your password has been updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setConfirmModalVisible(false);
      showAlert('Error', err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={[styles.center, isCashierDark && { backgroundColor: COLORS.darkBg }]}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: COLORS.darkBg }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />
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
            {/* Top Bar (Back Arrow on Left, Menu on Right) */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={30} color={iconColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="menu" size={32} color={iconColor} />
              </TouchableOpacity>
            </View>

            {/* Top Circular Open-Padlock Icon */}
            <View
              style={[
                styles.lockCircle,
                isCashierDark && {
                  backgroundColor: COLORS.darkCard,
                  borderColor: COLORS.white,
                },
              ]}
            >
              <MaterialCommunityIcons name="lock-open" size={64} color={COLORS.red} />
            </View>

            <Text style={[styles.pageTitle, textColor]}>Edit Password</Text>
            <Text style={[styles.subtitle, textColor]}>Kindly enter your new password.</Text>

            {/* Password Input Fields */}
            <View style={styles.formSection}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, textColor]}>New Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[
                      styles.inputBox,
                      styles.inputWithIcon,
                      isCashierDark && {
                        backgroundColor: COLORS.darkCard,
                        color: COLORS.white,
                      },
                    ]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder=""
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    style={styles.eyeIconBtn}
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={isCashierDark ? '#D1D5DB' : '#6B7280'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, textColor]}>Confirm New Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[
                      styles.inputBox,
                      styles.inputWithIcon,
                      isCashierDark && {
                        backgroundColor: COLORS.darkCard,
                        color: COLORS.white,
                      },
                    ]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder=""
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    style={styles.eyeIconBtn}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={isCashierDark ? '#D1D5DB' : '#6B7280'}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Primary Confirm Button */}
            <TouchableOpacity
              style={styles.confirmMainBtn}
              activeOpacity={0.85}
              onPress={handleOpenConfirmModal}
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
          <View
            style={[
              styles.modalCard,
              isCashierDark && { backgroundColor: COLORS.darkCard },
            ]}
          >
            {/* Closed Padlock Icon in Circle */}
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="lock" size={50} color={COLORS.red} />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}change your password?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmPasswordChange}
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

      {/* Role-Aware Side Menu Drawer */}
      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role={role}
        darkMode={darkMode}
        onToggleDarkMode={() => setGlobalDarkMode(!darkMode)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 20,
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
    fontSize: 11,
    color: COLORS.nearBlack,
    marginBottom: 34,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
    gap: 20,
    marginBottom: 38,
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
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  eyeIconBtn: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBox: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.nearBlack,
  },
  confirmMainBtn: {
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
  /* Confirmation Dialog Styles */
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
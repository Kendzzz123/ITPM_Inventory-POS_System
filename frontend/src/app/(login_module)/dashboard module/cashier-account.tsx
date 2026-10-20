import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { getToken, clearToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  drawerCream: '#FDE8AA',
  modalCream: '#FDFBF0',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

export default function CashierAccountScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  const [account, setAccount] = useState({
    name: 'Juan Dela Cruz',
    phone: '09123456789',
    formattedDate: 'July 7, 2025',
  });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Side Menu & Logout Confirmation Dialog State
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const loadProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.account) {
        const acc = res.data.account;
        setAccount({
          name: acc.name || 'Juan Dela Cruz',
          phone: acc.phone || '09123456789',
          formattedDate: acc.formattedDate || 'July 7, 2025',
        });
      }
    } catch {
      // Keep default fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace('/');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && { backgroundColor: '#181920' }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color={COLORS.nearBlack} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openMenu}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color={COLORS.nearBlack} />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Account Information</Text>

          {/* Yellow Avatar Circle */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={78} color="#9e7b08" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.red} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.infoList}>
              {/* Name */}
              <View style={[styles.infoRow, styles.rowDivider]}>
                <View style={styles.iconCol}>
                  <Ionicons name="person-outline" size={44} color={COLORS.nearBlack} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{account.name}</Text>
                </View>
              </View>

              {/* Contact Number */}
              <View style={[styles.infoRow, styles.rowDivider]}>
                <View style={styles.iconCol}>
                  <Feather name="phone-call" size={38} color={COLORS.nearBlack} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{account.phone}</Text>
                </View>
              </View>

              {/* Employment Date */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={44}
                    color={COLORS.nearBlack}
                  />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Employment Date</Text>
                  <Text style={styles.infoValue}>{account.formattedDate}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Bottom Edit Password Button */}
          <View style={styles.bottomBtnWrapper}>
            <TouchableOpacity
              style={styles.editPasswordBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/dashboard module/edit-password' as any)}
            >
              <Text style={styles.editPasswordBtnText}>Edit Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Side Drawer Modal */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />

          <Animated.View
            style={[
              styles.drawerContainer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <View style={styles.drawerTopHeader}>
              <TouchableOpacity
                onPress={closeMenu}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={28} color={COLORS.nearBlack} />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerWhiteList}>
              <TouchableOpacity
                style={[styles.drawerRow, styles.drawerRowBorder]}
                onPress={() => setDarkMode(!darkMode)}
              >
                <View style={styles.drawerIconCol}>
                  <MaterialCommunityIcons
                    name={darkMode ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={42}
                    color={COLORS.red}
                  />
                </View>
                <Text style={styles.drawerRowText}>Switch to Dark Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerRow} onPress={closeMenu}>
                <View style={styles.drawerIconCol}>
                  <Ionicons name="person-outline" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerRowText}>Account Information</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                closeMenu();
                setTimeout(() => setLogoutModalVisible(true), 220);
              }}
            >
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Logout Confirmation Dialog matching image_b90aa0.png */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="logout" size={46} color={COLORS.red} />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to log{'\n'}out your account?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLogout}>
                <Text style={styles.confirmBtnText}>Confirm</Text>
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
    maxWidth: 440,
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 14,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginBottom: 22,
  },
  avatarCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: COLORS.yellow,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 34,
  },
  infoList: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
  },
  iconCol: {
    width: 56,
    alignItems: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  bottomBtnWrapper: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 24,
  },
  editPasswordBtn: {
    width: 220,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPasswordBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 12.5,
  },
  /* Drawer Styles */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: COLORS.drawerCream,
    justifyContent: 'flex-start',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
  },
  drawerTopHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  drawerWhiteList: {
    backgroundColor: '#FFFDF9',
    width: '100%',
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  drawerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE6',
  },
  drawerIconCol: {
    width: 52,
    alignItems: 'center',
    marginRight: 14,
  },
  drawerRowText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    marginTop: 28,
    marginHorizontal: 38,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 13.5,
  },
  /* Logout Confirmation Modal matching image_b90aa0.png */
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
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
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { getToken, clearToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36'; // Update with your local IP if needed
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',     // Brand yellow
  red: '#EC0000',        // Primary buttons, links, alert icons
  cream: '#FFFDF5',      // Light cream screen background
  drawerCream: '#FDF8EA',// Side menu surface
  modalCream: '#FDFBF0', // Confirmation dialog surface
  white: '#FFFFFF',      // Input fields, cards, text on red buttons
  nearBlack: '#0F1015',  // Titles, labels, and body text
};

type AccountData = {
  id: number;
  name: string;
  phone: string;
  email: string;
  formattedDate: string;
  slashDate: string;
  role: string;
};

export default function AccountInfoScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [account, setAccount] = useState<AccountData>({
    id: 1,
    name: 'Mike Reyes',
    phone: '09123456789',
    email: 'reyesmike@gmail.com',
    formattedDate: 'March 4, 2022',
    slashDate: '03/04/2022',
    role: 'manager',
  });
  const [loading, setLoading] = useState(true);

  // Side Drawer & Logout Confirmation Modal State
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const loadAccount = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.account) {
        const acc = res.data.account;
        setAccount({
          id: acc.id || 1,
          name: acc.name || 'Mike Reyes',
          phone: acc.phone || '09123456789',
          email: acc.email || 'reyesmike@gmail.com',
          formattedDate: acc.formattedDate || 'March 4, 2022',
          slashDate: acc.slashDate || '03/04/2022',
          role: acc.role || 'manager',
        });
      }
    } catch {
      // Keep default fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

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

  const navigateFromDrawer = (path: string) => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      router.push(path as any);
    });
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace('/');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
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

          {/* Large Brand Yellow Avatar */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={78} color="#9e7b08" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.red} style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.infoList}>
              {/* Name */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Ionicons name="person-outline" size={42} color={COLORS.nearBlack} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{account.name}</Text>
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Feather name="phone-call" size={36} color={COLORS.nearBlack} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{account.phone}</Text>
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Ionicons name="mail" size={40} color={COLORS.nearBlack} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{account.email}</Text>
                </View>
              </View>

              {/* Employment Date */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={42}
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

          {/* Staff Management Navigation Card */}
          <TouchableOpacity
            style={styles.staffCard}
            activeOpacity={0.85}
            onPress={() => router.push('/dashboard module/staff-management' as any)}
          >
            <Ionicons name="person-outline" size={28} color="#9e7b08" />
            <Text style={styles.staffCardText}>Staff Management</Text>
            <Ionicons name="chevron-forward" size={22} color={COLORS.red} />
          </TouchableOpacity>

          {/* Bottom Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.editAccountBtn}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/dashboard module/edit-staff' as any,
                  params: {
                    id: String(account.id),
                    name: account.name,
                    phone: account.phone,
                    email: account.email,
                    date: account.slashDate,
                  },
                })
              }
            >
              <Text style={styles.editAccountBtnText}>Edit Account</Text>
            </TouchableOpacity>

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
            <TouchableOpacity
              style={styles.drawerCloseBtn}
              onPress={closeMenu}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={28} color={COLORS.nearBlack} />
            </TouchableOpacity>

            <View style={styles.drawerMenuWrapper}>
              <TouchableOpacity style={styles.drawerItem} onPress={closeMenu}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="person-outline" size={38} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Account Information</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/stock-alert')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="notifications" size={38} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Stock Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/manage-price')}
              >
                <View style={styles.drawerIconBox}>
                  <MaterialCommunityIcons name="tag-multiple" size={38} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Manage Price</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/stocks')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="eye-outline" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Live Stock Count</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/record-waste')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="document-text-outline" size={38} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Record Waste</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/waste-history')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="trash-outline" size={38} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Waste History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                closeMenu();
                setTimeout(() => setLogoutModalVisible(true), 240);
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
            <View style={styles.iconCircle}>
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
    paddingHorizontal: 22,
  },
  container: {
    width: '100%',
    maxWidth: 440,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 12,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: COLORS.yellow,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  infoList: {
    paddingHorizontal: 12,
    gap: 20,
    marginBottom: 26,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 1,
  },
  infoValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  staffCardText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins_400Regular_Italic',
    fontSize: 10,
    color: COLORS.nearBlack,
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  editAccountBtn: {
    width: 210,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAccountBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
    fontSize: 12,
  },
  editPasswordBtn: {
    width: 210,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPasswordBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 12,
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
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
  /* Side Drawer Styles */
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
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: 22,
    paddingBottom: 32,
    justifyContent: 'flex-start',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
  },
  drawerCloseBtn: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 24,
  },
  drawerMenuWrapper: {
    gap: 26,
    marginTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerIconBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  drawerItemText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    marginTop: 40,
    marginHorizontal: 18,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 14,
  },
});
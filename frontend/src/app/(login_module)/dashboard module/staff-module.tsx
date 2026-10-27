import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import axios from 'axios';
import { getToken, clearToken } from '../Role';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from '@expo-google-fonts/poppins';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  drawerCream: '#FDF8EA',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

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
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
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

  /* ── Drawer helpers ── */
  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 260,
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

  const navigateTo = (route: string) => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      router.push(route as Href);
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openMenu}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Account Information</Text>

          {/* Large Yellow Avatar */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={78} color="#9e7b08" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#ef0000" style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.infoList}>
              {/* Name */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Ionicons name="person-outline" size={42} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{account.name}</Text>
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Feather name="phone-call" size={36} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{account.phone}</Text>
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Ionicons name="mail" size={40} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{account.email}</Text>
                </View>
              </View>

              {/* Employment Date */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={42} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Employment Date</Text>
                  <Text style={styles.infoValue}>{account.formattedDate}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Staff Management Card */}
          <TouchableOpacity
            style={styles.staffCard}
            onPress={() => router.push('/dashboard module/staff-management' as Href)}
          >
            <Ionicons name="person-outline" size={28} color="#9e7b08" />
            <Text style={styles.staffCardText}>Staff Management</Text>
            <Ionicons name="chevron-forward" size={22} color="#ef0000" />
          </TouchableOpacity>

          {/* Bottom Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.editAccountBtn}
              onPress={() =>
                router.push({
                  pathname: '/dashboard module/edit-staff' as Href,
                  params: {
                    id: String(account.id),
                    name: account.name,
                    phone: account.phone,
                    email: account.email,
                    date: account.slashDate,
                  },
                } as any)
              }
            >
              <Text style={styles.editAccountBtnText}>Edit Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editPasswordBtn}
              onPress={() => router.push('/forgotpassword' as Href)}
            >
              <Text style={styles.editPasswordBtnText}>Edit Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Side Drawer Modal ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <TouchableOpacity style={styles.drawerCloseBtn} onPress={closeMenu}>
              <Ionicons name="close" size={28} color={COLORS.nearBlack} />
            </TouchableOpacity>

            <View style={styles.drawerMenuWrapper}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/account-info')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="person-outline" size={40} color={COLORS.nearBlack} />
                </View>
                <Text style={styles.drawerItemText}>Account Information</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/stock-alert')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="notifications" size={40} color={COLORS.nearBlack} />
                </View>
                <Text style={styles.drawerItemText}>Stock Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/manage-price')}>
                <View style={styles.drawerIconBox}>
                  <MaterialCommunityIcons name="tag-multiple" size={40} color={COLORS.nearBlack} />
                </View>
                <Text style={styles.drawerItemText}>Manage Price</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/stocks')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="eye-outline" size={42} color={COLORS.nearBlack} />
                </View>
                <Text style={styles.drawerItemText}>Live Stock Count</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/record-waste')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="document-text-outline" size={40} color={COLORS.nearBlack} />
                </View>
                <Text style={styles.drawerItemText}>Record Waste</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/waste-history')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="trash-outline" size={40} color={COLORS.nearBlack} />
                </View>
                <Text style={styles.drawerItemText}>Waste History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                closeMenu();
                setTimeout(() => setLogoutModalVisible(true), 300);
              }}
            >
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.drawerModalBackdrop}>
          <View style={styles.drawerModalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="log-out" size={48} color={COLORS.red} />
            </View>
            <Text style={styles.drawerModalPrompt}>
              Are you sure you want to{'\n'}log out?
            </Text>
            <View style={styles.drawerModalBtnRow}>
              <TouchableOpacity style={styles.drawerCancelBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.drawerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerConfirmBtn} onPress={handleConfirmLogout}>
                <Text style={styles.drawerConfirmBtnText}>Confirm</Text>
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
    backgroundColor: '#fffdf5',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffdf5',
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
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#fbcb04',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  infoList: {
    paddingHorizontal: 12,
    gap: 22,
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
    fontSize: 11.5,
    color: '#374151',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf9ea',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  staffCardText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#1f2937',
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 12,
  },
  editAccountBtn: {
    width: 210,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef0000',
    backgroundColor: '#fffdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAccountBtnText: {
    color: '#ef0000',
    fontSize: 12.5,
    fontWeight: '800',
  },
  editPasswordBtn: {
    width: 210,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ef0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPasswordBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  /* ── Drawer styles ── */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  drawerContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.drawerCream,
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingHorizontal: 22,
    paddingBottom: 34,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  drawerCloseBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
  },
  drawerMenuWrapper: {
    flex: 1,
    gap: 6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  drawerIconBox: {
    width: 48,
    alignItems: 'center',
    marginRight: 14,
  },
  drawerItemText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    alignSelf: 'center',
    backgroundColor: COLORS.red,
    paddingVertical: 12,
    paddingHorizontal: 44,
    borderRadius: 25,
    marginTop: 12,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  drawerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  drawerModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fdfbf0',
    borderRadius: 34,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 10,
  },
  modalIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fffdf7',
  },
  drawerModalPrompt: {
    fontSize: 16,
    color: COLORS.red,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  drawerModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  drawerCancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerCancelBtnText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: '700',
  },
  drawerConfirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
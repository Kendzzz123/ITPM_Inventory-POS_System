import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
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

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  drawerCream: '#FDE8AA',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

export default function CashierDashboardScreen() {
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

  const [userName, setUserName] = useState('Juan Dela Cruz');
  const [chickenStock, setChickenStock] = useState(100);
  const [porkStock, setPorkStock] = useState(100);
  const [alertMessage, setAlertMessage] = useState('Raw Chicken and Raw Pork are running low!');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Side Drawer & Logout Modal
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const [accRes, stockRes] = await Promise.all([
        axios
          .get(`${API_URL}/protected/account`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        axios
          .get(`${API_URL}/protected/stocks`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
      ]);

      if (accRes?.data?.account?.name) {
        setUserName(accRes.data.account.name);
      }

      if (stockRes?.data?.stocks) {
        const list: any[] = stockRes.data.stocks;
        const chk = list.find((s) => s.name.toLowerCase().includes('chicken'));
        const prk = list.find((s) => s.name.toLowerCase().includes('pork'));
        if (chk) setChickenStock(chk.quantity);
        if (prk) setPorkStock(prk.quantity);

        const lowItems = list.filter((s) => s.quantity <= s.minLevel).map((s) => s.name);
        if (lowItems.length > 0) {
          setAlertMessage(`${lowItems.slice(0, 2).join(' and ')} are running low!`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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

  const navigateTo = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace('/');
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, darkMode && { backgroundColor: '#181920' }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.red]} />
        }
      >
        <View style={styles.container}>
          {/* Top Hamburger Icon */}
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={openMenu}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={34} color={COLORS.nearBlack} />
            </TouchableOpacity>
          </View>

          {/* Profile Greeting */}
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person-outline" size={44} color="#9e7b08" />
            </View>
            <View style={styles.welcomeCol}>
              <Text style={styles.welcomeLabel}>Welcome,</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
            </View>
          </View>

          {/* Inventory Section */}
          <Text style={styles.sectionTitle}>Inventory</Text>

          <View style={styles.inventoryGrid}>
            {/* Raw Chicken Card */}
            <View style={styles.stockCard}>
              <View style={styles.imageArea}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80',
                  }}
                  style={styles.stockImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.stockFooter}>
                <Text style={styles.stockName}>Raw Chicken</Text>
                <Text style={styles.stockCount}>{chickenStock}</Text>
              </View>
            </View>

            {/* Raw Pork Card */}
            <View style={styles.stockCard}>
              <View style={styles.imageArea}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=400&q=80',
                  }}
                  style={styles.stockImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.stockFooter}>
                <Text style={styles.stockName}>Raw Pork</Text>
                <Text style={styles.stockCount}>{porkStock}</Text>
              </View>
            </View>
          </View>

          {/* Warning Banner */}
          <TouchableOpacity
            style={styles.warningBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/dashboard module/stock-alert' as any)}
          >
            <Ionicons name="warning" size={24} color="#856806" />
            <Text style={styles.warningText} numberOfLines={1}>
              {alertMessage}
            </Text>
          </TouchableOpacity>

          {/* See All Link */}
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/dashboard module/stocks' as any)}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>

          {/* Navigation Action Cards */}
          <View style={styles.actionList}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/dashboard module/pos' as any)}
            >
              <MaterialCommunityIcons name="cash-register" size={32} color="#9e7b08" />
              <Text style={styles.actionCardText}>Point-of-Sale</Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/TransactionHistory' as any)}
            >
              <Ionicons name="document-text-outline" size={32} color="#9e7b08" />
              <Text style={styles.actionCardText}>Transaction History</Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Side Drawer Modal matching image_abc136.png */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />

          <Animated.View
            style={[
              styles.drawerContainer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Top Cream Header with Close X */}
            <View style={styles.drawerTopHeader}>
              <TouchableOpacity
                onPress={closeMenu}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={28} color={COLORS.nearBlack} />
              </TouchableOpacity>
            </View>

            {/* White Menu Rows */}
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

              <TouchableOpacity
                style={styles.drawerRow}
                onPress={() => navigateTo('/dashboard module/cashier-account')}
              >
                <View style={styles.drawerIconCol}>
                  <Ionicons name="person-outline" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerRowText}>Account Information</Text>
              </TouchableOpacity>
            </View>

            {/* Log out Button */}
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

      {/* Logout Confirmation Dialog */}
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
              Are you sure you want to{'\n'}log out your account?
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
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 460,
  },
  topRow: {
    alignItems: 'flex-end',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCol: {
    flex: 1,
  },
  welcomeLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.nearBlack,
  },
  userName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: COLORS.nearBlack,
  },
  sectionTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    color: COLORS.nearBlack,
    marginBottom: 14,
  },
  inventoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stockCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.yellow,
    overflow: 'hidden',
  },
  imageArea: {
    height: 115,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockImg: {
    width: '90%',
    height: '90%',
  },
  stockFooter: {
    backgroundColor: '#FFD428',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stockName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: COLORS.nearBlack,
  },
  stockCount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11.5,
    color: COLORS.nearBlack,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderWidth: 1.2,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular_Italic',
    fontSize: 10.5,
    color: '#856806',
  },
  seeAllBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 18,
  },
  seeAllText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: COLORS.red,
    textDecorationLine: 'underline',
  },
  actionList: {
    gap: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionCardText: {
    flex: 1,
    marginLeft: 14,
    fontFamily: 'Poppins_400Regular_Italic',
    fontSize: 12,
    color: COLORS.nearBlack,
  },
  /* Drawer Styles matching image_abc136.png */
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
  /* Confirmation Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FDFBF0',
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
    height: 50,
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
    height: 50,
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
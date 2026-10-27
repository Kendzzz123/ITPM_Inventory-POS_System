// cashier-dashboard.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { API_URL } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { getDarkMode, setGlobalDarkMode, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';


const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
  darkBg: '#181920',
  darkCard: '#22242E',
};

export default function CashierDashboardScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [userName, setUserName] = useState('');
  const [chickenStock, setChickenStock] = useState(0);
  const [porkStock, setPorkStock] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [darkMode, setDarkMode] = useState(getDarkMode());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const textColor = { color: darkMode ? COLORS.white : COLORS.nearBlack };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
    });
  }, []);

  const toggleDarkMode = () => {
    setGlobalDarkMode(!darkMode);
  };

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [accRes, stockRes] = await Promise.all([
        axios.get(`${API_URL}/protected/account`, { headers }),
        axios.get(`${API_URL}/protected/stocks`, { headers }),
      ]);

      const account = accRes.data?.account;
      setUserName(account?.name || account?.username || '');
      setGlobalUserRole(account?.role);

      const list: { name: string; quantity: number; minLevel: number }[] =
        stockRes.data?.stocks || [];
      const chk = list.find((s) => s.name.toLowerCase().includes('chicken'));
      const prk = list.find((s) => s.name.toLowerCase().includes('pork'));
      setChickenStock(Number(chk?.quantity ?? 0));
      setPorkStock(Number(prk?.quantity ?? 0));

      const lowItems = list.filter((s) => s.quantity <= s.minLevel).map((s) => s.name);
      if (lowItems.length === 0) {
        setAlertMessage('All stocks are at a healthy level.');
      } else if (lowItems.length === 1) {
        setAlertMessage(`${lowItems[0]} is running low!`);
      } else {
        const extra = lowItems.length > 2 ? ` (+${lowItems.length - 2} more)` : '';
        setAlertMessage(`${lowItems.slice(0, 2).join(' and ')}${extra} are running low!`);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      setAlertMessage(err.response?.data?.message || 'Could not reach the server. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload whenever the screen comes back into focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.center, darkMode && { backgroundColor: COLORS.darkBg }]}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, darkMode && { backgroundColor: COLORS.darkBg }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
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
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="menu"
                size={34}
                color={darkMode ? COLORS.white : COLORS.nearBlack}
              />
            </TouchableOpacity>
          </View>

          {/* Profile Greeting */}
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person-outline" size={44} color="#9e7b08" />
            </View>
            <View style={styles.welcomeCol}>
              <Text style={[styles.welcomeLabel, textColor]}>Welcome,</Text>
              <Text style={[styles.userName, textColor]} numberOfLines={1}>
                {userName}
              </Text>
            </View>
          </View>

          {/* Inventory Section */}
          <Text style={[styles.sectionTitle, textColor]}>Inventory</Text>

          <View style={styles.inventoryGrid}>
            <View style={[styles.stockCard, darkMode && { backgroundColor: COLORS.darkCard }]}>
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

            <View style={[styles.stockCard, darkMode && { backgroundColor: COLORS.darkCard }]}>
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
            style={[styles.warningBanner, darkMode && { backgroundColor: COLORS.darkCard }]}
            activeOpacity={0.85}
            onPress={() => router.push('/stock-alert' as Href)}
          >
            <Ionicons name="warning" size={24} color={COLORS.yellow} />
            <Text
              style={[styles.warningText, darkMode && { color: COLORS.yellow }]}
              numberOfLines={1}
            >
              {alertMessage}
            </Text>
          </TouchableOpacity>

          {/* See All Link */}
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/stocks' as Href)}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>

          {/* Navigation Action Cards */}
          <View style={styles.actionList}>
            <TouchableOpacity
              style={[styles.actionCard, darkMode && { backgroundColor: COLORS.darkCard }]}
              onPress={() => router.push('/pos' as Href)}
            >
              <MaterialCommunityIcons name="cash-register" size={32} color={COLORS.yellow} />
              <Text style={[styles.actionCardText, textColor]}>Point-of-Sale</Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, darkMode && { backgroundColor: COLORS.darkCard }]}
              onPress={() => router.push('/transaction-history' as Href)}
            >
              <Ionicons name="document-text-outline" size={32} color={COLORS.yellow} />
              <Text style={[styles.actionCardText, textColor]}>Transaction History</Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role="cashier"
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
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
});
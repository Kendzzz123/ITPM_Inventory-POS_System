// cashier-dashboard.tsx
import React, { useState, useCallback } from 'react';
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
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { setGlobalUserRole } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { imageFor } from '@/constants/images';

/** Stock shown on the cashier home cards (names match the POS menu and Stocks page). */
const FEATURED_STOCK = ['Whole Juicy Chicken', 'Liempo'];


const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
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
  const [featuredStock, setFeaturedStock] = useState(
    FEATURED_STOCK.map((name) => ({ name, quantity: 0 }))
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const textColor = { color: COLORS.nearBlack };

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [accRes, stockRes] = await Promise.all([
        api.get(API_ROUTES.ACCOUNT, { headers }),
        api.get(API_ROUTES.STOCKS, { headers }),
      ]);

      const account = accRes.data?.account;
      setUserName(account?.name || account?.username || '');
      setGlobalUserRole(account?.role);

      const list: { name: string; quantity: number; minLevel: number }[] =
        stockRes.data?.stocks || [];
      setFeaturedStock(
        FEATURED_STOCK.map((name) => ({
          name,
          quantity: Number(
            list.find((s) => s.name.toLowerCase() === name.toLowerCase())?.quantity ?? 0
          ),
        }))
      );

      
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

  // While the Home Page stays open, the inventory preview updates every 15 seconds.
  // A failed refresh keeps the last numbers on screen (no pop-up).
  useAutoRefresh(loadData);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" />
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
                color={COLORS.nearBlack}
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
            {featuredStock.map((item) => (
              <View
                key={item.name}
                style={styles.stockCard}
              >
                <View style={styles.imageArea}>
                  <Image
                    source={imageFor(item.name)}
                    style={styles.stockImg}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.stockFooter}>
                  <Text style={styles.stockName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.stockCount}>{item.quantity}</Text>
                </View>
              </View>
            ))}
          </View>

          

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
              style={styles.actionCard}
              onPress={() => router.push('/pos' as Href)}
            >
              <MaterialCommunityIcons name="cash-register" size={32} color={COLORS.yellow} />
              <Text style={[styles.actionCardText, textColor]}>Point-of-Sale</Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.red} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
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
    flexShrink: 1,
    marginRight: 6,
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: COLORS.nearBlack,
  },
  stockCount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11.5,
    color: COLORS.nearBlack,
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
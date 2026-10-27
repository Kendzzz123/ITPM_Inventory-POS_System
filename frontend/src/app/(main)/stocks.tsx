// stocks.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { API_URL } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { imageFor } from '@/constants/images';
import { showAlert } from '@/utils/alert';
import { getDarkMode, setGlobalDarkMode, getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';


type StockCardItem = {
  id: number;
  name: string;
  quantity: number;
  image: string;
};

export default function StocksScreen() {
  const router = useRouter();

  const [stocks, setStocks] = useState<StockCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState(getDarkMode());

  const isCashierDark = role === 'cashier' && darkMode;
  const iconColor = isCashierDark ? '#FFFFFF' : '#111827';

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  const loadStocks = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const [accRes, res] = await Promise.all([
        axios
          .get(`${API_URL}/protected/account`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        axios.get(`${API_URL}/protected/stocks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (accRes?.data?.account?.role) {
        const fetchedRole =
          accRes.data.account.role.toLowerCase() === 'manager' ? 'manager' : 'cashier';
        setRole(fetchedRole);
        setGlobalUserRole(fetchedRole);
      }

      const dbStocks: { id: number; name: string; quantity: number }[] = res.data?.stocks || [];
      setStocks(
        dbStocks.map((s) => ({
          id: s.id,
          name: s.name,
          quantity: Number(s.quantity),
          image: imageFor(s.name),
        }))
      );
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Could not load stocks. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload whenever the screen comes back into focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      loadStocks();
    }, [loadStocks])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStocks();
    setRefreshing(false);
  }, [loadStocks]);

  return (
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: '#181920' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e60000']} />
        }
      >
        <View style={styles.container}>
          {/* Top Navigation Bar */}
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

          <Text style={[styles.pageTitle, { color: iconColor }]}>Stocks</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {stocks.map((item) => (
                <View
                  key={item.id}
                  style={[styles.stockCard, isCashierDark && { backgroundColor: '#22242E' }]}
                >
                  <View
                    style={[
                      styles.imageWrapper,
                      isCashierDark && { backgroundColor: '#22242E' },
                    ]}
                  >
                    <Image
                      source={{ uri: item.image }}
                      style={styles.stockImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.stockName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.stockQty}>{item.quantity}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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
    backgroundColor: '#fffdf5',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  stockCard: {
    width: '47.5%',
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 115,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffdf8',
  },
  stockImage: {
    width: '90%',
    height: '90%',
    borderRadius: 8,
  },
  cardFooter: {
    backgroundColor: '#ffd428',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stockName: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    marginRight: 4,
  },
  stockQty: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#111827',
  },
});
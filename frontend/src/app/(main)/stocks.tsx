/**
 * @file stocks.tsx
 * @description Inventory: one card per menu item with how many are left
 * (red when low). Tap a card to open it (stock-item.tsx), where the manager
 * can restock it.
 */
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
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { fetchInventory, type InventoryCard } from '@/services/inventory';
import { showAlert } from '@/utils/alert';
import { formatNumber } from '@/utils/stock';
import { getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';

export default function StocksScreen() {
  const router = useRouter();

  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());

  const iconColor = '#111827';

  useEffect(() => {
    return subscribeAppTheme(() => {
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

      const [accRes, inventory] = await Promise.all([
        api
          .get(API_ROUTES.ACCOUNT, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        fetchInventory(token),
      ]);

      if (accRes?.data?.account?.role) {
        const fetchedRole =
          accRes.data.account.role.toLowerCase() === 'manager' ? 'manager' : 'cashier';
        setRole(fetchedRole);
        setGlobalUserRole(fetchedRole);
      }

      setCards(inventory);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Could not load the inventory. Pull down to retry.');
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

  const openCard = (card: InventoryCard) =>
    router.push(`/stock-item?name=${encodeURIComponent(card.name)}` as Href);

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

          <Text style={[styles.pageTitle, { color: iconColor }]}>Inventory</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {cards.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={styles.stockCard}
                  activeOpacity={0.8}
                  onPress={() => openCard(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}: ${formatNumber(item.quantity)} left${item.isLow ? ', low stock' : ''}`}
                >
                  <View style={styles.imageWrapper}>
                    <Image source={item.image} style={styles.stockImage} resizeMode="contain" />
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.stockName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.stockQty, item.isLow && styles.stockQtyLow]}>
                      {formatNumber(item.quantity)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role={role}
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
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // an odd last card sits in the middle
    rowGap: 16,
  },
  stockCard: {
    width: '47.5%',
    marginHorizontal: '1.25%',
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
    minHeight: 54, // same height for one- and two-line names, so cards line up
    backgroundColor: '#ffd428',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stockName: {
    fontSize: 10.5,
    fontFamily: 'Poppins_500Medium',
    color: '#111827',
    flex: 1,
    marginRight: 4,
  },
  stockQty: {
    fontSize: 11.5,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  stockQtyLow: {
    color: '#EC0000',
  },
});

// TEST: low items show a red number; tapping a card opens /stock-item?name=<item>

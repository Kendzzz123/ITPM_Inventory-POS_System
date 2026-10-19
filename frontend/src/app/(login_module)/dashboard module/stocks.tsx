import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken, clearToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

type StockCardItem = {
  id: number;
  name: string;
  quantity: number;
  image: string;
};

const STOCK_IMAGES: Record<string, string> = {
  'Raw Chicken': 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80',
  'Raw Pork': 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=400&q=80',
  'Regular Chorizo': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  'Spicy Chorizo': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  'Atsara': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  'Sarsa (Gravy)': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
};

const DEFAULT_DISPLAY_ITEMS = [
  'Raw Chicken',
  'Raw Pork',
  'Regular Chorizo',
  'Spicy Chorizo',
  'Atsara',
  'Sarsa (Gravy)',
];

export default function StocksScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

  const [stocks, setStocks] = useState<StockCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const loadStocks = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const res = await axios.get(`${API_URL}/protected/stocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const dbStocks: any[] = res.data.stocks || [];
      const mapped = DEFAULT_DISPLAY_ITEMS.map((itemName, idx) => {
        const match = dbStocks.find(
          (s) => s.name.toLowerCase() === itemName.toLowerCase()
        );
        return {
          id: match?.id || idx + 1,
          name: itemName,
          quantity: match ? match.quantity : 100,
          image: STOCK_IMAGES[itemName],
        };
      });

      setStocks(mapped);
    } catch (err) {
      setStocks(
        DEFAULT_DISPLAY_ITEMS.map((name, idx) => ({
          id: idx + 1,
          name,
          quantity: 100,
          image: STOCK_IMAGES[name],
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStocks();
    setRefreshing(false);
  }, [loadStocks]);

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
    closeMenu();
    router.push(path as any);
  };

  const handleLogout = async () => {
    await clearToken();
    closeMenu();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
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
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={30} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openMenu} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Stocks</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {stocks.map((item) => (
                <View key={item.id} style={styles.stockCard}>
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: item.image }} style={styles.stockImage} resizeMode="contain" />
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

      {/* Side Drawer Modal */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View style={[styles.drawerContainer, { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] }]}>
            <TouchableOpacity style={styles.drawerCloseBtn} onPress={closeMenu}>
              <Feather name="x" size={28} color="#1f2937" />
            </TouchableOpacity>

            <View style={styles.drawerMenuWrapper}>
              <TouchableOpacity style={styles.drawerItem} onPress={closeMenu}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="person-outline" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Account Information</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateFromDrawer('/dashboard module/stock-alert')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="notifications" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Stock Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={closeMenu}>
                <View style={styles.drawerIconBox}>
                  <MaterialCommunityIcons name="tag-multiple" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Manage Price</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateFromDrawer('/dashboard module/stocks')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="eye-outline" size={42} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Live Stock Count</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateFromDrawer('/dashboard module/record-waste')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="document-text-outline" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Record Waste</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateFromDrawer('/dashboard module/waste-history')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="trash-outline" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Waste History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
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
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: '#fdf8ea',
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
    gap: 28,
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
    fontSize: 13.5,
    color: '#1f2937',
  },
  logoutBtn: {
    marginTop: 42,
    marginHorizontal: 18,
    height: 44,
    backgroundColor: '#ef0000',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
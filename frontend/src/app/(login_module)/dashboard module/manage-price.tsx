import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

const ITEM_IMAGES: Record<string, string> = {
  'Whole Juicy Chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=400&q=80',
  'Half Juicy Chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=400&q=80',
  'Liempo': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  'Regular Chorizo': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
  'Spicy Chorizo': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
  'Atsara': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  'Sarsa (Gravy)': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
};

const DEFAULT_MENU: MenuItem[] = [
  { id: 1, name: 'Whole Juicy Chicken', price: 320, image: ITEM_IMAGES['Whole Juicy Chicken'] },
  { id: 2, name: 'Half Juicy Chicken', price: 285, image: ITEM_IMAGES['Half Juicy Chicken'] },
  { id: 3, name: 'Liempo', price: 285, image: ITEM_IMAGES['Liempo'] },
  { id: 4, name: 'Regular Chorizo', price: 140, image: ITEM_IMAGES['Regular Chorizo'] },
  { id: 5, name: 'Spicy Chorizo', price: 145, image: ITEM_IMAGES['Spicy Chorizo'] },
  { id: 6, name: 'Atsara', price: 25, image: ITEM_IMAGES['Atsara'] },
  { id: 7, name: 'Sarsa (Gravy)', price: 7, image: ITEM_IMAGES['Sarsa (Gravy)'] },
];

export default function ManagePriceScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_MENU);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrices = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/menu-items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const dbItems: any[] = res.data?.items || [];
      if (dbItems.length > 0) {
        const merged = DEFAULT_MENU.map((def) => {
          const found = dbItems.find(
            (i) => i.name.toLowerCase() === def.name.toLowerCase()
          );
          return found
            ? { ...def, id: found.id, price: Number(found.price) }
            : def;
        });
        setItems(merged);
      }
    } catch {
      // Fallback to default mockup prices
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrices();
    setRefreshing(false);
  }, [loadPrices]);

  const handleEditPress = (item: MenuItem) => {
    router.push({
      pathname: '/dashboard module/edit-price' as any,
      params: {
        id: String(item.id),
        name: item.name,
        price: String(item.price),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ef0000']} />
        }
      >
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
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Manage Price</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#ef0000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {items.map((item, index) => {
                const isLastOdd = index === items.length - 1 && items.length % 2 !== 0;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, isLastOdd && styles.centeredSingleCard]}
                    activeOpacity={0.85}
                    onPress={() => handleEditPress(item)}
                  >
                    <View style={styles.imageBox}>
                      <Image
                        source={{ uri: item.image }}
                        style={styles.productImage}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.cardBottom}>
                      <View style={styles.textColumn}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemPrice}>₱{item.price}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => handleEditPress(item)}
                      >
                        <Feather name="edit-2" size={22} color="#ef0000" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 460,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  card: {
    width: '48.2%',
    backgroundColor: '#fffdf7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
    padding: 12,
    justifyContent: 'space-between',
  },
  centeredSingleCard: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  imageBox: {
    height: 82,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: '85%',
    height: '100%',
    borderRadius: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textColumn: {
    flex: 1,
    paddingRight: 6,
  },
  itemName: {
    fontSize: 12,
    color: '#1f2937',
    lineHeight: 15,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  editIconBtn: {
    padding: 2,
  },
});
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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import axios from 'axios';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { API_URL } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { imageFor } from '@/constants/images';
import { showAlert } from '@/utils/alert';


type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

export default function ManagePriceScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrices = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await axios.get(`${API_URL}/protected/menu-items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dbItems: { id: number; name: string; price: number }[] = res.data?.items || [];
      setItems(
        dbItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          image: imageFor(i.name),
        }))
      );
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Could not load menu prices.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload whenever the screen comes back into focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      loadPrices();
    }, [loadPrices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrices();
    setRefreshing(false);
  }, [loadPrices]);

  const handleEditPress = (item: MenuItem) => {
    router.push({
      pathname: '/edit-price' as Href,
      params: {
        id: String(item.id),
        name: item.name,
        price: String(item.price),
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
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
              onPress={() => setMenuVisible(true)}
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
      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
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
    marginLeft: 5,
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
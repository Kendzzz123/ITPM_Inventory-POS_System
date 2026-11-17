/**
 * @file stock-item.tsx
 * @description One Inventory item, opened by tapping its card on the Inventory
 * screen (/stock-item?name=Whole Juicy Chicken). Shows the item large with how
 * many are left (red when low). Managers get a Restock button that opens
 * Restock with this item already picked. An item that uses another item's
 * stock (Half Juicy Chicken) restocks that stock.
 */
import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { getToken, clearToken } from '@/services/authService';
import { fetchInventory, type InventoryCard } from '@/services/inventory';
import { getUserRole, subscribeAppTheme } from '@/store/appState';
import { formatNumber } from '@/utils/stock';
import { showAlert } from '@/utils/alert';
import { ROUTES } from '@/constants/routes';

const COLORS = {
  red: '#EC0000',
  yellow: '#FFD428',
  cream: '#FFFDF5',
  card: '#FFFDF8',
  border: '#FCD34D',
  ink: '#111827',
  grey: '#6B7280',
  white: '#FFFFFF',
};

export default function StockItemScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const role = useSyncExternalStore(subscribeAppTheme, getUserRole, getUserRole);

  const [card, setCard] = useState<InventoryCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace(ROUTES.LOGIN);
        return;
      }
      const cards = await fetchInventory(token);
      setCard(cards.find((c) => c.name === name) ?? null);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace(ROUTES.LOGIN);
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Could not load this item.');
    } finally {
      setLoading(false);
    }
  }, [router, name]);

  // Reload when coming back from Restock, so the new count shows.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goRestock = () => {
    if (!card?.stockId) return;
    router.push({ pathname: '/restock', params: { stockId: String(card.stockId) } } as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={30} color={COLORS.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={32} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Inventory</Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.red} style={{ marginTop: 40 }} />
          ) : !card ? (
            <Text style={styles.notFound}>This item is no longer in the inventory.</Text>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.imageWrapper}>
                  <Image source={card.image} style={styles.image} resizeMode="contain" />
                </View>
                <View style={styles.footer}>
                  <Text style={styles.name} numberOfLines={2}>
                    {card.name}
                  </Text>
                  <Text style={[styles.qty, card.isLow && styles.qtyLow]}>{formatNumber(card.quantity)}</Text>
                </View>
              </View>

              {card.usesStockOf && card.portion ? (
                <Text style={styles.note}>
                  Uses {card.usesStockOf} stock ({formatNumber(card.portion)} each), so restocking adds{' '}
                  {card.usesStockOf}.
                </Text>
              ) : null}

              {role === 'manager' && card.stockId ? (
                <TouchableOpacity
                  style={styles.restockBtn}
                  activeOpacity={0.85}
                  onPress={goRestock}
                  accessibilityRole="button"
                >
                  <Text style={styles.restockText}>Restock</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} role={role} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scroll: {
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
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 150,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '80%',
    height: '100%',
    borderRadius: 8,
  },
  footer: {
    backgroundColor: COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  name: {
    flex: 1,
    marginRight: 8,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: COLORS.ink,
  },
  qty: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: COLORS.ink,
  },
  qtyLow: {
    color: COLORS.red,
  },
  note: {
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: COLORS.grey,
  },
  restockBtn: {
    alignSelf: 'flex-end',
    marginTop: 18,
    width: '50%',
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restockText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: COLORS.white,
  },
  notFound: {
    marginTop: 30,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.grey,
  },
});

// TEST: /stock-item?name=Whole Juicy Chicken with 10 left (min 10) shows a red 10 and, for a manager, Restock
// TEST: Restock opens /restock?stockId=<Whole's id> with that item picked; a cashier sees no Restock button
// TEST: Half Juicy Chicken shows the note and its Restock picks Whole Juicy Chicken

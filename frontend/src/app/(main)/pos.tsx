// pos.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { showAlert } from '@/utils/alert';
import { API_URL } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getDarkMode, setGlobalDarkMode, getUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { imageFor } from '@/constants/images';


const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
  darkBg: '#181920',
  darkCard: '#22242E',
};

/** How much of one stock item ONE order uses (from Recipe_Portions). */
type Portion = {
  stockId: number;
  stockName: string;
  unit: string;
  quantityUsed: number;
  inStock: number;
};

type PosMenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  portions: Portion[];
};

type CartItem = PosMenuItem & {
  qty: number;
};

export default function PosScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [menu, setMenu] = useState<PosMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState(getDarkMode());

  const isCashierDark = role === 'cashier' && darkMode;
  const textColor = { color: isCashierDark ? COLORS.white : COLORS.nearBlack };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  const loadMenu = useCallback(async () => {
    setMenuLoading(true);
    setMenuError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await axios.get(`${API_URL}/protected/menu-items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dbItems: { id: number; name: string; price: number; portions?: Portion[] }[] =
        res.data?.items || [];
      setMenu(
        dbItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          image: imageFor(i.name),
          portions: i.portions || [],
        }))
      );
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.replace('/');
        return;
      }
      setMenuError(
        err.response?.data?.message ||
          `Could not reach the server at ${API_URL}. Make sure the backend is running (npm start in the backend folder) and your phone is on the same Wi-Fi.`
      );
    } finally {
      setMenuLoading(false);
    }
  }, [router]);

  // Refresh menu + stock every time the POS is opened (stock changes after each sale).
  useFocusEffect(
    useCallback(() => {
      loadMenu();
    }, [loadMenu])
  );

  /**
   * Orders of `item` that can still be added, after what is already in the cart.
   * Items sharing a stock (e.g. Whole and Half Juicy Chicken both use Raw Chicken)
   * count against the same stock. null = no portion set, so no limit.
   */
  const ordersLeft = (item: PosMenuItem, currentCart: CartItem[] = cart): number | null => {
    if (item.portions.length === 0) return null;
    return Math.min(
      ...item.portions.map((p) => {
        const usedInCart = currentCart.reduce((sum, line) => {
          const linePortion = line.portions.find((lp) => lp.stockId === p.stockId);
          return sum + (linePortion ? line.qty * linePortion.quantityUsed : 0);
        }, 0);
        return Math.max(0, Math.floor((p.inStock - usedInCart + 1e-9) / p.quantityUsed));
      })
    );
  };

  const warnOutOfStock = (item: PosMenuItem) => {
    const stockNames = item.portions.map((p) => p.stockName).join(', ');
    showAlert(
      'Not Enough Stock',
      `There isn't enough ${stockNames} left for another ${item.name}. Please restock first.`
    );
  };

  const addToCart = (item: PosMenuItem) => {
    const left = ordersLeft(item);
    if (left !== null && left < 1) {
      warnOutOfStock(item);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    if (delta > 0) {
      const item = menu.find((m) => m.id === id);
      const left = item ? ordersLeft(item) : null;
      if (item && left !== null && left < delta) {
        warnOutOfStock(item);
        return;
      }
    }
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const handleConfirmOrder = () => {
    if (cart.length === 0) {
      showAlert('Empty Order', 'Please add at least one item to the order.');
      return;
    }

    const payload = cart.map((c) => ({ item_id: c.id, qty: c.qty }));
    router.push({
      pathname: '/pos-payment' as Href,
      params: {
        total: String(totalAmount),
        itemsJson: JSON.stringify(payload),
      },
    } as any);
  };

  if (!fontsLoaded) {
    return (
      <View style={[styles.center, isCashierDark && { backgroundColor: COLORS.darkBg }]}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: COLORS.darkBg }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="chevron-back"
                size={30}
                color={isCashierDark ? COLORS.white : COLORS.nearBlack}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="menu"
                size={32}
                color={isCashierDark ? COLORS.white : COLORS.nearBlack}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageTitle, textColor]}>Point-of-Sale</Text>

          {/* Loading / error / empty states */}
          {menu.length === 0 && (
            <View style={styles.menuStateBox}>
              {menuLoading ? (
                <ActivityIndicator size="large" color={COLORS.red} />
              ) : (
                <>
                  <Text style={[styles.menuStateText, textColor]}>
                    {menuError ??
                      'No menu items found. Restart the backend (npm start in the backend folder) so it can add the Mr. Liempo menu.'}
                  </Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={loadMenu}>
                    <Text style={styles.retryBtnText}>Try again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* 3-Column Item Grid */}
          <View style={styles.menuGrid}>
            {menu.map((item, idx) => {
              const isLastCentered = idx === menu.length - 1 && menu.length % 3 === 1;
              const left = ordersLeft(item);
              const soldOut = left !== null && left < 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuCard,
                    isLastCentered && styles.centeredCard,
                    isCashierDark && { backgroundColor: COLORS.darkCard, borderColor: '#374151' },
                    soldOut && styles.soldOutCard,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => addToCart(item)}
                >
                  <View style={styles.cardImgBox}>
                    <Image source={{ uri: item.image }} style={styles.cardImg} resizeMode="contain" />
                    {left !== null && (
                      <View style={[styles.leftBadge, soldOut && styles.leftBadgeSoldOut]}>
                        <Text style={[styles.leftBadgeText, soldOut && styles.leftBadgeTextSoldOut]}>
                          {soldOut ? 'Out of stock' : `${left} left`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.cardItemName, textColor]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.plusCircle}>
                      <Feather name="plus" size={14} color={COLORS.white} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Order Header Row */}
          <View style={styles.orderHeaderRow}>
            <Text style={[styles.orderTitle, textColor]}>Order</Text>
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Order Lines */}
          <View
            style={[
              styles.orderListCard,
              isCashierDark && { backgroundColor: COLORS.darkCard },
            ]}
          >
            {cart.length === 0 ? (
              <View style={styles.emptyOrderBox}>
                <Text style={[styles.emptyOrderText, isCashierDark && { color: '#9CA3AF' }]}>
                  Tap any menu item above to add to order.
                </Text>
              </View>
            ) : (
              cart.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.orderRow,
                    idx !== cart.length - 1 && styles.orderRowBorder,
                    isCashierDark && { borderBottomColor: '#2E3240' },
                  ]}
                >
                  <Text style={[styles.orderItemName, textColor]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.orderUnitPrice, textColor]}>{item.price}</Text>
                  <Text style={styles.orderTimes}>x</Text>

                  {/* Quantity Stepper */}
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepCircle}
                      onPress={() => updateQty(item.id, -1)}
                    >
                      <Feather name="minus" size={12} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={[styles.stepQtyText, textColor]}>{item.qty}</Text>
                    <TouchableOpacity
                      style={styles.stepCircle}
                      onPress={() => updateQty(item.id, 1)}
                    >
                      <Feather name="plus" size={12} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.orderSubtotal, textColor]}>
                    {(item.price * item.qty).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Yellow Checkout Panel */}
      <View style={styles.bottomCheckoutBar}>
        <View style={styles.bottomInner}>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.itemsCountText}>{totalItems} items</Text>
            </View>
            <Text style={styles.grandTotalValue}>₱ {totalAmount.toLocaleString()}</Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmOrder}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    paddingTop: 14,
    paddingBottom: 24,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 10,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    rowGap: 16,
  },
  menuCard: {
    width: '31.5%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4B5563',
    padding: 10,
    marginLeft: 5,
    justifyContent: 'space-between',
  },
  centeredCard: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  menuStateBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  menuStateText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },
  retryBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: COLORS.white,
  },
  soldOutCard: {
    opacity: 0.55,
  },
  leftBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: COLORS.yellow,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  leftBadgeSoldOut: {
    backgroundColor: COLORS.red,
  },
  leftBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8.5,
    color: COLORS.nearBlack,
  },
  leftBadgeTextSoldOut: {
    color: COLORS.white,
  },
  cardImgBox: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardImg: {
    width: '88%',
    height: '100%',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardItemName: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 8.5,
    color: COLORS.nearBlack,
    lineHeight: 11,
    marginRight: 4,
  },
  plusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 8,
  },
  orderTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: COLORS.nearBlack,
  },
  clearAllText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9.5,
    color: COLORS.red,
    textDecorationLine: 'underline',
  },
  orderListCard: {
    width: '100%',
    backgroundColor: COLORS.white,
  },
  emptyOrderBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyOrderText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B7280',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE6',
  },
  orderItemName: {
    flex: 1.5,
    fontFamily: 'Poppins_400Regular',
    fontSize: 9.5,
    color: COLORS.nearBlack,
    lineHeight: 13,
  },
  orderUnitPrice: {
    flex: 0.8,
    fontFamily: 'Poppins_400Regular',
    fontSize: 9.5,
    color: COLORS.nearBlack,
    textAlign: 'center',
  },
  orderTimes: {
    flex: 0.4,
    fontFamily: 'Poppins_400Regular',
    fontSize: 9.5,
    color: '#6B7280',
    textAlign: 'center',
  },
  stepperRow: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepQtyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: COLORS.nearBlack,
    minWidth: 14,
    textAlign: 'center',
  },
  orderSubtotal: {
    flex: 0.9,
    fontFamily: 'Poppins_700Bold',
    fontSize: 9.5,
    color: COLORS.nearBlack,
    textAlign: 'right',
  },
  bottomCheckoutBar: {
    width: '100%',
    backgroundColor: '#F4C414',
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  bottomInner: {
    width: '100%',
    maxWidth: 460,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.nearBlack,
  },
  itemsCountText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: COLORS.nearBlack,
  },
  grandTotalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: COLORS.nearBlack,
  },
  confirmBtn: {
    width: '100%',
    height: 46,
    backgroundColor: COLORS.red,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 13.5,
  },
});
/**
 * @file RoleSideDrawer.tsx
 * @description The one side menu used by every screen (hamburger icon).
 *  - manager: Homepage, Account Information, Stock Alert, Manage Price,
 *             Record Waste, Waste History + Log out
 *  - cashier: Homepage, Point-of-Sale, Transaction History, Account Information + Log out
 *
 * Usage:
 *   const [menuVisible, setMenuVisible] = useState(false);
 *   <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
 */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { clearToken } from '@/services/authService';
import {
  getUserRole,
  subscribeAppTheme,
  type UserRole,
} from '@/store/appState';
import { ROUTES, homeRouteFor } from '@/constants/routes';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Defaults to the logged-in user's role. */
  role?: UserRole;
};

const COLORS = {
  red: '#EC0000',
  drawer: '#FFECA8', // same yellow for both roles (design)
  modalCream: '#FDFBF0',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

type MenuItem = {
  label: string;
  route: Href;
  icon: (color: string) => React.ReactNode;
  /** Go back to this screen if it's already open further back, instead of stacking a new one. */
  home?: boolean;
};

const ICON_SIZE = 44;

const homeItem = (route: Href): MenuItem => ({
  label: 'Homepage',
  route,
  home: true,
  icon: (c) => <Ionicons name="home-outline" size={ICON_SIZE} color={c} />,
});

const MANAGER_MENU: MenuItem[] = [
  homeItem(ROUTES.MANAGER_HOME),
  {
    label: 'Account Information',
    route: ROUTES.ACCOUNT_INFO,
    icon: (c) => <Ionicons name="person-outline" size={ICON_SIZE} color={c} />,
  },
  {
    label: 'Stock Alert',
    route: ROUTES.STOCK_ALERT,
    icon: (c) => <Ionicons name="notifications" size={ICON_SIZE} color={c} />,
  },
  {
    label: 'Manage Price',
    route: ROUTES.MANAGE_PRICE,
    icon: (c) => <Ionicons name="pricetag" size={ICON_SIZE - 2} color={c} />,
  },
  {
    label: 'Record Waste',
    route: ROUTES.RECORD_WASTE,
    icon: (c) => <Ionicons name="document-text-outline" size={ICON_SIZE} color={c} />,
  },
  {
    label: 'Waste History',
    route: ROUTES.WASTE_HISTORY,
    icon: (c) => <Ionicons name="trash-outline" size={ICON_SIZE} color={c} />,
  },
];

const CASHIER_MENU: MenuItem[] = [
  homeItem(ROUTES.CASHIER_HOME),
  {
    label: 'Point-of-Sale',
    route: ROUTES.POS,
    icon: (c) => <MaterialCommunityIcons name="cash-register" size={ICON_SIZE - 2} color={c} />,
  },
  {
    label: 'Transaction History',
    route: ROUTES.TRANSACTION_HISTORY,
    icon: (c) => <Ionicons name="document-text-outline" size={ICON_SIZE} color={c} />,
  },
  {
    label: 'Account Information',
    route: ROUTES.CASHIER_ACCOUNT,
    icon: (c) => <Ionicons name="person-outline" size={ICON_SIZE} color={c} />,
  },
];

export default function RoleSideDrawer({
  visible,
  onClose,
  role: roleProp,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.81, 360);

  // Fall back to the global store when a screen doesn't pass a role.
  const storeRole = useSyncExternalStore(subscribeAppTheme, getUserRole, getUserRole);
  const role = roleProp ?? storeRole;

  // useState keeps one Animated.Value for the component's life (reading a
  // ref's .current during render is not allowed with the React Compiler).
  const [slideAnim] = useState(() => new Animated.Value(DRAWER_WIDTH));
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const menu = role === 'cashier' ? CASHIER_MENU : MANAGER_MENU;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(DRAWER_WIDTH);
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, DRAWER_WIDTH, slideAnim]);

  /** Slides the drawer out, then runs `after`. */
  const slideOut = (after?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      after?.();
    });
  };

  const navigateTo = (item: MenuItem) => {
    slideOut(() => {
      // Already on this screen -> just close the menu.
      if (typeof item.route === 'string' && pathname === item.route) return;
      // Homepage goes back to the home screen rather than stacking another copy.
      if (item.home) router.dismissTo(homeRouteFor(role));
      else router.push(item.route);
    });
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace(ROUTES.LOGIN);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => slideOut()}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => slideOut()} />

          <Animated.View
            style={[
              styles.drawer,
              {
                width: DRAWER_WIDTH,
                paddingTop: insets.top + 22,
                paddingBottom: insets.bottom + 24,
                transform: [{ translateX: slideAnim }],
                backgroundColor: COLORS.drawer,
              },
            ]}
          >
            {/* Close (thin X, top-right) */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => slideOut()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close menu"
            >
              <Ionicons name="close-outline" size={44} color={COLORS.nearBlack} />
            </TouchableOpacity>

            <View style={styles.menuList}>
              {menu.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.menuRow}
                  onPress={() => navigateTo(item)}
                  accessibilityRole="button"
                >
                  <View style={styles.iconCol}>{item.icon(COLORS.red)}</View>
                  <Text style={styles.itemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Log out */}
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.85}
              onPress={() => slideOut(() => setTimeout(() => setLogoutModalVisible(true), 50))}
            >
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Logout confirmation */}
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
            <Text style={styles.modalPrompt}>Are you sure you want to log{'\n'}out your account?</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLogout}>
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 21, 0.06)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: 14,
    marginBottom: 26,
  },
  menuList: {
    paddingLeft: 14,
    paddingRight: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    marginBottom: 2,
  },
  iconCol: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemText: {
    flexShrink: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    alignSelf: 'center',
    width: '62%',
    maxWidth: 220,
    height: 40,
    marginTop: 28,
    backgroundColor: COLORS.red,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 13.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 21, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.modalCream,
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

// TEST: cashier menu = Homepage, Point-of-Sale, Transaction History, Account Information; manager has no Live Stock Count
// TEST: Homepage on a deep screen returns to the home screen (dismissTo), on the home screen it just closes

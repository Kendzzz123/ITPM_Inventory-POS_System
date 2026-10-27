// dashboard module/RoleSideDrawer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { clearToken } from './Role';

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});
type Props = {
  visible: boolean;
  onClose: () => void;
  role: 'cashier' | 'manager';
  darkMode: boolean;
  onToggleDarkMode: () => void;
};

const COLORS = {
  red: '#EC0000',
  drawerCream: '#FDE8AA',
  managerCream: '#FDF8EA',
  modalCream: '#FDFBF0',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
  darkDrawer: '#22242E',
  darkSurface: '#181920',
};

export default function RoleSideDrawer({
  visible,
  onClose,
  role,
  darkMode,
  onToggleDarkMode,
}: Props) {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const isCashierDark = role === 'cashier' && darkMode;
  const textColor = { color: isCashierDark ? COLORS.white : COLORS.nearBlack };

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(DRAWER_WIDTH);
    }
  }, [visible, DRAWER_WIDTH, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const navigateTo = (path: string) => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      router.push(path as Href);
    });
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace('/');
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={handleClose} />

          <Animated.View
            style={[
              styles.drawerContainer,
              {
                width: DRAWER_WIDTH,
                transform: [{ translateX: slideAnim }],
                backgroundColor: isCashierDark
                  ? COLORS.darkDrawer
                  : role === 'cashier'
                  ? COLORS.drawerCream
                  : COLORS.managerCream,
              },
            ]}
          >
            {/* Close Button Header */}
            <View style={styles.drawerTopHeader}>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather
                  name="x"
                  size={28}
                  color={isCashierDark ? COLORS.white : COLORS.nearBlack}
                />
              </TouchableOpacity>
            </View>

            {/* CASHIER MENU vs MANAGER MENU */}
            {role === 'cashier' ? (
              <View
                style={[
                  styles.cashierWhiteList,
                  isCashierDark && { backgroundColor: COLORS.darkSurface },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.cashierRow,
                    styles.cashierRowBorder,
                    isCashierDark && { borderBottomColor: '#2E3240' },
                  ]}
                  onPress={onToggleDarkMode}
                >
                  <View style={styles.drawerIconCol}>
                    <MaterialCommunityIcons
                      name={darkMode ? 'toggle-switch' : 'toggle-switch-off-outline'}
                      size={42}
                      color={COLORS.red}
                    />
                  </View>
                  <Text style={[styles.drawerRowText, textColor]}>Switch to Dark Mode</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cashierRow}
                  onPress={() => navigateTo('/dashboard module/cashier-account')}
                >
                  <View style={styles.drawerIconCol}>
                    <Ionicons name="person-outline" size={40} color={COLORS.red} />
                  </View>
                  <Text style={[styles.drawerRowText, textColor]}>Account Information</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* MANAGER MENU */
              <View style={styles.managerMenuWrapper}>
                <TouchableOpacity
                  style={styles.managerItem}
                  onPress={() => navigateTo('/dashboard module/account-info')}
                >
                  <View style={styles.drawerIconCol}>
                    <Ionicons name="person-outline" size={38} color={COLORS.red} />
                  </View>
                  <Text style={styles.drawerRowText}>Account Information</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.managerItem}
                  onPress={() => navigateTo('/dashboard module/stock-alert')}
                >
                  <View style={styles.drawerIconCol}>
                    <Ionicons name="notifications" size={38} color={COLORS.red} />
                  </View>
                  <Text style={styles.drawerRowText}>Stock Alert</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.managerItem}
                  onPress={() => navigateTo('/dashboard module/manage-price')}
                >
                  <View style={styles.drawerIconCol}>
                    <MaterialCommunityIcons name="tag-multiple" size={38} color={COLORS.red} />
                  </View>
                  <Text style={styles.drawerRowText}>Manage Price</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.managerItem}
                  onPress={() => navigateTo('/dashboard module/stocks')}
                >
                  <View style={styles.drawerIconCol}>
                    <Ionicons name="eye-outline" size={40} color={COLORS.red} />
                  </View>
                  <Text style={styles.drawerRowText}>Live Stock Count</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.managerItem}
                  onPress={() => navigateTo('/dashboard module/record-waste')}
                >
                  <View style={styles.drawerIconCol}>
                    <Ionicons name="document-text-outline" size={38} color={COLORS.red} />
                  </View>
                  <Text style={styles.drawerRowText}>Record Waste</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.managerItem}
                  onPress={() => navigateTo('/dashboard module/waste-history')}
                >
                  <View style={styles.drawerIconCol}>
                    <Ionicons name="trash-outline" size={38} color={COLORS.red} />
                  </View>
                  <Text style={styles.drawerRowText}>Waste History</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Log out Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                handleClose();
                setTimeout(() => setLogoutModalVisible(true), 230);
              }}
            >
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Logout Confirmation Dialog */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              isCashierDark && { backgroundColor: COLORS.darkDrawer },
            ]}
          >
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="logout" size={46} color={COLORS.red} />
            </View>
            <Text style={styles.modalPrompt}>
              Are you sure you want to log{'\n'}out your account?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
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
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    justifyContent: 'flex-start',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
  },
  drawerTopHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  cashierWhiteList: {
    backgroundColor: '#FFFDF9',
    width: '100%',
  },
  cashierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  cashierRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE6',
  },
  managerMenuWrapper: {
    gap: 26,
    paddingHorizontal: 22,
    marginTop: 8,
  },
  managerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerIconCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  drawerRowText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    marginTop: 32,
    marginHorizontal: 38,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 14,
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
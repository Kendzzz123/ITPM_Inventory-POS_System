import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Foundation } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { clearToken } from '../Role';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  drawerCream: '#FDE8AA',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

export default function TransactionSuccessScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const DRAWER_WIDTH = screenWidth * 0.55;

  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: screenWidth - DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: screenWidth,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setMenuVisible(false));
  };

  const navigateTo = (route: string) => {
    closeMenu();
    setTimeout(() => router.replace(route as Href), 300);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    closeMenu();
    await clearToken();
    router.replace('/');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.replace('/dashboard module/pos' as Href)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={30} color={COLORS.nearBlack} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openMenu}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu" size={32} color={COLORS.nearBlack} />
          </TouchableOpacity>
        </View>

        {/* Center Status Content */}
        <View style={styles.centerContent}>
          <Foundation name="like" size={210} color={COLORS.yellow} />
          <Text style={styles.successTitle}>Transaction success!</Text>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.newTxBtn}
            onPress={() => router.replace('/dashboard module/pos' as Href)}
          >
            <Text style={styles.newTxBtnText}>New Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/dashboard module/cashier-dashboard' as Href)}
          >
            <Text style={styles.homeBtnText}>Back to Homepage</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Side Drawer Modal ─── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerOverlayBg} onPress={closeMenu} activeOpacity={1} />
          <Animated.View style={[styles.drawerContainer, { left: slideAnim, width: DRAWER_WIDTH }]}>
            <View style={styles.drawerHeader}>
              <TouchableOpacity onPress={closeMenu}>
                <Ionicons name="close" size={28} color={COLORS.nearBlack} />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerItemsBox}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateTo('/dashboard module/cashier-account')}
              >
                <Ionicons name="person-outline" size={40} color={COLORS.nearBlack} />
                <Text style={styles.drawerItemText}>Account{'\n'}Information</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.drawerLogoutBtn}
              onPress={() => setLogoutModalVisible(true)}
            >
              <Text style={styles.drawerLogoutText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Logout Confirmation Modal ─── */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutBox}>
            <Text style={styles.logoutTitle}>LOG OUT</Text>
            <Text style={styles.logoutMsg}>Are you sure you want to log out?</Text>
            <View style={styles.logoutBtnRow}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={handleConfirmLogout}>
                <Text style={styles.logoutConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 60,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  centerContent: {
    alignItems: 'center',
    marginTop: -20,
  },
  successTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 14,
  },
  newTxBtn: {
    width: 230,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTxBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: COLORS.red,
  },
  homeBtn: {
    width: 230,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: COLORS.white,
  },

  /* ─── Drawer styles ─── */
  drawerOverlay: {
    flex: 1,
  },
  drawerOverlayBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.drawerCream,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 60,
    paddingHorizontal: 18,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  drawerItemsBox: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 18,
  },
  drawerItem: {
    alignItems: 'center',
    gap: 4,
  },
  drawerItemText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: COLORS.nearBlack,
    textAlign: 'center',
  },
  drawerLogoutBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  drawerLogoutText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: COLORS.white,
  },

  /* ─── Logout modal styles ─── */
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBox: {
    width: 270,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  logoutTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: COLORS.nearBlack,
    marginBottom: 6,
  },
  logoutMsg: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginBottom: 22,
  },
  logoutBtnRow: {
    flexDirection: 'row',
    gap: 14,
  },
  logoutCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutCancelText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: COLORS.red,
  },
  logoutConfirmBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.red,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutConfirmText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: COLORS.white,
  },
});
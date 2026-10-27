import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import axios from 'axios';
import { getToken, clearToken } from '../Role';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from '@expo-google-fonts/poppins';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  drawerCream: '#FDF8EA',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

const WASTE_ITEMS = [
  'Whole Juicy Chicken',
  'Half Juicy Chicken',
  'Liempo',
  'Regular Chorizo',
  'Spicy Chorizo',
  'Atsara',
  'Sarsa (Gravy)',
];

export default function RecordWasteScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const todayFormatted = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const [dateStr, setDateStr] = useState<string>(todayFormatted());
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<string>('');
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  /* ── drawer helpers ── */
  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const navigateTo = (route: string) => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      router.push(route as Href);
    });
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace('/');
  };

  const handleOpenConfirm = () => {
    if (!selectedItem) {
      Alert.alert('Select Item', 'Please select an item to record as waste.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmWaste = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/protected/waste`,
        {
          itemName: selectedItem,
          quantity: Number(quantity),
          reason: `Waste recorded on ${dateStr}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmVisible(false);
      Alert.alert('Recorded', 'Waste has been logged.', [
        { text: 'View History', onPress: () => router.push('/dashboard module/waste-history' as Href) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record waste.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingCenter}>
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
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={30} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openMenu} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="menu" size={32} color="#111827" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Record Waste</Text>

        {/* Date Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateBox}>
            <TextInput
              style={styles.dateInput}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="mm/dd/yyyy"
              placeholderTextColor="#4b5563"
            />
            <MaterialCommunityIcons name="calendar-month-outline" size={30} color="#ef0000" />
          </View>
        </View>

        {/* Item & Quantity Row */}
        <View style={styles.rowGroup}>
          {/* Item Dropdown Column */}
          <View style={styles.itemCol}>
            <Text style={styles.label}>Item</Text>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.8}
              onPress={() => setDropdownOpen(!dropdownOpen)}
            >
              <Text style={styles.selectText} numberOfLines={1}>
                {selectedItem || 'Select'}
              </Text>
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#ef0000"
              />
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={styles.dropdownMenu}>
                {WASTE_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedItem(item);
                      setDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Quantity Column */}
          <View style={styles.qtyCol}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.qtyBox}>
              <TextInput
                style={styles.qtyInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleOpenConfirm}>
          <Text style={styles.submitBtnText}>Confirm</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="trash-can-outline" size={48} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}throw this item?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmWaste}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Side Drawer Modal ═══ */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <TouchableOpacity onPress={closeMenu} style={styles.drawerCloseBtn}>
              <Feather name="x" size={26} color={COLORS.nearBlack} />
            </TouchableOpacity>

            <View style={styles.drawerMenuWrapper}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/account-info')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="person-outline" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Account Information</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/stock-alert')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="notifications" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Stock Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/manage-price')}>
                <View style={styles.drawerIconBox}>
                  <MaterialCommunityIcons name="tag-multiple" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Manage Price</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/stocks')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="eye-outline" size={42} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Live Stock Count</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/record-waste')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="document-text-outline" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Record Waste</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateTo('/dashboard module/waste-history')}>
                <View style={styles.drawerIconBox}>
                  <Ionicons name="trash-outline" size={40} color={COLORS.red} />
                </View>
                <Text style={styles.drawerItemText}>Waste History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                closeMenu();
                setTimeout(() => setLogoutModalVisible(true), 300);
              }}
            >
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══ Logout Confirmation Modal ═══ */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.drawerModalBackdrop}>
          <View style={styles.drawerModalCard}>
            <View style={styles.drawerModalIconCircle}>
              <Ionicons name="log-out-outline" size={48} color={COLORS.red} />
            </View>
            <Text style={styles.drawerModalPrompt}>
              Are you sure you want to{'\n'}log out?
            </Text>
            <View style={styles.drawerModalBtnRow}>
              <TouchableOpacity style={styles.drawerCancelBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.drawerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerConfirmBtn} onPress={handleConfirmLogout}>
                <Text style={styles.drawerConfirmBtnText}>Confirm</Text>
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
    paddingTop: 100,
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffdf5',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    marginTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 34,
  },
  fieldGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 11,
    color: '#1f2937',
    marginBottom: 6,
    marginLeft: 4,
  },
  dateBox: {
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    fontSize: 12,
    color: '#1f2937',
  },
  rowGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 20,
  },
  itemCol: {
    flex: 1.6,
    position: 'relative',
  },
  qtyCol: {
    flex: 1,
  },
  selectBox: {
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 12,
    color: '#1f2937',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 70,
    left: 2,
    right: 2,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownOption: {
    paddingVertical: 8,
  },
  dropdownOptionText: {
    fontSize: 9.5,
    color: '#1f2937',
  },
  qtyBox: {
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    color: '#1f2937',
  },
  submitBtn: {
    marginTop: 38,
    alignSelf: 'center',
    width: 170,
    height: 46,
    backgroundColor: '#d92323',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fdfbf0',
    borderRadius: 34,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 10,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fffdf7',
  },
  modalPrompt: {
    fontSize: 16,
    color: '#ef0000',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ef0000',
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ef0000',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#ef0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Drawer styles ── */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawerContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.drawerCream,
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingHorizontal: 22,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
  },
  drawerCloseBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
  },
  drawerMenuWrapper: {
    flex: 1,
    paddingTop: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  drawerIconBox: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.red,
  },
  logoutBtn: {
    alignSelf: 'center',
    backgroundColor: COLORS.red,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 50,
    marginBottom: 46,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  drawerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  drawerModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fdfbf0',
    borderRadius: 34,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 10,
  },
  drawerModalIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fffdf7',
  },
  drawerModalPrompt: {
    fontSize: 16,
    color: COLORS.red,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  drawerModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  drawerCancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerCancelBtnText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: '700',
  },
  drawerConfirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
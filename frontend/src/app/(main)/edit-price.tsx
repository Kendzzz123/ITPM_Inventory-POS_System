import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import axios from 'axios';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { showAlert } from '@/utils/alert';
import { API_URL } from '@/config/apiConfig';
import { getToken, clearToken } from '@/services/authService';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from '@expo-google-fonts/poppins';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  drawerCream: '#FDF8EA',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};


const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export default function EditPriceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; price?: string }>();

  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });

  // Opened from Manage Price, which always passes the selected item.
  const itemId = params.id ?? '';
  const itemName = params.name ?? '';
  const currentPrice = params.price ?? '0';

  const [inputPrice, setInputPrice] = useState<string>('0');
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Drawer state
  const [menuVisible, setMenuVisible] = useState(false);





  const handleDigitPress = (digit: string) => {
    setInputPrice((prev) => {
      if (prev === '0') return digit;
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setInputPrice((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleOpenConfirm = () => {
    if (!itemId) {
      showAlert('No item selected', 'Please choose an item from Manage Price.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    if (!inputPrice || Number(inputPrice) <= 0) {
      showAlert('Invalid Price', 'Please enter a valid price greater than 0.');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmChange = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.put(
        `${API_URL}/protected/menu-items/${itemId}`,
        { price: Number(inputPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmVisible(false);
      showAlert('Updated', `${itemName} price changed to ₱${inputPrice}!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to update price.');
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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

          <Text style={styles.pageTitle}>Edit Price</Text>

          {/* Item Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewTop}>
              <MaterialCommunityIcons name="food-turkey" size={76} color="#1f2937" />
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewBottom}>
              <Text style={styles.previewItemName}>{itemName}</Text>
              <View style={styles.currentPriceCol}>
                <Text style={styles.currentPriceLabel}>Current Price</Text>
                <Text style={styles.currentPriceValue}>₱{currentPrice}</Text>
              </View>
            </View>
          </View>

          {/* Red Bordered Input Display */}
          <View style={styles.inputDisplayBox}>
            <Text style={styles.inputValueText}>{inputPrice}</Text>
            <TouchableOpacity
              onPress={handleBackspace}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="delete" size={22} color="#ef0000" />
            </TouchableOpacity>
          </View>

          {/* Numeric Keypad */}
          <View style={styles.keypadContainer}>
            {KEYPAD_ROWS.map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.keyButton}
                    activeOpacity={0.7}
                    onPress={() => handleDigitPress(num)}
                  >
                    <Text style={styles.keyText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Bottom 0 Row */}
            <View style={styles.keypadRowCenter}>
              <TouchableOpacity
                style={styles.keyButton}
                activeOpacity={0.7}
                onPress={() => handleDigitPress('0')}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Changes Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleOpenConfirm}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.priceModalBackdrop}>
          <View style={styles.priceModalCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="tag-multiple" size={44} color="#ef0000" />
            </View>

            <Text style={styles.priceModalPrompt}>
              Are you sure you want to{'\n'}change the price?
            </Text>

            <View style={styles.priceModalBtnRow}>
              <TouchableOpacity
                style={styles.priceCancelBtn}
                onPress={() => setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.priceCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.priceConfirmBtn}
                onPress={handleConfirmChange}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.priceConfirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffdf5',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  container: {
    width: '100%',
    maxWidth: 420,
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
    marginBottom: 20,
  },
  previewCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
    overflow: 'hidden',
    marginBottom: 18,
  },
  previewTop: {
    height: 115,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#4b5563',
  },
  previewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewItemName: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  currentPriceCol: {
    alignItems: 'center',
  },
  currentPriceLabel: {
    fontSize: 11.5,
    color: '#374151',
    marginBottom: 2,
  },
  currentPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  inputDisplayBox: {
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#ef0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    gap: 18,
    marginBottom: 20,
  },
  inputValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  keypadContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keypadRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  keyButton: {
    width: '30.5%',
    height: 46,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  saveBtn: {
    alignSelf: 'center',
    width: 210,
    height: 44,
    backgroundColor: '#ef0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  priceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  priceModalCard: {
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
  priceModalPrompt: {
    fontSize: 16,
    color: '#ef0000',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  priceModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceCancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ef0000',
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceCancelBtnText: {
    color: '#ef0000',
    fontSize: 13,
    fontWeight: '700',
  },
  priceConfirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#ef0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  drawerContainer: {
    backgroundColor: COLORS.drawerCream,
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingHorizontal: 22,
    paddingBottom: 34,
    justifyContent: 'space-between',
  },
  drawerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 18 : 16,
    right: 18,
    zIndex: 10,
  },
  drawerMenuWrapper: {
    marginTop: 18,
    gap: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  drawerIconBox: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.nearBlack,
  },
  logoutBtn: {
    alignSelf: 'center',
    backgroundColor: COLORS.red,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 48,
    marginTop: 18,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
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
  modalIconCircle: {
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
    color: COLORS.red,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
    fontFamily: 'Poppins_500Medium',
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
    borderColor: COLORS.red,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.red,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  confirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
});
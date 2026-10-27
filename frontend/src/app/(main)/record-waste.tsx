/**
 * @file record-waste.tsx
 * @description Manager screen: record wasted stock (date, item, quantity).
 * Items come from the Stock_Items table; saving calls POST /protected/waste.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { showAlert } from '@/utils/alert';
import { PROTECTED_ENDPOINTS } from '@/config/apiConfig';
import { useStockItems } from '@/hooks/useStockItems';
import { getToken, clearToken } from '@/services/authService';
import { todaySlashDate, newRequestId } from '@/constants/app';
import { ROUTES } from '@/constants/routes';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  modalCream: '#FDFBF0',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

/** Formats typed digits as mm/dd/yyyy (e.g. "1027" -> "10/27"). */
const formatDateInput = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/** True for a real calendar date in mm/dd/yyyy that is not in the future. */
const isValidPastDate = (value: string): boolean => {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return false;
  return d.getTime() <= Date.now();
};

export default function RecordWasteScreen() {
  const router = useRouter();
  const { stockNames, stockIdFor, loadingStocks } = useStockItems();

  const [menuVisible, setMenuVisible] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // One id per entry so a double tap can't log the same waste twice.
  const [requestId, setRequestId] = useState(newRequestId);

  const resetForm = () => {
    setDateStr('');
    setSelectedItem('');
    setQuantity('');
    setRequestId(newRequestId());
  };

  const handleOpenConfirm = () => {
    Keyboard.dismiss();
    setDropdownOpen(false);
    if (dateStr && !isValidPastDate(dateStr)) {
      showAlert('Invalid Date', 'Please enter a valid date (mm/dd/yyyy) that is not in the future.');
      return;
    }
    if (!selectedItem) {
      showAlert('Select Item', 'Please select an item to record as waste.');
      return;
    }
    if (!quantity || !(Number(quantity) > 0)) {
      showAlert('Invalid Quantity', 'Please enter a quantity greater than 0.');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmWaste = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace(ROUTES.LOGIN);
        return;
      }
      await axios.post(
        PROTECTED_ENDPOINTS.WASTE,
        {
          stockId: stockIdFor(selectedItem),
          itemName: selectedItem,
          quantity: Number(quantity),
          reason: `Waste recorded on ${dateStr || todaySlashDate()}`,
          clientRequestId: requestId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmVisible(false);
      resetForm();
      showAlert('Recorded', 'Waste has been logged.', [
        { text: 'View History', onPress: () => router.push(ROUTES.WASTE_HISTORY) },
      ]);
    } catch (err: any) {
      setConfirmVisible(false);
      if (err.response?.status === 401) {
        await clearToken();
        router.replace(ROUTES.LOGIN);
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Failed to record waste.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setDropdownOpen(false);
        }}
        accessible={false}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={36} color={COLORS.nearBlack} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Open menu"
              >
                <Ionicons name="menu" size={40} color={COLORS.nearBlack} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageTitle}>Record Waste</Text>

            {/* Date */}
            <Text style={styles.label}>Date</Text>
            <View style={styles.dateBox}>
              <TextInput
                style={styles.dateInput}
                value={dateStr}
                onChangeText={(t) => setDateStr(formatDateInput(t))}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={COLORS.nearBlack}
                keyboardType="number-pad"
                maxLength={10}
                onFocus={() => setDropdownOpen(false)}
              />
              <TouchableOpacity
                onPress={() => setDateStr(todaySlashDate())}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Use today's date"
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={34} color={COLORS.red} />
              </TouchableOpacity>
            </View>

            {/* Item + Quantity */}
            <View style={styles.row}>
              <View style={styles.itemCol}>
                <Text style={styles.label}>Item</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  activeOpacity={0.85}
                  onPress={() => {
                    Keyboard.dismiss();
                    setDropdownOpen((open) => !open);
                  }}
                >
                  <Text style={styles.selectText} numberOfLines={1}>
                    {selectedItem || 'Select'}
                  </Text>
                  <FontAwesome
                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.red}
                  />
                </TouchableOpacity>

                {dropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {loadingStocks ? (
                      <ActivityIndicator color={COLORS.red} style={{ paddingVertical: 12 }} />
                    ) : stockNames.length === 0 ? (
                      <Text style={styles.dropdownEmpty}>No stock items found.</Text>
                    ) : (
                      stockNames.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setSelectedItem(item);
                            setDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              item === selectedItem && styles.dropdownOptionSelected,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              <View style={styles.qtyCol}>
                <Text style={styles.label}>Quantity</Text>
                <View style={styles.qtyBox}>
                  <TextInput
                    style={styles.qtyInput}
                    value={quantity}
                    onChangeText={(t) => setQuantity(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    onFocus={() => setDropdownOpen(false)}
                  />
                </View>
              </View>
            </View>

            {/* Confirm */}
            <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleOpenConfirm}>
              <Text style={styles.submitBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

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
              <MaterialCommunityIcons name="trash-can-outline" size={48} color={COLORS.red} />
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
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
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
    backgroundColor: COLORS.cream,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginTop: 46,
    marginBottom: 52,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
    marginLeft: 4,
    marginBottom: 8,
  },
  dateBox: {
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.yellow,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  dateInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    zIndex: 20,
  },
  itemCol: {
    flex: 1.6,
    zIndex: 20,
  },
  qtyCol: {
    flex: 1,
  },
  selectBox: {
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 72,
    left: 2,
    right: 2,
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    zIndex: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownOption: {
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
  },
  dropdownOptionSelected: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
  },
  dropdownEmpty: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    padding: 12,
  },
  qtyBox: {
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
  },
  submitBtn: {
    marginTop: 48,
    alignSelf: 'center',
    width: '50%',
    minWidth: 170,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  submitBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,16,21,0.25)',
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
  iconCircle: {
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
    fontSize: 13,
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
    fontSize: 13,
  },
});

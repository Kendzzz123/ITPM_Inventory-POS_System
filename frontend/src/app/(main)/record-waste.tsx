/**
 * @file record-waste.tsx
 * @description Manager screen: record wasted stock for several items at once.
 * Enter the date (optional, defaults to today), pick items, set each quantity,
 * then Confirm. Each item is saved with POST /protected/waste and its own
 * request id, so a retry can never log the same waste twice. If one item
 * fails (for example more than is in stock), the others stay saved and only
 * the failed ones stay picked so they can be fixed.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import ItemQuantityPicker, { type PickedQuantities } from '@/components/ItemQuantityPicker';
import { showAlert } from '@/utils/alert';
import { api, API_ROUTES } from '@/config/apiConfig';
import { useStockItems } from '@/hooks/useStockItems';
import { getToken, clearToken } from '@/services/authService';
import { todaySlashDate, newRequestId } from '@/constants/app';
import { ROUTES } from '@/constants/routes';
import { formatDateInput, isValidPastDate } from '@/utils/dates';
import { formatNumber } from '@/utils/stock';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  modalCream: '#FDFBF0',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

export default function RecordWasteScreen() {
  const router = useRouter();
  const { stockItems, loadingStocks, reload } = useStockItems();

  const [menuVisible, setMenuVisible] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [picked, setPicked] = useState<PickedQuantities>({});
  // One request id per picked item, kept until that item is saved (safe retries).
  const [requestIds, setRequestIds] = useState<Record<number, string>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickedIds = Object.keys(picked).map(Number);
  const stockOf = (id: number) => stockItems.find((s) => s.id === id);
  const nameOf = (id: number) => stockOf(id)?.name ?? 'Item';

  const handleOpenConfirm = () => {
    if (dateStr && !isValidPastDate(dateStr)) {
      showAlert('Invalid Date', 'Please enter a valid date (mm/dd/yyyy) that is not in the future.');
      return;
    }
    const missing = pickedIds.filter((id) => !(Number(picked[id]) > 0));
    if (missing.length > 0) {
      showAlert('Invalid Quantity', `Enter a quantity greater than 0 for ${missing.map(nameOf).join(', ')}.`);
      return;
    }
    const tooMuch = pickedIds.filter((id) => Number(picked[id]) > (stockOf(id)?.quantity ?? Infinity));
    if (tooMuch.length > 0) {
      const lines = tooMuch.map((id) => `${nameOf(id)}: only ${formatNumber(stockOf(id)?.quantity ?? 0)} in stock`);
      showAlert('Not Enough Stock', `You can't waste more than you have.\n${lines.join('\n')}`);
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmWaste = async () => {
    setSubmitting(true);
    const token = await getToken();
    if (!token) {
      setSubmitting(false);
      router.replace(ROUTES.LOGIN);
      return;
    }

    const ids = { ...requestIds };
    for (const id of pickedIds) ids[id] = ids[id] || newRequestId();
    setRequestIds(ids);

    const reason = `Waste recorded on ${dateStr || todaySlashDate()}`;
    const saved: number[] = [];
    const failed: string[] = [];
    for (const id of pickedIds) {
      try {
        await api.post(
          API_ROUTES.WASTE,
          {
            stockId: id,
            quantity: Number(picked[id]),
            reason,
            clientRequestId: ids[id],
            wasteDate: dateStr || undefined, // the day picked above (empty = today)
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        saved.push(id);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setSubmitting(false);
          setConfirmVisible(false);
          await clearToken();
          router.replace(ROUTES.LOGIN);
          return;
        }
        failed.push(`${nameOf(id)}: ${err.response?.data?.message || 'could not be recorded'}`);
      }
    }

    // Saved items leave the list; failed ones stay picked (with their request ids).
    const nextPicked = { ...picked };
    const nextIds = { ...ids };
    for (const id of saved) {
      delete nextPicked[id];
      delete nextIds[id];
    }
    setPicked(nextPicked);
    setRequestIds(nextIds);
    setSubmitting(false);
    setConfirmVisible(false);
    reload();

    if (failed.length === 0) {
      setDateStr('');
      showAlert('Recorded', `Waste logged for ${saved.length} ${saved.length === 1 ? 'item' : 'items'}.`, [
        { text: 'View History', onPress: () => router.push(ROUTES.WASTE_HISTORY) },
      ]);
    } else if (saved.length > 0) {
      showAlert(
        'Partly Recorded',
        `Saved: ${saved.map(nameOf).join(', ')}.\nNot saved:\n${failed.join('\n')}`
      );
    } else {
      showAlert('Error', failed.join('\n'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
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
              <Ionicons name="chevron-back" size={30} color={COLORS.nearBlack} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={32} color={COLORS.nearBlack} />
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
            />
            <TouchableOpacity
              onPress={() => setDateStr(todaySlashDate())}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Use today's date"
            >
              <MaterialCommunityIcons name="calendar-month-outline" size={30} color={COLORS.red} />
            </TouchableOpacity>
          </View>

          <ItemQuantityPicker
            items={stockItems}
            picked={picked}
            onChange={setPicked}
            loading={loadingStocks}
          />

          {pickedIds.length > 0 && (
            <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleOpenConfirm}>
              <Text style={styles.submitBtnText}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

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
              Are you sure you want to{'\n'}throw {pickedIds.length === 1 ? 'this item' : `these ${pickedIds.length} items`}?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmWaste} disabled={submitting}>
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
    marginTop: 30,
    marginBottom: 32,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    marginBottom: 8,
  },
  dateBox: {
    height: 46,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.yellow,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  dateInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.nearBlack,
  },
  submitBtn: {
    marginTop: 36,
    alignSelf: 'center',
    width: '55%',
    minWidth: 170,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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

// TEST: two picked items -> two POST /waste calls, each with its own clientRequestId
// TEST: one item over its stock -> "Not Enough Stock" before anything is sent
// TEST: a failed item stays picked with the same request id; saved items leave the list

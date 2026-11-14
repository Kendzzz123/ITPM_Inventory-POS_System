/**
 * @file restock.tsx
 * @description Manager screen: restock several items at once. Pick items from
 * the list, set each quantity, then Confirm. Everything is saved as one
 * purchase order (POST /protected/restock with items[]), so either all of the
 * items are added or none are.
 * Opened as /restock?stockId=5 (from an Inventory item), that item starts picked.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import ItemQuantityPicker, { type PickedQuantities } from '@/components/ItemQuantityPicker';
import { showAlert } from '@/utils/alert';
import { api, API_ROUTES } from '@/config/apiConfig';
import { useStockItems } from '@/hooks/useStockItems';
import { getToken, clearToken } from '@/services/authService';
import { formatNumber } from '@/utils/stock';
import { ROUTES } from '@/constants/routes';

export default function RestockScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const { stockItems, loadingStocks, reload } = useStockItems();
  const { stockId } = useLocalSearchParams<{ stockId?: string }>();
  const [picked, setPicked] = useState<PickedQuantities>(() =>
    Number(stockId) > 0 ? { [Number(stockId)]: '1' } : {}
  );
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Only items that exist in the list (a stale ?stockId is ignored).
  const pickedIds = Object.keys(picked)
    .map(Number)
    .filter((id) => stockItems.some((s) => s.id === id));
  const nameOf = (id: number) => stockItems.find((s) => s.id === id)?.name ?? 'Item';

  const handleOpenConfirm = () => {
    const missing = pickedIds.filter((id) => !(Number(picked[id]) > 0));
    if (missing.length > 0) {
      showAlert('Invalid Quantity', `Enter a quantity greater than 0 for ${missing.map(nameOf).join(', ')}.`);
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmRestock = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace(ROUTES.LOGIN);
        return;
      }
      const items = pickedIds.map((id) => ({ stockId: id, quantity: Number(picked[id]) }));
      await api.post(API_ROUTES.RESTOCK, { items }, { headers: { Authorization: `Bearer ${token}` } });

      const summary = items.map((i) => `${nameOf(i.stockId)} +${formatNumber(i.quantity)}`).join('\n');
      setConfirmVisible(false);
      setPicked({});
      reload();
      showAlert('Restocked', summary, [{ text: 'View Stocks', onPress: () => router.push('/stocks' as Href) }]);
    } catch (err: any) {
      setConfirmVisible(false);
      if (err.response?.status === 401) {
        await clearToken();
        router.replace(ROUTES.LOGIN);
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Could not restock. Nothing was added.');
    } finally {
      setSubmitting(false);
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
              <Ionicons name="chevron-back" size={30} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Restock Item</Text>

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
              <MaterialCommunityIcons name="cached" size={46} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}restock {pickedIds.length === 1 ? 'this item' : `these ${pickedIds.length} items`}?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmRestock} disabled={submitting}>
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
      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  pageTitle: {
    fontSize: 23,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 32,
  },
  submitBtn: {
    marginTop: 36,
    alignSelf: 'center',
    width: '55%',
    minWidth: 170,
    height: 44,
    backgroundColor: '#e02424',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
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
    backgroundColor: '#FDFBF0',
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
    borderColor: '#0F1015',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  modalPrompt: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#ef0000',
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
    borderColor: '#ef0000',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ef0000',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#ef0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 15,
  },
});

// TEST: Confirm appears only after an item is picked; a picked item with quantity 0 shows "Invalid Quantity"
// TEST: restocking 2 items sends one request with items[2]; on error nothing is added
// TEST: /restock?stockId=<id> opens with that item picked at quantity 1; an unknown id is ignored

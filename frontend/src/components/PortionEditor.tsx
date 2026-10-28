/**
 * @file PortionEditor.tsx
 * @description "Portion per order" card on Edit Price. Lets the manager set
 * which stock item ONE order of a menu item uses, and how much of it.
 * Example: Half Juicy Chicken -> 0.5 pcs of Raw Chicken.
 * Every POS sale deducts this amount from stock.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { PROTECTED_ENDPOINTS } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { useStockItems } from '@/hooks/useStockItems';
import { showAlert } from '@/utils/alert';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
  gray: '#6B7280',
};

type Props = { itemId: string; itemName: string };

export default function PortionEditor({ itemId, itemName }: Props) {
  const { stockItems, loadingStocks } = useStockItems();
  const [stockId, setStockId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPortion = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(PROTECTED_ENDPOINTS.MENU_ITEMS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const item = (res.data?.items || []).find((i: { id: number }) => String(i.id) === itemId);
      const portion = item?.portions?.[0];
      if (portion) {
        setStockId(portion.stockId);
        setQuantity(String(portion.quantityUsed));
      }
    } catch {
      // Card still works; manager can set a new portion.
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadPortion();
  }, [loadPortion]);

  const selected = stockItems.find((s) => s.id === stockId);

  const handleSave = async () => {
    const qty = Number(quantity);
    if (!stockId) {
      showAlert('Select Stock', 'Please choose which stock item this menu item uses.');
      return;
    }
    if (!(qty > 0)) {
      showAlert('Invalid Portion', 'Please enter an amount greater than 0 (e.g. 0.5).');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      await axios.put(
        PROTECTED_ENDPOINTS.menuItemPortion(itemId),
        { stockId, quantityUsed: qty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert('Saved', `1 ${itemName} now uses ${qty} ${selected?.unit ?? ''} of ${selected?.name ?? 'stock'}.`);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Could not save the portion.');
    } finally {
      setSaving(false);
    }
  };

  if (!itemId) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Portion per order</Text>
      <Text style={styles.hint}>
        How much stock 1 order uses. Each sale takes this amount out of stock.
      </Text>

      {loading || loadingStocks ? (
        <ActivityIndicator color={COLORS.red} style={{ marginVertical: 12 }} />
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.qtyCol}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={(t) => setQuantity(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0.5"
                  placeholderTextColor="#9CA3AF"
                  onFocus={() => setDropdownOpen(false)}
                />
                {selected && <Text style={styles.unit}>{selected.unit}</Text>}
              </View>
            </View>

            <View style={styles.stockCol}>
              <Text style={styles.label}>Stock item</Text>
              <TouchableOpacity
                style={styles.inputBox}
                activeOpacity={0.85}
                onPress={() => setDropdownOpen((o) => !o)}
              >
                <Text style={styles.selectText} numberOfLines={1}>
                  {selected?.name ?? 'Select'}
                </Text>
                <FontAwesome
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={COLORS.red}
                />
              </TouchableOpacity>
            </View>
          </View>

          {dropdownOpen && (
            <View style={styles.dropdown}>
              {stockItems.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.option}
                  onPress={() => {
                    setStockId(s.id);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, s.id === stockId && styles.optionSelected]}>
                    {s.name} ({s.unit})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.red} />
            ) : (
              <Text style={styles.saveBtnText}>Save Portion</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 26,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4B5563',
    padding: 14,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: COLORS.nearBlack,
  },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  qtyCol: {
    flex: 1,
  },
  stockCol: {
    flex: 1.5,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    marginBottom: 4,
    marginLeft: 2,
  },
  inputBox: {
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: COLORS.nearBlack,
  },
  unit: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  selectText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  dropdown: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 4,
  },
  option: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  optionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: COLORS.nearBlack,
  },
  optionSelected: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
  },
  saveBtn: {
    alignSelf: 'center',
    marginTop: 14,
    height: 40,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: COLORS.red,
  },
});

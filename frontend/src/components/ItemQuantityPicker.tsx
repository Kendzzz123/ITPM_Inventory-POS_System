/**
 * @file ItemQuantityPicker.tsx
 * @description The "Choose Item" list used by Restock and Record Waste.
 * Tap a row (or its circle) to pick it; a picked row shows a quantity with
 * − / + buttons (you can also type, e.g. 1.5 for Sarsa) and a × to remove it.
 * Several items can be picked at once.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StockOption } from '@/hooks/useStockItems';

/** Picked items: Stock_ID -> quantity as typed (text, so "1." can become "1.5"). */
export type PickedQuantities = Record<number, string>;

type Props = {
  items: StockOption[];
  picked: PickedQuantities;
  onChange: (next: PickedQuantities) => void;
  loading?: boolean;
};

const RED = '#EC0000';
const INK = '#0F1015';
const GREY = '#9CA3AF';

/** Quantity after a − or + tap; never below 0, no float tails (2.5 + 1 = 3.5). */
function stepQuantity(value: string, delta: number): string {
  const next = Math.max(0, Math.round(((Number(value) || 0) + delta) * 1000) / 1000);
  return String(next);
}

/** Keeps digits and one decimal point. */
function cleanQuantity(text: string): string {
  return text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

export default function ItemQuantityPicker({ items, picked, onChange, loading }: Props) {
  const anyPicked = Object.keys(picked).length > 0;

  const toggle = (id: number) => {
    const next = { ...picked };
    if (id in next) delete next[id];
    else next[id] = '1';
    onChange(next);
  };
  const setQuantity = (id: number, value: string) => onChange({ ...picked, [id]: value });

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, styles.nameCol]}>Choose Item:</Text>
        {anyPicked && <Text style={[styles.headerText, styles.qtyHeader]}>Quantity</Text>}
      </View>

      {loading ? (
        <ActivityIndicator color={RED} style={{ marginTop: 16 }} />
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>No stock items found.</Text>
      ) : (
        items.map((item) => {
          const isPicked = item.id in picked;
          const qty = picked[item.id] ?? '';
          return (
            <View key={item.id} style={styles.row}>
              <TouchableOpacity
                style={[styles.nameCol, styles.nameTouch]}
                onPress={() => toggle(item.id)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isPicked }}
                accessibilityLabel={item.name}
              >
                <View style={styles.circle}>{isPicked && <View style={styles.circleFill} />}</View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>

              {isPicked && (
                <View style={styles.qtyGroup}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setQuantity(item.id, stepQuantity(qty, -1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                    accessibilityLabel={`Less ${item.name}`}
                  >
                    <Ionicons name="remove" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    value={qty}
                    onChangeText={(t) => setQuantity(item.id, cleanQuantity(t))}
                    keyboardType="decimal-pad"
                    maxLength={8}
                    selectTextOnFocus
                    accessibilityLabel={`${item.name} quantity`}
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setQuantity(item.id, stepQuantity(qty, 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    accessibilityLabel={`More ${item.name}`}
                  >
                    <Ionicons name="add" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => toggle(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <Ionicons name="close" size={14} color={GREY} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  headerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: INK,
  },
  nameCol: {
    flex: 1,
  },
  qtyHeader: {
    width: 128,
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  nameTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: RED,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  circleFill: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: RED,
  },
  itemName: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: INK,
  },
  qtyGroup: {
    width: 128,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 46,
    height: 24,
    marginHorizontal: 5,
    paddingVertical: 0,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: RED,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: INK,
  },
  removeBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: INK,
    marginTop: 12,
  },
});

// TEST: tapping a row picks it with quantity 1; × or tapping again removes it
// TEST: − never goes below 0; + on "2.5" gives "3.5"; typing "1.2.3" keeps "1.23"

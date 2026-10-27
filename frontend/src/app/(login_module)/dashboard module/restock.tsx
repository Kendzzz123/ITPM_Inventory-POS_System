import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

const RESTOCK_OPTIONS = [
  'Whole Juicy Chicken',
  'Half Juicy Chicken',
  'Liempo',
  'Regular Chorizo',
  'Spicy Chorizo',
  'Atsara',
  'Sarsa (Gravy)',
];

export default function RestockScreen() {
  const router = useRouter();

  const [selectedItem, setSelectedItem] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState<string>('10');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenConfirm = () => {
    if (!selectedItem) {
      Alert.alert('Select Item', 'Please choose an item to restock.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    setConfirmVisible(true);
  };

  const handleConfirmRestock = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/protected/restock`,
        {
          itemName: selectedItem,
          quantity: Number(quantity),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmVisible(false);
      Alert.alert('Success', `${selectedItem} restocked (+${quantity})!`, [
        { text: 'OK', onPress: () => router.push('/dashboard module/stocks' as Href) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not restock item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={30} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="menu" size={32} color="#111827" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Restock Item</Text>

        {/* Choose Item Dropdown */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Choose Item</Text>
          <TouchableOpacity
            style={styles.selectBox}
            activeOpacity={0.8}
            onPress={() => setDropdownOpen(!dropdownOpen)}
          >
            <Text style={[styles.selectText, !selectedItem && { color: '#374151' }]}>
              {selectedItem || 'Select'}
            </Text>
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#ef0000"
            />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {RESTOCK_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedItem(option);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quantity Input & Submit (Behind dropdown when open) */}
        <View style={[styles.fieldWrapper, { marginTop: 22, zIndex: -1 }]}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.inputBox}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="Enter quantity"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleOpenConfirm}>
            <Text style={styles.submitBtnText}>Restock</Text>
          </TouchableOpacity>
        </View>
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
              <MaterialCommunityIcons name="cached" size={46} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}restock this item?
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
                onPress={handleConfirmRestock}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 40,
  },
  fieldWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  label: {
    fontSize: 11,
    color: '#1f2937',
    marginBottom: 6,
    marginLeft: 4,
  },
  selectBox: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 13,
    color: '#111827',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 66,
    left: 2,
    right: 2,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownOption: {
    paddingVertical: 10,
  },
  dropdownOptionText: {
    fontSize: 12.5,
    color: '#1f2937',
  },
  inputBox: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#111827',
  },
  submitBtn: {
    marginTop: 28,
    alignSelf: 'center',
    width: 170,
    height: 44,
    backgroundColor: '#d92323',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '400',
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
});
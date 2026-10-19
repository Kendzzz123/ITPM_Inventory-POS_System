import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export default function EditPriceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; price?: string }>();

  const itemId = params.id || '1';
  const itemName = params.name || 'Whole Juicy Chicken';
  const currentPrice = params.price || '320';

  const [inputPrice, setInputPrice] = useState<string>('330');
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
    if (!inputPrice || Number(inputPrice) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0.');
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
        { price: Number(inputPrice), name: itemName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmVisible(false);
      Alert.alert('Updated', `${itemName} price changed to ₱${inputPrice}!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update price.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
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
              onPress={() => router.back()}
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

      {/* Confirmation Modal matching image_03bd46.png */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="tag-multiple" size={44} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}change the price?
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
                onPress={handleConfirmChange}
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
});
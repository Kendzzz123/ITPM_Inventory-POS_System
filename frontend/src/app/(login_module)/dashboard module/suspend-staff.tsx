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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

export default function SuspendStaffScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();

  const staffId = params.id || '105';
  const staffName = params.name || 'Uno Dos';

  const [days, setDays] = useState('6');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmSuspend = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${API_URL}/protected/staff/${staffId}/suspend`,
        { status: 'suspended', days: Number(days) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmVisible(false);
      Alert.alert('Suspended', `${staffName} has been suspended for ${days} days.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to suspend staff.');
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

        <Text style={styles.pageTitle}>Suspend Staff</Text>

        {/* Yellow Avatar */}
        <View style={styles.avatarCircle}>
          <Ionicons name="person-outline" size={78} color="#9e7b08" />
        </View>

        {/* Staff Name */}
        <Text style={styles.staffName}>{staffName}</Text>

        {/* Days Input */}
        <View style={styles.inputSection}>
          <Text style={styles.italicLabel}>Days will be suspended</Text>
          <View style={styles.daysBox}>
            <TextInput
              style={styles.daysInput}
              value={days}
              onChangeText={setDays}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmMainBtn}
          onPress={() => setConfirmVisible(true)}
        >
          <Text style={styles.confirmMainBtnText}>Confirm</Text>
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
              <Feather name="slash" size={48} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}suspend this staff?
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
                onPress={handleConfirmSuspend}
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
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 22,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#fbcb04',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  staffName: {
    fontSize: 15,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 28,
  },
  inputSection: {
    width: '100%',
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  italicLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#1f2937',
    marginBottom: 6,
    marginLeft: 6,
  },
  daysBox: {
    height: 54,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    color: '#111827',
  },
  confirmMainBtn: {
    alignSelf: 'center',
    width: 200,
    height: 44,
    backgroundColor: '#ef0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmMainBtnText: {
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
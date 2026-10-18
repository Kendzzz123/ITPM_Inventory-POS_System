import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

// Sample data matching your UI design
const INITIAL_TRANSACTIONS = [
  { id: '1', date: '01/3/2026', time: '13:15', product: 'Whole Cut Chicken', amount: 580, method: 'Cash' },
  { id: '2', date: '01/3/2026', time: '13:15', product: 'Half Cut Chicken', amount: 300, method: 'E-wallet' },
  { id: '3', date: '01/3/2026', time: '13:15', product: 'Liempo Cut', amount: 600, method: 'Cash' },
  { id: '4', date: '12/31/2025', time: '15:13', product: 'Whole Cut Chicken', amount: 290, method: 'Cash' },
  { id: '5', date: '12/31/2025', time: '12:45', product: 'Liempo Cut', amount: 600, method: 'E-wallet' },
];

export default function TransactionHistoryScreen() {
  const router = useRouter();

  // State
  const [modalVisible, setModalVisible] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);

  // Filter selections
  const [dateFilter, setDateFilter] = useState<'Today' | 'This Week' | 'This Month' | 'Custom'>('Today');
  const [paymentMethod, setPaymentMethod] = useState<'All' | 'Cash' | 'E-wallet'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Handle Export to Excel (.xlsx)
  const handleExport = async () => {
    try {
      // 1. Prepare worksheet data
      const dataToExport = INITIAL_TRANSACTIONS.map((item) => ({
        Date: item.date,
        Time: item.time,
        Product: item.product,
        'Total Amount (PHP)': item.amount,
        'Payment Method': item.method,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // 2. Generate Base64 binary
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `Transactions_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // 3. Save to file system
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setExportedFilePath(fileUri);
      setModalVisible(false);
      setExportComplete(true);
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export file.');
    }
  };

  // Open or Share file
  const handleShareOrOpen = async () => {
    if (!exportedFilePath) return;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(exportedFilePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exported Transactions',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      Alert.alert('Sharing unavailable', 'Sharing is not supported on this platform.');
    }
  };

  // ---- SUCCESS SCREEN VIEW ----
  if (exportComplete) {
    return (
      <View style={styles.successContainer}>
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <Pressable onPress={() => setExportComplete(false)}>
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
          <Text style={styles.hamburger}>☰</Text>
        </View>

        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Export Complete</Text>

          {/* Green Check Circle */}
          <View style={styles.checkCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <Text style={styles.savedText}>Saved to your device.</Text>

          <Pressable style={styles.redButton} onPress={handleShareOrOpen}>
            <Text style={styles.redButtonText}>Open File</Text>
          </Pressable>

          <Pressable style={styles.outlinedButton} onPress={handleShareOrOpen}>
            <Text style={styles.outlinedButtonText}>Share</Text>
          </Pressable>

          <Pressable onPress={() => setExportComplete(false)} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back to Transaction History</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- MAIN TRANSACTION HISTORY VIEW ----
  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topNav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.hamburger}>☰</Text>
      </View>

      <Text style={styles.mainTitle}>Transaction History</Text>

      {/* Table Card */}
      <View style={styles.tableCard}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Date</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Time</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Product</Text>
          <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Total Amount</Text>
        </View>

        {/* Rows */}
        <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
          {INITIAL_TRANSACTIONS.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <Text style={[styles.cellText, { flex: 1.2 }]}>{row.date}</Text>
              <Text style={[styles.cellText, { flex: 1 }]}>{row.time}</Text>
              <Text style={[styles.cellText, { flex: 1.5 }]}>{row.product}</Text>
              <Text style={[styles.cellText, { flex: 1.2, textAlign: 'right' }]}>{row.amount}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Export to Excel Trigger Button */}
      <View style={styles.exportTriggerContainer}>
        <Pressable style={styles.exportOutlineBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.exportOutlineBtnText}>Export to Excel</Text>
        </Pressable>
      </View>

      {/* ---- EXPORT TO EXCEL BOTTOM MODAL ---- */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Export to Excel</Text>

            {/* Date Section */}
            <Text style={styles.filterGroupLabel}>Date</Text>
            <View style={styles.pillRow}>
              {(['Today', 'This Week', 'This Month', 'Custom'] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[styles.pill, dateFilter === option && styles.pillActive]}
                  onPress={() => setDateFilter(option)}
                >
                  <Text style={[styles.pillText, dateFilter === option && styles.pillTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Date Pickers (Shown when 'Custom' is selected) */}
            {dateFilter === 'Custom' && (
              <View style={styles.customDateRow}>
                <View style={styles.dateInputBox}>
                  <TextInput
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#9ca3af"
                    value={startDate}
                    onChangeText={setStartDate}
                    style={styles.dateInput}
                  />
                  <Text style={styles.calendarIcon}>📅</Text>
                </View>
                <Text style={styles.dateSeparator}>—</Text>
                <View style={styles.dateInputBox}>
                  <TextInput
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#9ca3af"
                    value={endDate}
                    onChangeText={setEndDate}
                    style={styles.dateInput}
                  />
                  <Text style={styles.calendarIcon}>📅</Text>
                </View>
              </View>
            )}

            {/* Payment Method Section */}
            <Text style={styles.filterGroupLabel}>Payment Method</Text>
            <View style={styles.pillRow}>
              {(['All', 'Cash', 'E-wallet'] as const).map((method) => (
                <Pressable
                  key={method}
                  style={[styles.pill, paymentMethod === method && styles.pillActive]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[styles.pillText, paymentMethod === method && styles.pillTextActive]}>
                    {method}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Bottom Actions */}
            <View style={styles.modalActionsRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalExportBtn} onPress={handleExport}>
                <Text style={styles.modalExportBtnText}>📥 Export</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffdf5',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backChevron: {
    fontSize: 34,
    color: '#111827',
    fontWeight: 'bold',
  },
  hamburger: {
    fontSize: 26,
    color: '#111827',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 26,
  },

  /* Table styling */
  tableCard: {
    backgroundColor: '#fffdf5',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#f6b800',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  tableBody: {
    maxHeight: 360,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 12,
    color: '#374151',
  },

  /* Main screen export button */
  exportTriggerContainer: {
    alignItems: 'flex-end',
    marginTop: 24,
  },
  exportOutlineBtn: {
    borderColor: '#c00000',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  exportOutlineBtnText: {
    color: '#c00000',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Bottom sheet modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fffdf5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  filterGroupLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 14,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderColor: '#c00000',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#c00000',
  },
  pillText: {
    color: '#c00000',
    fontWeight: '600',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#ffffff',
  },

  /* Custom date inputs */
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  dateInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#c00000',
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: '#ffffff',
  },
  dateInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
  },
  calendarIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  dateSeparator: {
    marginHorizontal: 8,
    color: '#c00000',
    fontWeight: '900',
  },

  /* Modal Actions */
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 32,
  },
  modalCancelBtn: {
    flex: 1,
    borderColor: '#c00000',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fffdf5',
  },
  modalCancelBtnText: {
    color: '#c00000',
    fontWeight: '700',
    fontSize: 15,
  },
  modalExportBtn: {
    flex: 1,
    backgroundColor: '#c00000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalExportBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },

  /* Success View */
  successContainer: {
    flex: 1,
    backgroundColor: '#fffdf5',
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 40,
  },
  checkCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: '#387c2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 64,
    color: '#387c2b',
    fontWeight: '900',
  },
  savedText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 40,
  },
  redButton: {
    backgroundColor: '#c00000',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  redButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  outlinedButton: {
    borderColor: '#c00000',
    borderWidth: 1.5,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  outlinedButtonText: {
    color: '#c00000',
    fontWeight: '700',
    fontSize: 16,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    color: '#c00000',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
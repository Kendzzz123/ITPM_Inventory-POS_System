// TransactionHistory.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { showAlert } from '@/utils/alert';
import { API_URL } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getDarkMode, setGlobalDarkMode, getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';


// 4.1 Color Palette Specification
const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  sheetCream: '#FDF8EA',
  modalCream: '#FDFBF0',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
  green: '#3F7D00',
  darkBg: '#181920',
  darkCard: '#22242E',
  darkBorder: '#2E3240',
};

type TransactionItem = {
  id: string;
  date: string;
  time: string;
  product: string;
  amount: number | string;
  method: string;
};

export default function TransactionHistoryScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Role & Dark Mode State
  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState<boolean>(getDarkMode());

  const isCashierDark = role === 'cashier' && darkMode;
  const iconColor = isCashierDark ? COLORS.white : COLORS.nearBlack;
  const textColor = { color: iconColor };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  // Transactions & Loading State
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Export Modal & Success View State
  const [modalVisible, setModalVisible] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [exportedWbBase64, setExportedWbBase64] = useState<string | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string>('Transactions.xlsx');

  // Export Filter Selections
  const [dateFilter, setDateFilter] = useState<'Today' | 'This Week' | 'This Month' | 'Custom' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'All' | 'Cash' | 'E-wallet' | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Side Drawer State
  const [menuVisible, setMenuVisible] = useState(false);

  // Load Transactions & User Role from Backend
  const loadTransactions = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const [accRes, res] = await Promise.all([
        axios
          .get(`${API_URL}/protected/account`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        axios.get(`${API_URL}/protected/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (accRes?.data?.account?.role) {
        const fetchedRole =
          accRes.data.account.role.toLowerCase() === 'manager' ? 'manager' : 'cashier';
        setRole(fetchedRole);
        setGlobalUserRole(fetchedRole);
      }

      setTransactions(res.data?.transactions || []);
    } catch (err: any) {
      setTransactions([]);
      showAlert('Error', err.response?.data?.message || 'Could not load transaction history.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  // Handle Export to Excel (.xlsx)
  const handleExport = async () => {
    setExporting(true);
    try {
      if (dateFilter === 'Custom' && (!startDate.trim() || !endDate.trim())) {
        showAlert('Missing Dates', 'Please enter both start and end dates (MM/DD/YYYY).');
        return;
      }

      // The server applies the filters, so the file contains exactly what was selected.
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          dateFilter: dateFilter || undefined,
          paymentMethod: paymentMethod || undefined,
          startDate: dateFilter === 'Custom' ? startDate.trim() : undefined,
          endDate: dateFilter === 'Custom' ? endDate.trim() : undefined,
        },
      });
      const rowsToExport: TransactionItem[] = res.data?.transactions || [];

      if (rowsToExport.length === 0) {
        showAlert('Nothing to Export', 'No transactions match the selected filters.');
        return;
      }

      const dataToExport = rowsToExport.map((item) => ({
        Date: item.date,
        Time: item.time,
        Product: String(item.product).replace(/\n/g, ' '),
        'Total Amount (PHP)': Number(item.amount),
        'Payment Method': item.method || 'Cash',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      const filename = `MrLiempo_Transactions_${Date.now()}.xlsx`;
      setExportedFilename(filename);

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        setExportedWbBase64(wbout);
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setModalVisible(false);
        setExportComplete(true);
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const file = new File(Paths.document, filename);
        file.create({ overwrite: true });
        await file.write(wbout, { encoding: 'base64' });

        setExportedFilePath(file.uri);
        setModalVisible(false);
        setExportComplete(true);
      }
    } catch (err: any) {
      showAlert('Export Failed', err.response?.data?.message || err.message || 'Could not export file.');
    } finally {
      setExporting(false);
    }
  };

  // Open or Share the exported Excel file
  const handleShareOrOpen = async () => {
    if (Platform.OS === 'web') {
      if (exportedWbBase64) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${exportedWbBase64}`;
        link.download = exportedFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    if (!exportedFilePath) {
      showAlert('File not found', 'Please export the transactions again.');
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(exportedFilePath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Mr. Liempo Transactions',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        showAlert('Saved', `File saved at: ${exportedFilePath}`);
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not open file.');
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={[styles.loadingCenter, isCashierDark && { backgroundColor: COLORS.darkBg }]}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  // ============================================================================
  // VIEW 1: EXPORT COMPLETE STATUS SCREEN
  // ============================================================================
  if (exportComplete) {
    return (
      <SafeAreaView
        style={[styles.safeArea, isCashierDark && { backgroundColor: COLORS.darkBg }]}
        edges={['top', 'bottom']}
      >
        <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />
        <View style={styles.successWrapper}>
          {/* Top Navigation */}
          <View style={styles.topNavPadded}>
            <TouchableOpacity
              onPress={() => setExportComplete(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color={iconColor} />
            </TouchableOpacity>
          </View>

          {/* Centered Status Content */}
          <View style={styles.successContent}>
            <Text style={[styles.successTitle, textColor]}>Export Complete</Text>

            <View style={styles.checkCircle}>
              <Feather name="check" size={86} color={COLORS.green} />
            </View>

            <Text style={[styles.savedText, textColor]}>Saved to your device.</Text>

            <TouchableOpacity
              style={styles.openFileBtn}
              activeOpacity={0.85}
              onPress={handleShareOrOpen}
            >
              <Text style={styles.openFileBtnText}>Open File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shareBtn,
                isCashierDark && { backgroundColor: COLORS.darkCard },
              ]}
              activeOpacity={0.8}
              onPress={handleShareOrOpen}
            >
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExportComplete(false)}
              style={styles.backLinkBtn}
            >
              <Text style={styles.backLinkText}>Back to Transaction History</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RoleSideDrawer
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          role={role}
          darkMode={darkMode}
          onToggleDarkMode={() => setGlobalDarkMode(!darkMode)}
        />
      </SafeAreaView>
    );
  }

  // ============================================================================
  // VIEW 2: MAIN TRANSACTION HISTORY SCREEN
  // ============================================================================
  return (
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: COLORS.darkBg }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.red]} />
        }
      >
        <View style={styles.mainWrapper}>
          {/* Top Navigation Bar */}
          <View style={styles.topNavPadded}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color={iconColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.mainTitle, textColor]}>Transaction History</Text>

          {/* Edge-to-Edge Transaction History Table Card */}
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.red} style={{ marginVertical: 40 }} />
          ) : (
            <View
              style={[
                styles.tableCard,
                isCashierDark && { backgroundColor: COLORS.darkCard },
              ]}
            >
              {/* Brand Yellow Header Row with Red Labels */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 1.15 }]}>Date</Text>
                <Text style={[styles.headerCell, { flex: 0.9 }]}>Time</Text>
                <Text style={[styles.headerCell, { flex: 1.35 }]}>Product</Text>
                <Text style={[styles.headerCell, { flex: 1.2 }]}>Total Amount</Text>
              </View>

              {/* Table Rows */}
              {transactions.length === 0 && (
                <View style={[styles.tableRow, isCashierDark && { backgroundColor: COLORS.darkCard }]}>
                  <Text style={[styles.cellText, textColor, { flex: 1, textAlign: 'center' }]}>
                    No transactions yet.
                  </Text>
                </View>
              )}
              {transactions.map((row, idx) => (
                <View
                  key={row.id || idx}
                  style={[
                    styles.tableRow,
                    isCashierDark && { backgroundColor: COLORS.darkCard },
                    idx !== transactions.length - 1 && styles.tableRowBorder,
                    idx !== transactions.length - 1 &&
                      isCashierDark && { borderBottomColor: COLORS.darkBorder },
                  ]}
                >
                  <Text style={[styles.cellText, textColor, { flex: 1.15 }]}>{row.date}</Text>
                  <Text style={[styles.cellText, textColor, { flex: 0.9 }]}>{row.time}</Text>
                  <Text style={[styles.cellText, textColor, { flex: 1.35 }]} numberOfLines={2}>
                    {row.product}
                  </Text>
                  <Text style={[styles.cellText, textColor, { flex: 1.2 }]}>
                    {Number(row.amount).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Export to Excel Outlined Trigger Button */}
          <View style={styles.exportTriggerContainer}>
            <TouchableOpacity
              style={[
                styles.exportOutlineBtn,
                isCashierDark && { backgroundColor: COLORS.darkCard },
              ]}
              activeOpacity={0.8}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.exportOutlineBtnText}>Export to Excel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ======================================================================== */}
      {/* EXPORT TO EXCEL BOTTOM SHEET MODAL                                       */}
      {/* ======================================================================== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View
            style={[
              styles.modalSheet,
              isCashierDark && { backgroundColor: COLORS.darkCard },
            ]}
          >
            <Text style={[styles.modalTitle, textColor]}>Export to Excel</Text>

            {/* Date Filter Section */}
            <Text style={[styles.filterGroupLabel, textColor]}>Date</Text>
            <View style={styles.pillRow}>
              {(['Today', 'This Week', 'This Month', 'Custom'] as const).map((option) => {
                const isSelected = dateFilter === option;
                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.8}
                    style={[styles.pill, isSelected && styles.pillActive]}
                    onPress={() => setDateFilter(option)}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Date Range Inputs */}
            {dateFilter === 'Custom' && (
              <View style={styles.customDateRow}>
                <View
                  style={[
                    styles.dateInputBox,
                    isCashierDark && { backgroundColor: COLORS.darkBg },
                  ]}
                >
                  <TextInput
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#9CA3AF"
                    value={startDate}
                    onChangeText={setStartDate}
                    style={[styles.dateInput, textColor]}
                  />
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={18}
                    color="#9CA3AF"
                  />
                </View>

                <View style={styles.redDashSeparator} />

                <View
                  style={[
                    styles.dateInputBox,
                    isCashierDark && { backgroundColor: COLORS.darkBg },
                  ]}
                >
                  <TextInput
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#9CA3AF"
                    value={endDate}
                    onChangeText={setEndDate}
                    style={[styles.dateInput, textColor]}
                  />
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={18}
                    color="#9CA3AF"
                  />
                </View>
              </View>
            )}

            {/* Payment Method Section */}
            <Text style={[styles.filterGroupLabel, textColor, { marginTop: 18 }]}>
              Payment Method
            </Text>
            <View style={styles.pillRow}>
              {(['All', 'Cash', 'E-wallet'] as const).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    activeOpacity={0.8}
                    style={[styles.pill, isSelected && styles.pillActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Modal Action Buttons (Cancel & Export) */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
                disabled={exporting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalExportBtn}
                activeOpacity={0.85}
                onPress={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <View style={styles.exportBtnContent}>
                    <Feather name="download" size={16} color={COLORS.white} />
                    <Text style={styles.modalExportBtnText}>Export</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROLE-AWARE SIDE DRAWER MENU (Cashier Menu vs Manager Menu) */}
      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role={role}
        darkMode={darkMode}
        onToggleDarkMode={() => setGlobalDarkMode(!darkMode)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  mainWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  topNavPadded: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 20,
  },
  mainTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 23,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginBottom: 26,
  },
  tableCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: COLORS.yellow,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerCell: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: COLORS.red,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F9F6EE',
  },
  cellText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 9.5,
    color: COLORS.nearBlack,
    textAlign: 'center',
    lineHeight: 13,
  },
  exportTriggerContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 24,
  },
  exportOutlineBtn: {
    borderColor: COLORS.red,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 26,
    backgroundColor: COLORS.cream,
  },
  exportOutlineBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 21, 0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: COLORS.sheetCream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    elevation: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: COLORS.nearBlack,
    marginBottom: 14,
  },
  filterGroupLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minWidth: 74,
    borderColor: COLORS.red,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.red,
  },
  pillText: {
    fontFamily: 'Poppins_400Regular',
    color: COLORS.red,
    fontSize: 10.5,
  },
  pillTextActive: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    justifyContent: 'space-between',
  },
  dateInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: COLORS.red,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    backgroundColor: COLORS.white,
  },
  dateInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: COLORS.nearBlack,
    paddingVertical: 0,
  },
  redDashSeparator: {
    width: 16,
    height: 3.5,
    backgroundColor: COLORS.red,
    marginHorizontal: 8,
    borderRadius: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 28,
    paddingHorizontal: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderColor: COLORS.red,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  modalCancelBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
    fontSize: 11,
  },
  modalExportBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalExportBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 11,
  },
  successWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
    paddingBottom: 40,
  },
  successTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: COLORS.nearBlack,
    marginBottom: 28,
    textAlign: 'center',
  },
  checkCircle: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 12,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  savedText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: COLORS.nearBlack,
    marginBottom: 38,
    textAlign: 'center',
  },
  openFileBtn: {
    backgroundColor: COLORS.red,
    width: '100%',
    maxWidth: 260,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  openFileBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 11.5,
  },
  shareBtn: {
    borderColor: COLORS.red,
    borderWidth: 1,
    backgroundColor: COLORS.cream,
    width: '100%',
    maxWidth: 260,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  shareBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.red,
    fontSize: 11.5,
  },
  backLinkBtn: {
    paddingVertical: 4,
  },
  backLinkText: {
    fontFamily: 'Poppins_400Regular',
    color: COLORS.red,
    fontSize: 10.5,
    textDecorationLine: 'underline',
  },
});
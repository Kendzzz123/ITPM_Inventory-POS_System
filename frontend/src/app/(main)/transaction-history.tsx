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
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { File } from 'expo-file-system';
import { saveExcelToDevice, shareFile } from '@/services/exportFile';
import { buildTransactionsXlsxBase64 } from '@/services/exportSheet';
import { showAlert } from '@/utils/alert';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getUserRole, setGlobalUserRole, subscribeAppTheme } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { formatDateInput, parseSlashDate } from '@/utils/dates';


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
};

type TransactionItem = {
  id: string;
  date: string;
  time: string;
  product: string;
  amount: number | string;
  method: string;
};

type DateFilter = 'Today' | 'This Week' | 'This Month' | 'Custom';
/** The date filter applied to the list on screen (start/end only for Custom). */
type AppliedFilter = { filter: DateFilter; start: string; end: string };
const DATE_FILTERS: DateFilter[] = ['Today', 'This Week', 'This Month', 'Custom'];

export default function TransactionHistoryScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Role State
  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());

  // Only managers can export. (The server also checks this on /transactions/export.)
  const isManager = role === 'manager';
  const iconColor = COLORS.nearBlack;
  const textColor = { color: iconColor };

  useEffect(() => {
    return subscribeAppTheme(() => {
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
  const [savedMessage, setSavedMessage] = useState('Saved to your device.');
  const [exportedFilename, setExportedFilename] = useState<string>('Transactions.xlsx');

  // Export Filter Selections
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Side Drawer State
  const [menuVisible, setMenuVisible] = useState(false);

  // On-screen filter ("Filter" link). The draft is what's being picked in the
  // panel; "applied" is what the list shows, and only changes on Apply.
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<DateFilter | null>(null);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [applied, setApplied] = useState<AppliedFilter | null>(null);

  // Load Transactions & User Role from Backend
  const loadTransactions = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const [accRes, res] = await Promise.all([
        api
          .get(API_ROUTES.ACCOUNT, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        api.get(API_ROUTES.TRANSACTIONS, {
          headers: { Authorization: `Bearer ${token}` },
          params: applied
            ? {
                dateFilter: applied.filter,
                startDate: applied.filter === 'Custom' ? applied.start : undefined,
                endDate: applied.filter === 'Custom' ? applied.end : undefined,
              }
            : undefined,
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
  }, [router, applied]);

  // Reload whenever this screen is shown (e.g. coming back after a sale).
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  /** "This Week", or "11/01/2026 – 11/10/2026" for a custom range. */
  const appliedLabel = applied
    ? applied.filter === 'Custom'
      ? `${applied.start} – ${applied.end}`
      : applied.filter
    : '';

  /** Opens the filter panel showing what is applied now. */
  const openFilter = () => {
    setDraftFilter(applied?.filter ?? null);
    setDraftStart(applied?.start ?? '');
    setDraftEnd(applied?.end ?? '');
    setFilterOpen(true);
  };

  /** Apply: checks a custom range, then reloads the list with the filter. */
  const applyFilter = () => {
    if (!draftFilter) {
      setFilterOpen(false);
      if (applied) {
        setLoading(true);
        setApplied(null);
      }
      return;
    }
    if (draftFilter === 'Custom') {
      const from = parseSlashDate(draftStart);
      const to = parseSlashDate(draftEnd);
      if (!from || !to) {
        showAlert('Invalid Dates', 'Enter both dates as mm/dd/yyyy (e.g. 11/01/2026).');
        return;
      }
      if (from.getTime() > to.getTime()) {
        showAlert('Invalid Dates', 'The first date must be on or before the second date.');
        return;
      }
    }
    setLoading(true);
    setApplied({ filter: draftFilter, start: draftStart.trim(), end: draftEnd.trim() });
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setLoading(true);
    setApplied(null);
  };

  /** Export starts from the filter shown on screen; it can still be changed in the sheet. */
  const openExport = () => {
    setDateFilter(applied?.filter ?? null);
    setStartDate(applied?.filter === 'Custom' ? applied.start : '');
    setEndDate(applied?.filter === 'Custom' ? applied.end : '');
    setModalVisible(true);
  };

  // Handle Export to Excel (.xlsx)
  const handleExport = async () => {
    if (!isManager) {
      setModalVisible(false);
      showAlert('Not Allowed', 'Only managers can export transactions.');
      return;
    }
    setExporting(true);
    try {
      if (dateFilter === 'Custom') {
        const from = parseSlashDate(startDate);
        const to = parseSlashDate(endDate);
        if (!from || !to) {
          showAlert('Invalid Dates', 'Enter both dates as mm/dd/yyyy (e.g. 11/01/2026).');
          return;
        }
        if (from.getTime() > to.getTime()) {
          showAlert('Invalid Dates', 'The first date must be on or before the second date.');
          return;
        }
      }

      // The server applies the filters, so the file contains exactly what was selected.
      const token = await getToken();
      const res = await api.get(API_ROUTES.TRANSACTIONS_EXPORT, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          dateFilter: dateFilter || undefined,
          startDate: dateFilter === 'Custom' ? startDate.trim() : undefined,
          endDate: dateFilter === 'Custom' ? endDate.trim() : undefined,
        },
      });
      const rowsToExport: TransactionItem[] = res.data?.transactions || [];

      if (rowsToExport.length === 0) {
        showAlert('Nothing to Export', 'No transactions match the selected filters.');
        return;
      }

      // Human-readable labels for the sheet's filter line.
      const dateLabel =
        dateFilter === 'Custom'
          ? `${startDate.trim()} to ${endDate.trim()}`
          : dateFilter || 'All dates';
      const methodLabel = 'All payment methods';

      const wbout = buildTransactionsXlsxBase64(
        rowsToExport.map((item) => ({
          date: item.date,
          time: item.time,
          product: String(item.product),
          amount: Number(item.amount),
          method: item.method || 'Cash',
        })),
        { dateLabel, methodLabel }
      );

      // "Mr Liempo Transactions 2026-10-28 1925.xlsx"
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `Mr Liempo Transactions ${stamp}.xlsx`;
      setExportedFilename(filename);

      if (Platform.OS === 'web') {
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
        setModalVisible(false);
        // Android: saves into a folder you choose (e.g. Download).
        // iPhone: opens the share menu -> "Save to Files".
        const result = await saveExcelToDevice(wbout, filename);
        setExportedFilePath(result.shareUri);
        setSavedMessage(result.message);
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
      await shareFile(exportedFilePath, 'Mr. Liempo Transactions');
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not share the file.');
    }
  };

  /** Opens the exported file in a preview (falls back to the share menu). */
  const handleOpenFile = async () => {
    if (Platform.OS === 'web' || !exportedFilePath) {
      handleShareOrOpen();
      return;
    }
    try {
      const file = new File(exportedFilePath);
      if (await File.canPreview(file)) {
        await File.preview(file);
        return;
      }
    } catch {
      // No previewer available -> share menu lets the user pick Excel / Sheets.
    }
    handleShareOrOpen();
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingCenter}>
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
        style={styles.safeArea}
        edges={['top', 'bottom']}
      >
        <StatusBar barStyle="dark-content" />
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

            <Text style={[styles.savedText, textColor]}>{savedMessage}</Text>

            <TouchableOpacity
              style={styles.openFileBtn}
              activeOpacity={0.85}
              onPress={handleOpenFile}
            >
              <Text style={styles.openFileBtnText}>Open File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareBtn}
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
        />
      </SafeAreaView>
    );
  }

  // ============================================================================
  // VIEW 2: MAIN TRANSACTION HISTORY SCREEN
  // ============================================================================
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" />

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

          {/* Filter link + applied filter */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={styles.filterLink}
              onPress={() => (filterOpen ? setFilterOpen(false) : openFilter())}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityState={{ expanded: filterOpen }}
            >
              <MaterialCommunityIcons name="tune-variant" size={16} color={COLORS.red} />
              <Text style={styles.filterLinkText}>Filter</Text>
            </TouchableOpacity>
            {applied && !filterOpen && (
              <View style={styles.appliedChip}>
                <Text style={styles.appliedChipText} numberOfLines={1}>
                  {appliedLabel}
                </Text>
                <TouchableOpacity
                  onPress={clearFilter}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear filter"
                >
                  <Ionicons name="close" size={14} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {filterOpen && (
            <View style={styles.filterPanel}>
              <View style={styles.pillRow}>
                {DATE_FILTERS.map((option) => {
                  const isSelected = draftFilter === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      activeOpacity={0.8}
                      style={[styles.pill, styles.panelPill, isSelected && styles.pillActive]}
                      onPress={() => setDraftFilter(isSelected ? null : option)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {draftFilter === 'Custom' && (
                <View style={styles.customDateRow}>
                  <View style={styles.dateInputBox}>
                    <TextInput
                      placeholder="mm/dd/yyyy"
                      placeholderTextColor="#9CA3AF"
                      value={draftStart}
                      onChangeText={(t) => setDraftStart(formatDateInput(t))}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={[styles.dateInput, textColor]}
                      accessibilityLabel="From date"
                    />
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={COLORS.red} />
                  </View>
                  <View style={styles.redDashSeparator} />
                  <View style={styles.dateInputBox}>
                    <TextInput
                      placeholder="mm/dd/yyyy"
                      placeholderTextColor="#9CA3AF"
                      value={draftEnd}
                      onChangeText={(t) => setDraftEnd(formatDateInput(t))}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={[styles.dateInput, textColor]}
                      accessibilityLabel="To date"
                    />
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={COLORS.red} />
                  </View>
                </View>
              )}

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.filterCancelBtn}
                  onPress={() => setFilterOpen(false)}
                >
                  <Text style={styles.filterCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApplyBtn} onPress={applyFilter}>
                  <Text style={styles.filterApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Edge-to-Edge Transaction History Table Card */}
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.red} style={{ marginVertical: 40 }} />
          ) : (
            <View
              style={styles.tableCard}
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
                <View style={styles.tableRow}>
                  <Text style={[styles.cellText, textColor, { flex: 1, textAlign: 'center' }]}>
                    {applied ? 'No transactions for this filter.' : 'No transactions yet.'}
                  </Text>
                </View>
              )}
              {transactions.map((row, idx) => (
                <View
                  key={row.id || idx}
                  style={[
                    styles.tableRow,
                    idx !== transactions.length - 1 && styles.tableRowBorder,
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

          {/* Export to Excel Outlined Trigger Button (manager only) */}
          {isManager ? (
            <View style={styles.exportTriggerContainer}>
              <TouchableOpacity
                style={styles.exportOutlineBtn}
                activeOpacity={0.8}
                onPress={openExport}
              >
                <Text style={styles.exportOutlineBtnText}>Export to Excel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ height: 24 }} />
          )}
        </View>
      </ScrollView>

      {/* ======================================================================== */}
      {/* EXPORT TO EXCEL BOTTOM SHEET MODAL                                       */}
      {/* ======================================================================== */}
      <Modal
        visible={modalVisible && isManager}
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
            style={styles.modalSheet}
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
                  style={styles.dateInputBox}
                >
                  <TextInput
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#9CA3AF"
                    value={startDate}
                    onChangeText={(t) => setStartDate(formatDateInput(t))}
                    keyboardType="number-pad"
                    maxLength={10}
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
                  style={styles.dateInputBox}
                >
                  <TextInput
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#9CA3AF"
                    value={endDate}
                    onChangeText={(t) => setEndDate(formatDateInput(t))}
                    keyboardType="number-pad"
                    maxLength={10}
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 12,
    
  },
  filterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    
  },
  filterLinkText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: COLORS.red,
    textDecorationLine: 'underline',
    
  },
  appliedChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  appliedChipText: {
    flexShrink: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: COLORS.red,
  },
  filterPanel: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  panelPill: {
    minWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  filterCancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  filterCancelText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: COLORS.red,
  },
  filterApplyBtn: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 18,
    backgroundColor: COLORS.red,
  },
  filterApplyText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10.5,
    color: COLORS.white,
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
    marginLeft: 10,
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
    minWidth: 0, // lets the box shrink so the calendar icon stays visible
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

// TEST: Filter -> This Week -> Apply reloads /transactions?dateFilter=This Week and shows a "This Week" chip; × clears it
// TEST: Custom with an end date before the start date -> "Invalid Dates"; Cancel keeps the applied filter

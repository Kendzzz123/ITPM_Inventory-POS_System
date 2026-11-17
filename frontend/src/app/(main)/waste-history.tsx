import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { showAlert } from '@/utils/alert';
import { formatDateInput, parseSlashDate, matchesDateFilter, type DateFilterChoice } from '@/utils/dates';


type WasteEntry = {
  id: string;
  date: string;
  item: string;
  quantity: string;
};

// Same filter choices as Transaction History.
type DateFilter = DateFilterChoice;
/** The date filter applied to the list on screen (start/end only for Custom). */
type AppliedFilter = { filter: DateFilter; start: string; end: string };
const DATE_FILTERS: DateFilter[] = ['Today', 'This Week', 'This Month', 'Custom'];

const RED = '#EC0000';

export default function WasteHistoryScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [history, setHistory] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // "Filter" link. The draft is what's being picked in the panel;
  // "applied" is what the list shows, and only changes on Apply.
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<DateFilter | null>(null);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [applied, setApplied] = useState<AppliedFilter | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await api.get(API_ROUTES.WASTE_HISTORY, {
        headers: { Authorization: `Bearer ${token}` },
        params: applied
          ? {
              dateFilter: applied.filter,
              startDate: applied.filter === 'Custom' ? applied.start : undefined,
              endDate: applied.filter === 'Custom' ? applied.end : undefined,
            }
          : undefined,
      });
      setHistory(res.data?.history || []);
    } catch (err: any) {
      setHistory([]);
      showAlert('Error', err.response?.data?.message || 'Could not load waste history.');
    } finally {
      setLoading(false);
    }
  }, [router, applied]);

  // Reload whenever this screen is shown (e.g. coming back after Record Waste).
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  // Rows shown on screen. The backend already filters; checking here too keeps the
  // filter working even when the PC is still running an older backend.
  const rows = applied
    ? history.filter((row) => matchesDateFilter(row.date, applied.filter, applied.start, applied.end))
    : history;

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e60000']} />
        }
      >
        <View style={styles.container}>
          {/* Padded Header */}
          <View style={styles.topSection}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="chevron-back" size={30} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageTitle}>Waste History</Text>
          </View>

          {/* Filter link + applied filter */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={styles.filterLink}
              onPress={() => (filterOpen ? setFilterOpen(false) : openFilter())}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityState={{ expanded: filterOpen }}
            >
              <MaterialCommunityIcons name="tune-variant" size={16} color={RED} />
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
                  <Ionicons name="close" size={14} color={RED} />
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
                      style={[styles.pill, isSelected && styles.pillActive]}
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
                      style={styles.dateInput}
                      accessibilityLabel="From date"
                    />
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={RED} />
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
                      style={styles.dateInput}
                      accessibilityLabel="To date"
                    />
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={RED} />
                  </View>
                </View>
              )}

              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.filterCancelBtn} onPress={() => setFilterOpen(false)}>
                  <Text style={styles.filterCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApplyBtn} onPress={applyFilter}>
                  <Text style={styles.filterApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 1.1 }]}>Date</Text>
                <Text style={[styles.thCell, { flex: 1.8 }]}>Item</Text>
                <Text style={[styles.thCell, { flex: 0.9 }]}>Quantity</Text>
              </View>

              {rows.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>
                    {applied ? 'No waste recorded for this period.' : 'No waste recorded yet.'}
                  </Text>
                </View>
              )}

              {rows.map((row, idx) => (
                <View
                  key={row.id || idx}
                  style={[
                    styles.tableRow,
                    idx !== rows.length - 1 && styles.tableRowBorder,
                  ]}
                >
                  <Text style={[styles.tdCell, { flex: 1.1 }]}>{row.date}</Text>
                  <Text style={[styles.tdCell, { flex: 1.8 }]}>{row.item}</Text>
                  <Text style={[styles.tdCell, { flex: 0.9 }]}>{row.quantity}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
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
    paddingTop: 16,
    paddingBottom: 28,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  topSection: {
    paddingHorizontal: 18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  // Filter (same look as Transaction History)
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
    color: RED,
    textDecorationLine: 'underline',
  },
  appliedChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: RED,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  appliedChipText: {
    flexShrink: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: RED,
  },
  filterPanel: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 10,
  },
  pill: {
    borderColor: RED,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: RED,
  },
  pillText: {
    fontFamily: 'Poppins_400Regular',
    color: RED,
    fontSize: 10.5,
  },
  pillTextActive: {
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
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
    borderColor: RED,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    backgroundColor: '#FFFFFF',
  },
  dateInput: {
    flex: 1,
    minWidth: 0, // lets the box shrink so the calendar icon stays visible
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#0F1015',
    paddingVertical: 0,
  },
  redDashSeparator: {
    width: 16,
    height: 3.5,
    backgroundColor: RED,
    marginHorizontal: 8,
    borderRadius: 2,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  filterCancelBtn: {
    borderWidth: 1,
    borderColor: RED,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  filterCancelText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: RED,
  },
  filterApplyBtn: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 18,
    backgroundColor: RED,
  },
  filterApplyText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  tableCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffc400',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  thCell: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#ef0000',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ffdf70',
  },
  tdCell: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#1f2937',
    textAlign: 'center',
  },
});

// TEST: Filter -> Today -> Apply reloads /waste-history?dateFilter=Today and shows a "Today" chip; × clears it
// TEST: Custom with a bad or reversed range -> "Invalid Dates" alert and the list doesn't change

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { showAlert } from '@/utils/alert';


const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;
type Period = (typeof PERIODS)[number];

type SalesItem = {
  label: string;
  value: number;
};

/** One row of the Details table: an item, how many sold, its share of all items sold. */
type DetailRow = {
  name: string;
  sold: number;
  percent: number;
};

/** 50 -> "50", 31.25 -> "31.25", 12.5 -> "12.50" */
const formatPercent = (p: number): string => (Number.isInteger(p) ? String(p) : p.toFixed(2));

const CHART_HEIGHT = 170;

const computeMaxScale = (val: number): number => {
  if (val <= 8) return 8;
  if (val <= 20) return Math.ceil(val / 4) * 4;
  if (val <= 50) return Math.ceil((val * 1.1) / 10) * 10;
  if (val <= 100) return Math.ceil((val * 1.05) / 20) * 20;
  return Math.ceil((val * 1.1) / 25) * 25;
};

export default function SalesReportScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [period, setPeriod] = useState<Period>('Daily');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [salesData, setSalesData] = useState<SalesItem[]>([]);
  const [maxScale, setMaxScale] = useState<number>(8);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const setFallback = () => {
    setSalesData([
      { label: 'No Data', value: 0 },
    ]);
    setMaxScale(8);
  };

  const loadReport = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await api.get(
        `${API_ROUTES.SALES_REPORT}?period=${selectedPeriod}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDetails(res.data?.details || []);
      const fetched: SalesItem[] = res.data?.salesData || [];
      if (fetched.length > 0) {
        setSalesData(fetched);
        const highest = Math.max(...fetched.map((i) => Number(i.value || 0)), 0);
        setMaxScale(computeMaxScale(highest));
      } else {
        setFallback();
      }
    } catch (err: any) {
      setFallback();
      setDetails([]);
      showAlert('Error', err.response?.data?.message || 'Could not load the sales report.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever this screen is shown, and when the period changes.
  useFocusEffect(
    useCallback(() => {
      loadReport(period);
    }, [period, loadReport])
  );

  const gridSteps = [
    maxScale,
    Math.round(maxScale * 0.75),
    Math.round(maxScale * 0.5),
    Math.round(maxScale * 0.25),
    0,
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={30} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="menu" size={32} color="#111827" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Sales Report</Text>

        {/* Period Dropdown Filter */}
        <View style={styles.filterWrapper}>
          <Text style={styles.filterLabel}>Select</Text>
          <TouchableOpacity
            style={styles.selectBox}
            activeOpacity={0.8}
            onPress={() => setDropdownOpen(!dropdownOpen)}
          >
            <Text style={styles.selectText}>{period}</Text>
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#ef0000"
            />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {PERIODS.map((item) => {
                const isSelected = item === period;
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setPeriod(item);
                      setDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        isSelected && { color: '#ef0000', fontFamily: 'Poppins_600SemiBold' },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Bar Chart Section */}
        {loading ? (
          <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 60 }} />
        ) : (
          <View style={styles.chartContainer}>
            <View style={styles.plotArea}>
              <View style={styles.gridOverlay}>
                {gridSteps.map((val, idx) => (
                  <View key={idx} style={styles.gridRow}>
                    <Text style={styles.axisLabel} numberOfLines={1}>{val}</Text>
                    <View
                      style={[
                        styles.gridLine,
                        idx === gridSteps.length - 1 && styles.baselineGridLine,
                      ]}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.barsRow}>
                {salesData.map((item, index) => {
                  const ratio = maxScale > 0 ? Number(item.value || 0) / maxScale : 0;
                  const barHeight = Math.min(
                    Math.max(ratio * CHART_HEIGHT, item.value > 0 ? 12 : 0),
                    CHART_HEIGHT
                  );

                  return (
                    <View key={index} style={styles.barColumn}>
                      <View style={[styles.bar, { height: barHeight }]} />
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.xAxisLabelsRow}>
              {salesData.map((item, index) => (
                <View key={index} style={styles.xAxisLabelColumn}>
                  <Text
                    style={styles.barLabel}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Details: every item, its sales and its share of all items sold */}
        {!loading && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Details:</Text>
            <View style={styles.detailsTable}>
              <View style={styles.detailsRow}>
                <View style={[styles.colItem, styles.colLine]}>
                  <Text style={[styles.detailsHeader, styles.centered]}>Items</Text>
                </View>
                <View style={[styles.colNum, styles.colLine]}>
                  <Text style={[styles.detailsHeader, styles.centered]}>Sales</Text>
                </View>
                <View style={styles.colNum}>
                  <Text style={[styles.detailsHeader, styles.centered]}>Percent (%)</Text>
                </View>
              </View>
              {details.length === 0 ? (
                <View style={styles.detailsRow}>
                  <View style={styles.colAll}>
                    <Text style={styles.detailsCell}>No items to show.</Text>
                  </View>
                </View>
              ) : (
                details.map((d) => (
                  <View key={d.name} style={styles.detailsRow}>
                    <View style={[styles.colItem, styles.colLine]}>
                      <Text style={styles.detailsCell} numberOfLines={1}>
                        {d.name}
                      </Text>
                    </View>
                    <View style={[styles.colNum, styles.colLine]}>
                      <Text style={[styles.detailsCell, styles.centered]}>{d.sold > 0 ? d.sold : '--'}</Text>
                    </View>
                    <View style={styles.colNum}>
                      <Text style={[styles.detailsCell, styles.centered]}>
                        {d.sold > 0 ? formatPercent(d.percent) : '--'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 23,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 28,
  },
  filterWrapper: {
    paddingHorizontal: 16,
    marginBottom: 42,
    position: 'relative',
    zIndex: 30,
  },
  filterLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#1f2937',
    marginBottom: 6,
    marginLeft: 6,
  },
  selectBox: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#374151',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 68,
    left: 18,
    right: 18,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownOption: {
    paddingVertical: 10,
  },
  dropdownOptionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#1f2937',
  },
  chartContainer: {
    width: '100%',
    zIndex: 1,
  },
  plotArea: {
    height: CHART_HEIGHT,
    position: 'relative',
    width: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    marginVertical: -8,
  },
  axisLabel: {
    fontFamily: 'Poppins_400Regular',
    width: 30, // room for 4-digit totals (e.g. 1250) without wrapping
    fontSize: 9,
    color: '#1f2937',
    textAlign: 'right',
    paddingRight: 4,
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d6d3c9',
  },
  baselineGridLine: {
    backgroundColor: '#9ca3af',
  },
  barsRow: {
    position: 'absolute',
    left: 32,
    right: 0,
    bottom: 0,
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  bar: {
    width: '100%',
    backgroundColor: '#d92323',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  xAxisLabelsRow: {
    flexDirection: 'row',
    marginLeft: 32,
    marginTop: 6,
    justifyContent: 'space-between',
  },
  xAxisLabelColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  detailsSection: {
    marginTop: 28,
    paddingHorizontal: 4,
  },
  detailsTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#ef0000',
    marginBottom: 8,
  },
  // Lines between every row and between the columns, no outer box (design).
  detailsTable: {
    borderTopWidth: 1,
    borderTopColor: '#F8D3C6',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F8D3C6',
  },
  detailsHeader: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#1f2937',
  },
  detailsCell: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#1f2937',
  },
  centered: {
    textAlign: 'center',
  },
  colItem: {
    flex: 2,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  colNum: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  colAll: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  colLine: {
    borderRightWidth: 1,
    borderRightColor: '#F8D3C6',
  },
  barLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8.5,
    color: '#1f2937',
    textAlign: 'center',
  },
});

// TEST: Details lists every menu item; items with no sales show "--"; 31.25 shows "31.25", 50 shows "50"

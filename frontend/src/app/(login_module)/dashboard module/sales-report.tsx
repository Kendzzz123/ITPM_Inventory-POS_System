import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;
type Period = (typeof PERIODS)[number];

type SalesItem = {
  label: string;
  value: number;
};

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
  const [period, setPeriod] = useState<Period>('Daily');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [salesData, setSalesData] = useState<SalesItem[]>([]);
  const [maxScale, setMaxScale] = useState<number>(8);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/protected/sales-report?period=${selectedPeriod}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fetched: SalesItem[] = res.data?.salesData || [];
      if (fetched.length > 0) {
        setSalesData(fetched);
        const highest = Math.max(...fetched.map((i) => Number(i.value || 0)), 0);
        setMaxScale(computeMaxScale(highest));
      } else {
        setFallback();
      }
    } catch {
      setFallback();
    } finally {
      setLoading(false);
    }
  }, []);

  const setFallback = () => {
    setSalesData([
      { label: 'Whole Juicy Chicken', value: 8 },
      { label: 'Half Juicy chicken', value: 5 },
      { label: 'Spicy Chorizo', value: 1 },
      { label: 'Regular Chorizo', value: 1 },
    ]);
    setMaxScale(8);
  };

  useEffect(() => {
    loadReport(period);
  }, [period, loadReport]);

  const gridSteps = [
    maxScale,
    Math.round(maxScale * 0.75),
    Math.round(maxScale * 0.5),
    Math.round(maxScale * 0.25),
    0,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
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
                        isSelected && { color: '#ef0000', fontWeight: '600' },
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
                    <Text style={styles.axisLabel}>{val}</Text>
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
      </View>
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
    paddingHorizontal: 14,
    paddingTop: 16,
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
    fontWeight: '800',
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
    width: 18,
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
    left: 20,
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
    marginLeft: 20,
    marginTop: 6,
    justifyContent: 'space-between',
  },
  xAxisLabelColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  barLabel: {
    fontSize: 8.5,
    color: '#1f2937',
    textAlign: 'center',
  },
});
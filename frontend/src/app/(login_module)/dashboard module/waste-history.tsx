import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
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

type WasteEntry = {
  id: string;
  date: string;
  item: string;
  quantity: string;
};

const FALLBACK_WASTE: WasteEntry[] = [
  { id: '1', date: '01/10/2026', item: 'Atsara', quantity: '3' },
  { id: '2', date: '01/10/2026', item: 'Whole Juicy Chicken', quantity: '5' },
  { id: '3', date: '01/09/2026', item: 'Liempo', quantity: '1' },
  { id: '4', date: '01/07/2026', item: 'Whole Juicy Chicken', quantity: '7' },
  { id: '5', date: '01/1/2026', item: 'Liempo', quantity: '1' },
  { id: '6', date: '12/29/2025', item: 'Liempo', quantity: '2' },
  { id: '7', date: '01/10/2026', item: 'Atsara', quantity: '3' },
  { id: '8', date: '01/10/2026', item: 'Spicy Chorizo', quantity: '5' },
  { id: '9', date: '01/09/2026', item: 'Regular Chorizo', quantity: '1' },
  { id: '10', date: '01/07/2026', item: 'Atsara', quantity: '7' },
  { id: '11', date: '01/1/2026', item: 'Sarsa (Gravy)', quantity: '1' },
];

export default function WasteHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/waste-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.history && res.data.history.length > 0) {
        setHistory(res.data.history);
      } else {
        setHistory(FALLBACK_WASTE);
      }
    } catch {
      setHistory(FALLBACK_WASTE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
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
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageTitle}>Waste History</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 1.1 }]}>Date</Text>
                <Text style={[styles.thCell, { flex: 1.8 }]}>Item</Text>
                <Text style={[styles.thCell, { flex: 0.9 }]}>Quantity</Text>
              </View>

              {history.map((row, idx) => (
                <View
                  key={row.id || idx}
                  style={[
                    styles.tableRow,
                    idx !== history.length - 1 && styles.tableRowBorder,
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
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
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
    fontWeight: '600',
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
    fontSize: 11,
    color: '#1f2937',
    textAlign: 'center',
  },
});
import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { API_URL } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { showAlert } from '@/utils/alert';


type WasteEntry = {
  id: string;
  date: string;
  item: string;
  quantity: string;
};

export default function WasteHistoryScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [history, setHistory] = useState<WasteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await axios.get(`${API_URL}/protected/waste-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data?.history || []);
    } catch (err: any) {
      setHistory([]);
      showAlert('Error', err.response?.data?.message || 'Could not load waste history.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

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

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 1.1 }]}>Date</Text>
                <Text style={[styles.thCell, { flex: 1.8 }]}>Item</Text>
                <Text style={[styles.thCell, { flex: 0.9 }]}>Quantity</Text>
              </View>

              {history.length === 0 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>
                    No waste recorded yet.
                  </Text>
                </View>
              )}

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
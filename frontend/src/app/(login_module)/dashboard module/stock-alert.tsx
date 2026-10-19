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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

export default function StockAlertScreen() {
  const router = useRouter();
  const [hasLowStock, setHasLowStock] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkStockStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/stocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasLowStock(Boolean(res.data?.hasLowStock));
    } catch {
      setHasLowStock(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStockStatus();
  }, [checkStockStatus]);

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

        <View style={styles.content}>
          <Text style={styles.pageTitle}>Stock Alert</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : hasLowStock ? (
            /* Low Stock State matching image_da5fa0.png */
            <TouchableOpacity
              style={styles.stateWrapper}
              activeOpacity={0.9}
              onPress={() => setHasLowStock(false)}
            >
              <Feather name="alert-triangle" size={165} color="#ef0000" />
              <Text style={styles.statusHeading}>Low Stock!</Text>
              <Text style={styles.statusSubtext}>You need to restock ingredients!</Text>
            </TouchableOpacity>
          ) : (
            /* All Set State matching image_da5f64.png */
            <TouchableOpacity
              style={styles.stateWrapper}
              activeOpacity={0.9}
              onPress={() => setHasLowStock(true)}
            >
              <View style={styles.greenCircle}>
                <Feather name="check" size={85} color="#3f7d00" />
              </View>
              <Text style={styles.statusHeading}>All set!</Text>
              <Text style={styles.statusSubtext}>No need to restock yet.</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 95,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 36,
  },
  stateWrapper: {
    alignItems: 'center',
  },
  greenCircle: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 12,
    borderColor: '#3f7d00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusHeading: {
    fontSize: 24,
    fontWeight: '400',
    color: '#111827',
    marginTop: 22,
    marginBottom: 12,
  },
  statusSubtext: {
    fontSize: 12.5,
    color: '#1f2937',
    textAlign: 'center',
  },
});
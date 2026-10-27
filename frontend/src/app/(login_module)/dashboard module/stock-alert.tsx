// stock-alert.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import {
  getToken,
  getDarkMode,
  setGlobalDarkMode,
  getUserRole,
  setGlobalUserRole,
  subscribeAppTheme,
} from '../Role';
import RoleSideDrawer from '../RoleSideDrawer';

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

export default function StockAlertScreen() {
  const router = useRouter();
  const [hasLowStock, setHasLowStock] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [darkMode, setDarkMode] = useState<boolean>(getDarkMode());

  const isCashierDark = role === 'cashier' && darkMode;
  const textColor = { color: isCashierDark ? '#FFFFFF' : '#111827' };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setDarkMode(getDarkMode());
      setRole(getUserRole());
    });
  }, []);

  const checkStockStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [accRes, res] = await Promise.all([
        axios
          .get(`${API_URL}/protected/account`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => null),
        axios.get(`${API_URL}/protected/stocks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (accRes?.data?.account?.role) {
        const fetchedRole =
          accRes.data.account.role.toLowerCase() === 'manager' ? 'manager' : 'cashier';
        setRole(fetchedRole);
        setGlobalUserRole(fetchedRole);
      }

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
    <SafeAreaView
      style={[styles.safeArea, isCashierDark && { backgroundColor: '#181920' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isCashierDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name="chevron-back"
              size={30}
              color={isCashierDark ? '#FFFFFF' : '#111827'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu" size={32} color={isCashierDark ? '#FFFFFF' : '#111827'} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.pageTitle, textColor]}>Stock Alert</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#e60000" style={{ marginTop: 40 }} />
          ) : hasLowStock ? (
            <TouchableOpacity
              style={styles.stateWrapper}
              activeOpacity={0.9}
              onPress={() => setHasLowStock(false)}
            >
              <Feather name="alert-triangle" size={165} color="#ef0000" />
              <Text style={[styles.statusHeading, textColor]}>Low Stock!</Text>
              <Text style={[styles.statusSubtext, textColor]}>
                You need to restock ingredients!
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stateWrapper}
              activeOpacity={0.9}
              onPress={() => setHasLowStock(true)}
            >
              <View style={styles.greenCircle}>
                <Feather name="check" size={85} color="#3f7d00" />
              </View>
              <Text style={[styles.statusHeading, textColor]}>All set!</Text>
              <Text style={[styles.statusSubtext, textColor]}>No need to restock yet.</Text>
            </TouchableOpacity>
          )}
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
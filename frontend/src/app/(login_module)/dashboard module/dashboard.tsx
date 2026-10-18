import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken, clearToken } from '../Role';

const YOUR_PC_IP = '192.168.1.23'; // Double-check with 'ipconfig' if your IP changed
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

type Me = {
  id: number;
  username: string;
  role: 'manager' | 'cashier' | 'Manager' | 'Cashier';
};

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      // Backend route in server.js
      const res = await axios.get(`${API_URL}/protected/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend sends { message: '...', user: req.user }
      setMe(res.data.user);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      setError(err.response?.data?.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    await clearToken();
    router.replace('/');
  };

  // Navigates directly to TransactionHistory.tsx
  const handleNavigateToTransactions = () => {
    router.push('/TransactionHistory');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e60000" />
      </View>
    );
  }

  if (error || !me) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Something went wrong.'}</Text>
        <Pressable style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const isManager = me.role?.toLowerCase() === 'manager';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hello, {me.username}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{isManager ? 'Manager' : 'Cashier'}</Text>
          </View>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      {/* Role-based content */}
      <View style={styles.contentSection}>
        {isManager ? (
          <Text style={styles.body}>Manager tools: inventory, reports, staff.</Text>
        ) : (
          <Text style={styles.body}>Cashier tools: new order, payments.</Text>
        )}
      </View>

      {/* Transaction History Navigation Button */}
      <View style={styles.actionsContainer}>
        <Pressable 
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.navButtonPressed,
          ]} 
          onPress={handleNavigateToTransactions}
        >
          <Text style={styles.navButtonText}>📊 Transaction History</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 24, paddingTop: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  hello: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: '#111827' },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fde8e8' },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#e60000' },
  logout: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#e60000' },
  contentSection: { marginBottom: 24 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#374151' },
  actionsContainer: { marginTop: 12 },
  navButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e60000',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navButtonPressed: {
    backgroundColor: '#fde8e8',
  },
  navButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#e60000',
  },
  error: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#b91c1c', textAlign: 'center', marginBottom: 12 },
  button: { backgroundColor: '#e60000', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  buttonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff' },
});
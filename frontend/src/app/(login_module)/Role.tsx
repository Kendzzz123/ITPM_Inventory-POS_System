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
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// ---- API config (same pattern as your login screen) ----
const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

// ---- Token helpers: call saveToken() in your login screen after a successful login ----
const TOKEN_KEY = 'auth_token';

export async function saveToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

type Profile = {
  id: number;
  username: string;
  role: 'manager' | 'cashier';
};

export default function RoleScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }

      // Uses your existing protected route: GET /protected/profile
      const response = await axios.get(`${API_URL}/protected/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(response.data.user);
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
    loadProfile();
  }, [loadProfile]);

  const handleLogout = async () => {
    await clearToken();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e60000" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const roleLabel = profile?.role === 'manager' ? 'Manager' : 'Cashier';

  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.username}>{profile?.username}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#6b7280',
  },
  username: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: '#111827',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 16,
    marginBottom: 28,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#fde8e8',
  },
  roleText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#e60000',
  },
  button: {
    backgroundColor: '#e60000',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#ffffff',
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 12,
  },
});

// Add inside your Role.ts file (alongside getToken and clearToken)
let globalDarkMode = false;
let globalUserRole: 'cashier' | 'manager' = 'cashier';
const listeners = new Set<() => void>();

export const getDarkMode = () => globalDarkMode;
export const setGlobalDarkMode = (val: boolean) => {
  globalDarkMode = val;
  listeners.forEach((fn) => fn());
};

export const getUserRole = () => globalUserRole;
export const setGlobalUserRole = (role: 'cashier' | 'manager') => {
  globalUserRole = role;
  listeners.forEach((fn) => fn());
};

export const subscribeAppTheme = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);return () => {
    listeners.delete(fn); // Curly braces ensure it returns void!
  };
};
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
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

type AccountData = {
  id: number;
  name: string;
  phone: string;
  email: string;
  formattedDate: string;
  slashDate: string;
  role: string;
};

export default function AccountInfoScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountData>({
    id: 1,
    name: 'Mike Reyes',
    phone: '09123456789',
    email: 'reyesmike@gmail.com',
    formattedDate: 'March 4, 2022',
    slashDate: '03/04/2022',
    role: 'manager',
  });
  const [loading, setLoading] = useState(true);

  const loadAccount = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.account) {
        const acc = res.data.account;
        setAccount({
          id: acc.id || 1,
          name: acc.name || 'Mike Reyes',
          phone: acc.phone || '09123456789',
          email: acc.email || 'reyesmike@gmail.com',
          formattedDate: acc.formattedDate || 'March 4, 2022',
          slashDate: acc.slashDate || '03/04/2022',
          role: acc.role || 'manager',
        });
      }
    } catch {
      // Keep default fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Account Information</Text>

          {/* Large Yellow Avatar */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={78} color="#9e7b08" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#ef0000" style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.infoList}>
              {/* Name */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Ionicons name="person-outline" size={42} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{account.name}</Text>
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Feather name="phone-call" size={36} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{account.phone}</Text>
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <Ionicons name="mail" size={40} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{account.email}</Text>
                </View>
              </View>

              {/* Employment Date */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={42} color="#111827" />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.infoLabel}>Employment Date</Text>
                  <Text style={styles.infoValue}>{account.formattedDate}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Staff Management Card */}
          <TouchableOpacity
            style={styles.staffCard}
            onPress={() => router.push('/dashboard module/staff-management' as any)}
          >
            <Ionicons name="person-outline" size={28} color="#9e7b08" />
            <Text style={styles.staffCardText}>Staff Management</Text>
            <Ionicons name="chevron-forward" size={22} color="#ef0000" />
          </TouchableOpacity>

          {/* Bottom Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.editAccountBtn}
              onPress={() =>
                router.push({
                  pathname: '/dashboard module/edit-staff' as any,
                  params: {
                    id: String(account.id),
                    name: account.name,
                    phone: account.phone,
                    email: account.email,
                    date: account.slashDate,
                  },
                })
              }
            >
              <Text style={styles.editAccountBtnText}>Edit Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editPasswordBtn}
              onPress={() => router.push('/forgotpassword' as any)}
            >
              <Text style={styles.editPasswordBtnText}>Edit Password</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  container: {
    width: '100%',
    maxWidth: 440,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#fbcb04',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  infoList: {
    paddingHorizontal: 12,
    gap: 22,
    marginBottom: 26,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCol: {
    width: 56,
    alignItems: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    color: '#374151',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf9ea',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  staffCardText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#1f2937',
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 12,
  },
  editAccountBtn: {
    width: 210,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef0000',
    backgroundColor: '#fffdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAccountBtnText: {
    color: '#ef0000',
    fontSize: 12.5,
    fontWeight: '800',
  },
  editPasswordBtn: {
    width: 210,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ef0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPasswordBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
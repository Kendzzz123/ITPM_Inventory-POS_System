// cashier-account.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { api, API_ROUTES } from '@/config/apiConfig';
import { showAlert } from '@/utils/alert';
import { getToken, clearToken } from '@/services/authService';
import RoleSideDrawer from '@/components/RoleSideDrawer';


const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

export default function CashierAccountScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  const [account, setAccount] = useState({
    name: '',
    phone: '',
    email: '',
    formattedDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  const iconColor = COLORS.nearBlack;
  const textColor = { color: iconColor };

  const loadProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get(API_ROUTES.ACCOUNT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.account) {
        const acc = res.data.account;
        setAccount({
          name: acc.name ?? '',
          phone: acc.phone ?? '',
          email: acc.email ?? '',
          formattedDate: acc.formattedDate ?? '',
        });
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        await clearToken();
        router.replace('/');
        return;
      }
      showAlert('Error', err.response?.data?.message || 'Could not load account information.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload whenever the screen comes back into focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={30} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color={iconColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.pageTitle, textColor]}>Account Information</Text>

          {/* Yellow Avatar Circle */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={78} color="#9e7b08" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.red} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.infoList}>
              {/* Name */}
              <View style={[styles.infoRow, ]}>
                <View style={styles.iconCol}>
                  <Ionicons name="person-outline" size={44} color={iconColor} />
                </View>
                <View style={styles.textCol}>
                  <Text style={[styles.infoLabel, textColor]}>Name</Text>
                  <Text style={[styles.infoValue, textColor]}>{account.name}</Text>
                </View>
              </View>

              {/* Contact Number */}
              <View style={[styles.infoRow ]}>
                <View style={styles.iconCol}>
                  <Feather name="phone-call" size={38} color={iconColor} />
                </View>
                <View style={styles.textCol}>
                  <Text style={[styles.infoLabel, textColor]}>Contact Number</Text>
                  <Text style={[styles.infoValue, textColor]}>{account.phone}</Text>
                  
                </View>
                
              </View>
                <View style={[styles.infoRow]}>
                <View style={styles.iconCol}>
                  <Ionicons name="mail" size={40} color={COLORS.nearBlack} />
                </View>
                <View style={styles.textCol}>
                  <Text style={[styles.infoLabel, textColor]}>Email</Text>
                  <Text style={[styles.infoValue, textColor]}>{account.email}</Text>
                  
                </View>
                
              </View>
              {/* Employment Date */}
              <View style={styles.infoRow}>
                <View style={styles.iconCol}>
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={44}
                    color={iconColor}
                  />
                </View>
                <View style={styles.textCol}>
                  <Text style={[styles.infoLabel, textColor]}>Employment Date</Text>
                  <Text style={[styles.infoValue, textColor]}>{account.formattedDate}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Bottom Edit Password Button */}
          <View style={styles.bottomBtnWrapper}>
            <TouchableOpacity
              style={styles.editPasswordBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/edit-password' as Href)}
            >
              <Text style={styles.editPasswordBtnText}>Edit Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role="cashier"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 14,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginBottom: 22,
  },
  avatarCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: COLORS.yellow,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 34,
  },
  infoList: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: COLORS.nearBlack,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12.5,
    color: COLORS.nearBlack,
  },
  bottomBtnWrapper: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 24,
  },
  editPasswordBtn: {
    width: 220,
    height: 44,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPasswordBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 12.5,
  },
});
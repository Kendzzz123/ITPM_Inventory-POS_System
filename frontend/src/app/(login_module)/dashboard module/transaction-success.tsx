import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Foundation } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

export default function TransactionSuccessScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.replace('/dashboard module/pos' as any)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={30} color={COLORS.nearBlack} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/dashboard module/cashier-dashboard' as any)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu" size={32} color={COLORS.nearBlack} />
          </TouchableOpacity>
        </View>

        {/* Center Status Content */}
        <View style={styles.centerContent}>
          <Foundation name="like" size={210} color={COLORS.yellow} />
          <Text style={styles.successTitle}>Transaction success!</Text>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.newTxBtn}
            onPress={() => router.replace('/dashboard module/pos' as any)}
          >
            <Text style={styles.newTxBtnText}>New Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/dashboard module/cashier-dashboard' as any)}
          >
            <Text style={styles.homeBtnText}>Back to Homepage</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 60,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
  },
  centerContent: {
    alignItems: 'center',
    marginTop: -20,
  },
  successTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: COLORS.nearBlack,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 14,
  },
  newTxBtn: {
    width: 230,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTxBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: COLORS.red,
  },
  homeBtn: {
    width: 230,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: COLORS.white,
  },
});
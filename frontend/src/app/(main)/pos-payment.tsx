import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_700Bold,
  Poppins_700Bold_Italic,
} from '@expo-google-fonts/poppins';
import { showAlert } from '@/utils/alert';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';
import { getUserRole, subscribeAppTheme, markSaleCompleted } from '@/store/appState';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { newRequestId } from '@/constants/app';


const COLORS = {
  yellow: '#FFC400',
  red: '#EC0000',
  cream: '#FFFDF5',
  white: '#FFFFFF',
  nearBlack: '#0F1015',
};

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export default function PosPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ total?: string; itemsJson?: string }>();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
  });

  // Role & Side Drawer State
  const [role, setRole] = useState<'cashier' | 'manager'>(getUserRole());
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const iconColor = COLORS.nearBlack;
  const textColor = { color: iconColor };

  useEffect(() => {
    return subscribeAppTheme(() => {
      setRole(getUserRole());
    });
  }, []);

  const orderTotal = Number(params.total || 0);
  // One id per checkout: if the request is retried (double tap / slow network)
  // the backend returns the same order instead of charging twice.
  const requestIdRef = useRef<string>(newRequestId());
  const [cashInput, setCashInput] = useState<string>('');
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleDigitPress = (digit: string) => {
    setCashInput((prev) => {
      if (digit === '.' && prev.includes('.')) return prev;
      if (prev === '0' && digit !== '.') return digit;
      if (prev.length >= 8) return prev;
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setCashInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  /** Parses the cart passed from the POS screen. */
  const getItems = (): { item_id: number; qty: number }[] => {
    try {
      return params.itemsJson ? JSON.parse(params.itemsJson) : [];
    } catch {
      return [];
    }
  };

  // "Enter" only PREVIEWS the change. Nothing is saved yet — the sale is
  // recorded when the cashier taps Exit (handleConfirmPaid).
  const handleEnterPayment = () => {
    const numericCash = Number(cashInput.replace(/,/g, ''));
    if (getItems().length === 0 || orderTotal <= 0) {
      showAlert('Empty Order', 'Please add items to the order first.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    if (!numericCash || numericCash < orderTotal) {
      showAlert(
        'Underpayment',
        `Cash received (₱${numericCash.toLocaleString()}) must be at least ₱${orderTotal.toLocaleString()}.`
      );
      return;
    }
    setChangeAmount(numericCash - orderTotal);
    setIsEntered(true);
  };

  // Exit: records the sale, then goes straight to the success screen (no pop-up).
  const handleConfirmPaid = async () => {
    if (submitting) return; // a second tap while saving does nothing
    const numericCash = Number(cashInput.replace(/,/g, ''));
    const parsedItems = getItems();
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/');
        return;
      }
      await api.post(
        API_ROUTES.ORDERS,
        {
          items: parsedItems,
          amountReceived: numericCash,
          clientRequestId: requestIdRef.current,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      markSaleCompleted(); // the POS clears its cart when shown again
      router.replace('/transaction-success' as any);
    } catch (err: any) {
      // The sale was NOT saved — never show a fake success.
      showAlert(
        'Payment Failed',
        err.response?.data?.message || 'Could not reach the server. The order was not saved.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formattedCashInput = () => {
    const num = Number(cashInput);
    if (isNaN(num)) return cashInput;
    return num.toLocaleString();
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              // With the change showing, back returns to the keypad to fix the amount.
              onPress={() => (isEntered ? setIsEntered(false) : router.back())}
              disabled={submitting}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={isEntered ? 'Edit amount' : 'Go back'}
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

          {/* Summary Table Card (Total / Cash / Change) */}
          <View style={styles.summaryCard}>
            <View style={styles.yellowTopStrip} />

            <View
              style={[
                styles.summaryRow,
                styles.rowBorder,
              ]}
            >
              <Text style={[styles.summaryLabel, textColor]}>Total</Text>
              <Text style={[styles.summaryValue, textColor]}>{orderTotal.toLocaleString()}</Text>
            </View>

            <View
              style={[
                styles.summaryRow,
                styles.rowBorder,
              ]}
            >
              <Text style={[styles.summaryLabel, textColor]}>Cash</Text>
              <Text style={[styles.summaryValue, textColor]}>
                {isEntered ? Number(cashInput).toLocaleString() : '--'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, textColor]}>Change</Text>
              <Text style={[styles.summaryValue, textColor]}>
                {isEntered ? changeAmount.toLocaleString() : '--'}
              </Text>
            </View>

            <View
              style={styles.grayBottomStrip}
            />
          </View>

          {!isEntered ? (
            /* State 1: Keypad Entry matching image_abc194.png */
            <>
              <View
                style={styles.inputDisplayBox}
              >
                <Text style={[styles.inputValueText, textColor]}>{formattedCashInput()}</Text>
                <TouchableOpacity
                  onPress={handleBackspace}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="delete" size={22} color={COLORS.red} />
                </TouchableOpacity>
              </View>

              <View style={styles.keypadContainer}>
                {KEYPAD_ROWS.map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={styles.keyButton}
                        activeOpacity={0.7}
                        onPress={() => handleDigitPress(num)}
                      >
                        <Text style={[styles.keyText, textColor]}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

                {/* Bottom Row: Decimal, 0, Enter */}
                <View style={styles.keypadRow}>
                  <TouchableOpacity
                    style={styles.keyButton}
                    activeOpacity={0.7}
                    onPress={() => handleDigitPress('.')}
                  >
                    <View
                      style={styles.dotCircle}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.keyButton}
                    activeOpacity={0.7}
                    onPress={() => handleDigitPress('0')}
                  >
                    <Text style={[styles.keyText, textColor]}>0</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.enterKeyButton}
                    activeOpacity={0.85}
                    onPress={handleEnterPayment}
                  >
                    <Text style={styles.enterKeyText}>Enter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            /* State 2: Change shown. Exit saves the sale and opens Transaction Success. */
            <View style={styles.exitRow}>
              <TouchableOpacity
                style={styles.exitBtn}
                activeOpacity={0.85}
                onPress={handleConfirmPaid}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.exitBtnText}>Exit</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Role-Aware Side Menu Drawer */}
      <RoleSideDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        role={role}
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
    paddingHorizontal: 18,
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
    marginBottom: 38,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 30,
  },
  yellowTopStrip: {
    height: 14,
    backgroundColor: '#F4C414',
  },
  grayBottomStrip: {
    height: 14,
    backgroundColor: '#EAE6DF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 36,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontFamily: 'Poppins_400Regular_Italic',
    fontSize: 13,
    color: COLORS.nearBlack,
    width: 90,
    textAlign: 'center',
  },
  summaryValue: {
    fontFamily: 'Poppins_700Bold_Italic',
    fontSize: 20,
    color: COLORS.nearBlack,
    width: 110,
    textAlign: 'center',
  },
  inputDisplayBox: {
    height: 58,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.3,
    borderColor: COLORS.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    gap: 18,
    marginBottom: 24,
  },
  inputValueText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: COLORS.nearBlack,
  },
  keypadContainer: {
    width: '100%',
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: COLORS.nearBlack,
  },
  dotCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.nearBlack,
  },
  enterKeyButton: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enterKeyText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: COLORS.white,
  },
  // Right-aligned under the card, like the design.
  exitRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 26,
    paddingRight: 6,
  },
  exitBtn: {
    width: 146,
    height: 36,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    fontSize: 12,
  },
});

// TEST: enter 2000 for a 1780 total -> Enter shows change 220 -> Exit saves the order (201) and opens Transaction Success, no pop-up
// TEST: double-tapping Exit records one order; back arrow after Enter returns to the keypad with the amount kept

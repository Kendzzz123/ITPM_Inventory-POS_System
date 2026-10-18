import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable, 
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

// Replace YOUR_PC_IP with your computer's local Wi-Fi IPv4 address
const YOUR_PC_IP = '192.168.1.23';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

export default function EmailVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const emailDisplay = params.email || '';

  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [timer, setTimer] = useState<number>(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  const inputsRef = useRef<Array<TextInput | null>>([]);

  // Countdown timer for code resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChangeText = (text: string, index: number) => {
    const sanitized = text.replace(/[^0-9]/g, '');

    // Handle paste of complete or multi-digit OTP
    if (sanitized.length > 1) {
      const updatedCode = [...code];
      const pastedChars = sanitized.slice(0, CODE_LENGTH).split('');
      pastedChars.forEach((char, i) => {
        updatedCode[i] = char;
      });
      setCode(updatedCode);

      const targetIndex = Math.min(pastedChars.length, CODE_LENGTH - 1);
      inputsRef.current[targetIndex]?.focus();

      if (pastedChars.length === CODE_LENGTH) {
        verifyCode(updatedCode.join(''));
      }
      return;
    }

    const updatedCode = [...code];
    updatedCode[index] = sanitized;
    setCode(updatedCode);

    // Auto-advance cursor
    if (sanitized && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when last box is filled
    if (sanitized && index === CODE_LENGTH - 1) {
      const full = updatedCode.join('');
      if (full.length === CODE_LENGTH) {
        verifyCode(full);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (verificationCode?: string) => {
    const fullCode = verificationCode || code.join('');
    if (fullCode.length !== CODE_LENGTH || isVerifying) return;

    if (!emailDisplay) {
      Alert.alert('Error', 'Missing email address. Please start from the beginning.');
      router.replace('/forgotpassword');
      return;
    }

    Keyboard.dismiss();
    setIsVerifying(true);

    try {
      await axios.post(`${API_URL}/auth/verify-otp`, {
        email: emailDisplay,
        otp: fullCode,
      });

      // Navigate to new password screen with email and verified code
      router.push({
        pathname: '/newpassword',
        params: { email: emailDisplay, otp: fullCode },
      });
    } catch (error: any) {
      console.error('Verify OTP Error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Invalid or expired code';
      Alert.alert('Verification Failed', message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending || !emailDisplay) return;

    setIsResending(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, {
        email: emailDisplay,
      });

      Alert.alert('Sent', 'A new 6-digit code has been sent to your email.');
      setTimer(RESEND_COOLDOWN);
      setCanResend(false);
      setCode(new Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDFBF4" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.card}>
            {/* Header Back Button */}
            <MaterialIcons 
              style={styles.usogkaonti} 
              name="chevron-left" 
              size={50} 
              color="#111827"
              onPress={() => router.replace('/forgotpassword')} 
            />

            <View style={styles.screenContent}>
              <View style={styles.topSection}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="mail" size={32} color="#EA0000" />
                </View>

                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit confirmation code to 
                  <Text style={styles.emailText}> {emailDisplay || 'your email'}</Text>
                </Text>

                {/* OTP Cells */}
                <View style={styles.codeRow}>
                  {code.map((digit, index) => {
                    const isCurrent = focusedIndex === index;
                    return (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          inputsRef.current[index] = ref;
                        }}
                        value={digit}
                        onChangeText={(val) => handleChangeText(val, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoComplete="one-time-code"
                        maxLength={1}
                        selectTextOnFocus
                        caretHidden
                        editable={!isVerifying}
                        style={[
                          styles.codeInput,
                          isCurrent && styles.codeInputFocused,
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Resend Cooldown */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
                  <Pressable onPress={handleResend} disabled={!canResend || isResending}>
                    <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                      {canResend ? 'Resend' : `Resend in ${timer}s`}
                    </Text>
                  </Pressable>
                </View>

                {/* Verify Button */}
                <Pressable 
                  style={({ pressed }) => [
                    styles.SendCodeButton,
                    pressed && styles.SendCodeButtonPressed
                  ]}
                  onPress={() => verifyCode()}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.SendCode}>Verify code</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 820,
    maxWidth: 420,
    backgroundColor: '#fffcef',
  },
  usogkaonti: {
    paddingLeft: 15,
  },
  safeArea: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  emailText: {
    color: '#111827',
    fontWeight: '700',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingBottom: 10,
  },
  codeInput: {
    flex: 1,
    maxWidth: 48,
    height: 56,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFC72C',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  codeInputFocused: {
    borderColor: '#e60000',
    transform: [{ scale: 1.04 }],
  },
  SendCodeButton: {
    width: 210,
    height: 48,
    backgroundColor: '#e60000',
    borderRadius: 15.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  SendCodeButtonPressed: {
    opacity: 0.85,
  },
  SendCode: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#6B7280',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA0000',
  },
  resendTextDisabled: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
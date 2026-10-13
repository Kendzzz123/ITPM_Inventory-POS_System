import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable, 
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function EmailVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const emailDisplay = params.email || 'juandelacruz@gmail.com';

  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [timer, setTimer] = useState<number>(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

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

    Keyboard.dismiss();
    setIsVerifying(true);

    try {
      setTimeout(() => {
        setIsVerifying(false);
        router.push('/newpassword');
      }, 800);
    } catch {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setTimer(RESEND_COOLDOWN);
    setCanResend(false);
    setCode(new Array(CODE_LENGTH).fill(''));
    inputsRef.current[0]?.focus();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/forgotpassword');
    }
  };

  const isComplete = code.join('').length === CODE_LENGTH;

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
          {/* Native Mobile App Header */}
          <MaterialIcons style={styles.usogkaonti} name="chevron-left" size={50} color="#111827"
              onPress={() => navigation.navigate('forgotpassword')} />
          {/* Main Mobile Screen Flow */}
          <View style={styles.screenContent}>
            
            {/* Top Anchor: Icon & Instruction */}
            <View style={styles.topSection}>
              
              <View style={styles.iconCircle}>
                
                <MaterialIcons name="mail" size={38} color="#EA0000" />
              </View>

              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit confirmation code to 
                <Text style={styles.emailText}> {emailDisplay}</Text>
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
                      style={[
                        styles.codeInput,
                        isCurrent && styles.codeInputFocused,
                        digit ? styles.codeInputFilled : null,
                      ]}
                    />
                  );
                })}
                
              </View>
              <Pressable 
                            style={({ pressed }) => [
                              styles.SendCodeButton,
                              pressed && styles.SendCodeButtonPressed
                            ]}
                             onPress={() => router.replace('/newpassword')}
                          >
                            <Text style={styles.SendCode}
                           >Verify code</Text>
                          </Pressable>
            </View>

            {/* Bottom Section: Primary Action & Cooldown pinned to thumb reach */}
                            
                  
                
                
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
    minHeight:820,
    maxWidth: 420,
    backgroundColor: '#fffdf5', // Soft warm cream background
  },
  usogkaonti: {
    paddingLeft: 5
  },
  safeArea: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  appHeader: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 38,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'black',
    
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 9,
    
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  codeInputFocused: {
    borderColor: '#FFC72C',
    backgroundColor: '#FFFDF9',
    transform: [{ scale: 1.04 }],
  },
  codeInputFilled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  bottomSection: {
    width: '100%',
    paddingTop: 12,
  },
  SendCodeButton: {
    width: 210,
    height: 40,
    backgroundColor: '#e60000', // Vibrant red button
    borderRadius: 15.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
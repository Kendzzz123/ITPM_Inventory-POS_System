import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const CODE_LENGTH = 6;

export default function EmailVerificationScreen() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const handleChangeText = (text: string, index: number) => {
    const sanitized = text.replace(/[^0-9]/g, '');

    // Handle pasted multi-digit string
    if (sanitized.length > 1) {
      const updatedCode = [...code];
      const pastedChars = sanitized.slice(0, CODE_LENGTH).split('');
      pastedChars.forEach((char, i) => {
        updatedCode[i] = char;
      });
      setCode(updatedCode);
      const nextIndex = Math.min(pastedChars.length, CODE_LENGTH - 1);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    const updatedCode = [...code];
    updatedCode[index] = sanitized;
    setCode(updatedCode);

    // Auto-advance to next input box
    if (sanitized && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Jump back on backspace if current box is blank
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/forgotpassword');
    }
  };

  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length === CODE_LENGTH) {
      // Navigate to your next screen (e.g., reset password or home)
      router.replace('/'); 
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={38} color="#000000" />
        </TouchableOpacity>

        {/* Content Container */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="mail" size={48} color="#EA0000" />
          </View>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a code to <Text style={styles.emailText}>juandelacruz@gmail.com</Text>.
          </Text>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>6-digit Code</Text>

            <View style={styles.codeRow}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputsRef.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(val) => handleChangeText(val, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={styles.codeInput}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                code.join('').length < CODE_LENGTH && styles.verifyButtonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleVerify}
            >
              <Text style={styles.verifyButtonText}onPress={() => navigation.navigate('newpassword')}>Verify code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFBF4',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  content: {
    alignItems: 'center',
    marginTop: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: '#E2E2E2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#101010',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  emailText: {
    color: '#101010',
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 28,
  },
  codeInput: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#FFC72C',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  verifyButton: {
    backgroundColor: '#EA0000',
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
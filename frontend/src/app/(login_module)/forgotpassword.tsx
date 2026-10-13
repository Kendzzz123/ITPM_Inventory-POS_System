import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard 
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Path } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

<MaterialCommunityIcons name="key-variant" size={50} color="black" />
export default function LoginScreen() {
    const router = useRouter();
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Pressable onPress={() => router.replace('/')}>
  <MaterialIcons name="chevron-left" size={50} color="black" />
</Pressable>
            <View style={styles.new}>
            <View style={styles.circleContainer}>
            <MaterialCommunityIcons
                name="key-variant"
                size={32}
                color="#ec0000"
                style={styles.verticalKey}
            />
            </View>
                </View>
            {/* Bottom Form Section */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>Enter your email and we’ll send you a 6-digit code.</Text>

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="joy@gmail.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Red Log In Button */}
              <Pressable 
                style={({ pressed }) => [
                  styles.SendCodeButton,
                  pressed && styles.SendCodeButtonPressed
                ]}
                 onPress={() => router.push('/OTP')}
              >
                <Text style={styles.SendCode}
               >Send code</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    new: {
        justifyContent: 'center',
    alignItems: 'center',
    },
    circleContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalKey: {
    transform: [{ rotate: '45deg' }], // Makes the key point vertically
  },
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb', // subtle backdrop for desktop/web viewing
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    minHeight:820,
    maxWidth: 420,
    backgroundColor: '#fffdf5', // Soft warm cream background
  },
  banner: {
    backgroundColor: '#f6b800', // Yellow banner
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logo: {
    width: 260,
    height: 120,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#1a1a1a',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 36,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    paddingTop: 30,
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    textAlign: 'center',
    color: '#262626',
    marginTop: 4,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f6b800', // Yellow border matching the mockup
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#111827',
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 24,
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#e11d48', // Coral red link
    textDecorationLine: 'underline',
  },
  SendCodeButton: {
    height: 48,
    backgroundColor: '#e60000', // Vibrant red button
    borderRadius: 12,
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
});
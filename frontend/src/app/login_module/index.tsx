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

export default function LoginScreen() {
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
            
            {/* Top Yellow Banner */}
            <View style={styles.banner}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.bannerSubtitle}>Inventory system and POS</Text>
            </View>

            {/* Bottom Form Section */}
            <View style={styles.formContainer}>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.subtitle}>Please log in your account.</Text>

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
              </View>

              {/* Forgot Password */}
              <Pressable style={styles.forgotContainer}>
                <Text style={styles.forgotText}>Forgot Password</Text>
              </Pressable>

              {/* Red Log In Button */}
              <Pressable 
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.loginButtonPressed
                ]}
              >
                <Text style={styles.loginButtonText}>Log in</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 13,
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
    fontSize: 14,
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
  loginButton: {
    height: 48,
    backgroundColor: '#e60000', // Vibrant red button
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 16,
  },
});
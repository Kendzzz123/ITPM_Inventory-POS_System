import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { getToken } from '../Role';

const YOUR_PC_IP = '192.168.1.40';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

export default function CreateStaffScreen() {
  const router = useRouter();

  const [name, setName] = useState('Phoebe Bridgers');
  const [phone, setPhone] = useState('09123456789');
  const [email, setEmail] = useState('phoebebridgers@gmail.com');
  const [password, setPassword] = useState('Mr.liempo123');
  const [employmentDate, setEmploymentDate] = useState('10/05/2026');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter a name and password.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/protected/staff`,
        {
          name,
          phone,
          email,
          password,
          employmentDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Staff member created!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create staff.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
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

          <Text style={styles.pageTitle}>Create Staff</Text>

          {/* Yellow Avatar */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={76} color="#9e7b08" />
          </View>

          {/* Form Fields */}
          <View style={styles.formList}>
            {/* Name */}
            <View style={styles.formRow}>
              <View style={styles.iconCol}>
                <Ionicons name="person-outline" size={42} color="#111827" />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Contact Number */}
            <View style={styles.formRow}>
              <View style={styles.iconCol}>
                <Feather name="phone-call" size={36} color="#111827" />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Contact Number</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="09123456789"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.formRow}>
              <View style={styles.iconCol}>
                <Ionicons name="mail" size={40} color="#111827" />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="email@gmail.com"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Email Password */}
            <View style={styles.formRow}>
              <View style={styles.iconCol}>
                <MaterialCommunityIcons name="lock-open" size={42} color="#111827" />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Email Password</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Employment Date */}
            <View style={styles.formRow}>
              <View style={styles.iconCol}>
                <MaterialCommunityIcons name="calendar-month-outline" size={42} color="#111827" />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Employment Date</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={employmentDate}
                    onChangeText={setEmploymentDate}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#9ca3af"
                  />
                  <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#6b7280" />
                </View>
              </View>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Create</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 18,
  },
  avatarCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: '#fbcb04',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  formList: {
    gap: 16,
    marginBottom: 28,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  iconCol: {
    width: 52,
    alignItems: 'center',
    marginRight: 10,
  },
  inputCol: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#1f2937',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputBox: {
    height: 36,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffd000',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 10.5,
    color: '#6b7280',
    paddingVertical: 0,
  },
  submitBtn: {
    alignSelf: 'center',
    width: 210,
    height: 44,
    backgroundColor: '#ef0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
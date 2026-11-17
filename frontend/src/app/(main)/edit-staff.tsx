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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RoleSideDrawer from '@/components/RoleSideDrawer';
import { showAlert } from '@/utils/alert';
import { nameError, phoneError, emailError } from '@/utils/validation';
import { api, API_ROUTES } from '@/config/apiConfig';
import { getToken } from '@/services/authService';


export default function EditStaffScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    date?: string;
  }>();

  const staffId = params.id ?? '';
  const [name, setName] = useState(params.name ?? '');
  const [phone, setPhone] = useState(params.phone ?? '');
  const [email, setEmail] = useState(params.email ?? '');
  const [employmentDate, setEmploymentDate] = useState(params.date ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSaveEdit = async () => {
    if (!staffId) {
      showAlert('No staff selected', 'Please open this screen from Staff Management.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    // Guard clauses: stop at the first invalid field.
    const nameProblem = nameError(name);
    if (nameProblem) {
      showAlert('Invalid Name', nameProblem);
      return;
    }
    const phoneProblem = phoneError(phone);
    if (phoneProblem) {
      showAlert('Invalid Contact Number', phoneProblem);
      return;
    }
    const emailProblem = emailError(email);
    if (emailProblem) {
      showAlert('Invalid Email', emailProblem);
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await api.put(
        API_ROUTES.staffMember(staffId),
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          employmentDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert('Updated', 'Information updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to update details.');
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
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Edit Staff</Text>

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
                  />
                  <Feather name="edit-2" size={16} color="#6b7280" />
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
                    maxLength={13}
                    placeholder="09123456789"
                    placeholderTextColor="#9ca3af"
                  />
                  <Feather name="edit-2" size={16} color="#6b7280" />
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
                  />
                  <Feather name="edit-2" size={16} color="#6b7280" />
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
                  />
                  <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#6b7280" />
                </View>
              </View>
            </View>
          </View>

          {/* Edit Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSaveEdit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Edit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <RoleSideDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
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
    fontFamily: 'Poppins_700Bold',
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
    marginBottom: 28,
  },
  formList: {
    gap: 20,
    marginBottom: 34,
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
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_700Bold',
  },
});
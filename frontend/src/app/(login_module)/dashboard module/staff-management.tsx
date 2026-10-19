import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Animated,
  useWindowDimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_700Bold_Italic,
} from '@expo-google-fonts/poppins';
import axios from 'axios';
import { getToken, clearToken } from '../Role';

const YOUR_PC_IP = '192.168.1.36';
const API_URL = Platform.select({
  web: 'http://localhost:3000',
  default: `http://${YOUR_PC_IP}:3000`,
});

type StaffMember = {
  id: number;
  name: string;
  status: 'active' | 'suspended';
  phone: string;
  email: string;
  employmentDate: string;
};

const DEFAULT_STAFF: StaffMember[] = [
  { id: 101, name: 'Juan Dela Cruz', status: 'active', phone: '09123456789', email: 'juan@gmail.com', employmentDate: '03/04/2022' },
  { id: 102, name: 'Jon Migs Dela Cruz', status: 'active', phone: '09123456789', email: 'jonmigs@gmail.com', employmentDate: '05/12/2023' },
  { id: 103, name: 'Juana Dela Cruz', status: 'active', phone: '09123456789', email: 'juana@gmail.com', employmentDate: '07/20/2023' },
  { id: 104, name: 'Maricar Reyes', status: 'active', phone: '09123456789', email: 'maricar@gmail.com', employmentDate: '01/15/2024' },
  { id: 105, name: 'Uno Dos', status: 'suspended', phone: '09123456789', email: 'unodos@gmail.com', employmentDate: '02/10/2024' },
  { id: 106, name: 'Rina Mae Rael', status: 'active', phone: '09123456789', email: 'rinamae@gmail.com', employmentDate: '08/01/2024' },
  { id: 107, name: 'Gabriel John Magsilon', status: 'active', phone: '09123456789', email: 'gabriel@gmail.com', employmentDate: '10/05/2025' },
  { id: 108, name: 'Phoebe Bridgers', status: 'active', phone: '09123456789', email: 'phoebebridgers@gmail.com', employmentDate: '10/05/2026' },
];

export default function StaffManagementScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
  });

  const [staffList, setStaffList] = useState<StaffMember[]>(DEFAULT_STAFF);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Floating "Unsuspend Staff" tooltip state (tracks staff ID)
  const [tooltipStaffId, setTooltipStaffId] = useState<number | null>(null);

  // Modals state
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [unsuspendModalVisible, setUnsuspendModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Side Drawer state
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const loadStaff = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/protected/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.staff && res.data.staff.length > 0) {
        setStaffList(res.data.staff);
      } else {
        setStaffList(DEFAULT_STAFF);
      }
    } catch {
      setStaffList(DEFAULT_STAFF);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTooltipStaffId(null);
    await loadStaff();
    setRefreshing(false);
  }, [loadStaff]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  const navigateFromDrawer = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  // Handle pressing the Slash (Suspend/Unsuspend) icon on a row
  const handleSlashIconPress = (staff: StaffMember) => {
    if (staff.status === 'suspended') {
      // Toggle the floating "Unsuspend Staff" badge
      setTooltipStaffId((prev) => (prev === staff.id ? null : staff.id));
    } else {
      setTooltipStaffId(null);
      router.push({
        pathname: '/dashboard module/suspend-staff' as any,
        params: {
          id: String(staff.id),
          name: staff.name,
        },
      });
    }
  };

  // Confirm Unsuspend API call
  const handleConfirmUnsuspend = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${API_URL}/protected/staff/${selectedStaff.id}/suspend`,
        { status: 'active' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? { ...s, status: 'active' } : s))
      );
      setUnsuspendModalVisible(false);
      setTooltipStaffId(null);
    } catch (err: any) {
      // Update locally even if using mock data
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? { ...s, status: 'active' } : s))
      );
      setUnsuspendModalVisible(false);
      setTooltipStaffId(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete API call
  const handleConfirmDelete = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/protected/staff/${selectedStaff.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaffList((prev) => prev.filter((s) => s.id !== selectedStaff.id));
      setDeleteModalVisible(false);
    } catch (err: any) {
      if (err.response?.status === 400) {
        Alert.alert('Notice', err.response.data.message);
      } else {
        setStaffList((prev) => prev.filter((s) => s.id !== selectedStaff.id));
      }
      setDeleteModalVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Logout
  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await clearToken();
    router.replace('/');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#ef0000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf5" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ef0000']} />
        }
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.paddedHeader}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={30} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openMenu}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageTitle}>Staff Management</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#ef0000" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.tableCard}>
              {/* Yellow Rounded Top Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.headerText}>Staffs</Text>
              </View>

              {/* Staff Rows */}
              {staffList.map((staff, idx) => {
                const isSuspended = staff.status === 'suspended';
                const showTooltip = tooltipStaffId === staff.id;

                return (
                  <View
                    key={staff.id}
                    style={[
                      styles.staffRow,
                      isSuspended && styles.suspendedRowBg,
                      !isSuspended && idx !== staffList.length - 1 && styles.staffRowBorder,
                      showTooltip && { zIndex: 50 },
                    ]}
                  >
                    {/* Left User Icon + Name */}
                    <View style={styles.leftRow}>
                      <Ionicons
                        name="person-outline"
                        size={30}
                        color={isSuspended ? '#ffffff' : '#1f2937'}
                      />
                      <Text
                        style={[
                          styles.staffName,
                          isSuspended && styles.suspendedStaffName,
                        ]}
                        numberOfLines={1}
                      >
                        {staff.name}{' '}
                        {isSuspended && (
                          <Text style={styles.suspendedTagText}>[Suspended]</Text>
                        )}
                      </Text>
                    </View>

                    {/* Right Action Icons */}
                    <View style={styles.actionsRow}>
                      {/* Edit Button */}
                      <TouchableOpacity
                        onPress={() => {
                          setTooltipStaffId(null);
                          router.push({
                            pathname: '/dashboard module/edit-staff' as any,
                            params: {
                              id: String(staff.id),
                              name: staff.name,
                              phone: staff.phone,
                              email: staff.email,
                              date: staff.employmentDate,
                            },
                          });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Feather
                          name="edit-2"
                          size={18}
                          color={isSuspended ? '#ffffff' : '#1f2937'}
                        />
                      </TouchableOpacity>

                      {/* Suspend / Unsuspend Trigger Button */}
                      <View style={styles.slashWrapper}>
                        <TouchableOpacity
                          onPress={() => handleSlashIconPress(staff)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <Feather
                            name="slash"
                            size={18}
                            color={isSuspended ? '#ffffff' : '#1f2937'}
                          />
                        </TouchableOpacity>

                        {/* Floating "Unsuspend Staff" Badge matching image_70a8fa.png */}
                        {showTooltip && (
                          <TouchableOpacity
                            style={styles.unsuspendTooltip}
                            activeOpacity={0.9}
                            onPress={() => {
                              setSelectedStaff(staff);
                              setTooltipStaffId(null);
                              setUnsuspendModalVisible(true);
                            }}
                          >
                            <Text style={styles.unsuspendTooltipText}>
                              Unsuspend Staff
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Delete Trash Button */}
                      <TouchableOpacity
                        onPress={() => {
                          setTooltipStaffId(null);
                          setSelectedStaff(staff);
                          setDeleteModalVisible(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color={isSuspended ? '#ffffff' : '#ef0000'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Bottom-Right Add (+) Button */}
          <View style={styles.plusRow}>
            <TouchableOpacity
              style={styles.plusBtn}
              onPress={() => router.push('/dashboard module/create-staff' as any)}
            >
              <Feather name="plus" size={34} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 1. Unsuspend Staff Confirmation Modal matching image_70a91b.png */}
      <Modal
        visible={unsuspendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnsuspendModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="update" size={50} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}unsuspend this staff?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setUnsuspendModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmUnsuspend}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Delete Staff Confirmation Modal matching image_70a93e.png */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="trash-can-outline" size={48} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}delete this staff’s account?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Side Drawer Modal */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <TouchableOpacity style={styles.drawerCloseBtn} onPress={closeMenu}>
              <Feather name="x" size={28} color="#1f2937" />
            </TouchableOpacity>

            <View style={styles.drawerMenuWrapper}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/account-info')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="person-outline" size={38} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Account Information</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/stock-alert')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="notifications" size={38} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Stock Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/manage-price')}
              >
                <View style={styles.drawerIconBox}>
                  <MaterialCommunityIcons name="tag-multiple" size={38} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Manage Price</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/stocks')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="eye-outline" size={40} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Live Stock Count</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/record-waste')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="document-text-outline" size={38} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Record Waste</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateFromDrawer('/dashboard module/waste-history')}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="trash-outline" size={38} color="#ef0000" />
                </View>
                <Text style={styles.drawerItemText}>Waste History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                closeMenu();
                setTimeout(() => setLogoutModalVisible(true), 240);
              }}
            >
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* 4. Logout Confirmation Modal matching image_70a973.png */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="logout" size={46} color="#ef0000" />
            </View>

            <Text style={styles.modalPrompt}>
              Are you sure you want to{'\n'}log out your account?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffdf5',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffdf5',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  paddedHeader: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 0,
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 23,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 22,
  },
  tableCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'visible',
  },
  tableHeader: {
    backgroundColor: '#ffc400',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#ef0000',
  },
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  suspendedRowBg: {
    backgroundColor: '#ef0000',
  },
  staffRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ffdf70',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 14,
  },
  staffName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 9.5,
    color: '#1f2937',
    flex: 1,
  },
  suspendedStaffName: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
  },
  suspendedTagText: {
    fontFamily: 'Poppins_700Bold_Italic',
    color: '#ffffff',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slashWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  unsuspendTooltip: {
    position: 'absolute',
    top: 22,
    right: -34,
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 96,
    alignItems: 'center',
    zIndex: 100,
  },
  unsuspendTooltipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8.5,
    color: '#374151',
  },
  plusRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 26,
    marginTop: 18,
  },
  plusBtn: {
    padding: 6,
  },
  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fdfbf0',
    borderRadius: 34,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fffdf7',
  },
  modalPrompt: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#ef0000',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 26,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ef0000',
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ef0000',
    fontSize: 12.5,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#ef0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 12.5,
  },
  /* Drawer Styles */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    backgroundColor: '#fdf8ea',
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: 22,
    paddingBottom: 32,
    justifyContent: 'flex-start',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: -2, height: 0 },
  },
  drawerCloseBtn: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 24,
  },
  drawerMenuWrapper: {
    gap: 26,
    marginTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerIconBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  drawerItemText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#1f2937',
  },
  logoutBtn: {
    marginTop: 40,
    marginHorizontal: 18,
    height: 44,
    backgroundColor: '#ef0000',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    fontSize: 14,
  },
});
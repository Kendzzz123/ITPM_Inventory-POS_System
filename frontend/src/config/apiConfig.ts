/**
 * @file apiConfig.ts
 * @description Centralized API configuration. Change the IP address here only —
 * every screen imports API_URL from this file.
 */
import { Platform } from 'react-native';

/** 
 * Your computer's local Wi-Fi IPv4 address.
 * Change this ONE value when switching networks or deploying.
 */
const HOST_IP = '192.168.1.36';

/** Backend server port */
const PORT = 3000;

/**
 * Base URL for all API requests.
 * - Web/iOS simulator → localhost
 * - Physical devices → local network IP
 */
export const API_URL: string = Platform.select({
  web: `http://localhost:${PORT}`,
  default: `http://${HOST_IP}:${PORT}`,
}) as string;

/** Auth endpoints (no token required) */
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_URL}/auth/login`,
  FORGOT_PASSWORD: `${API_URL}/auth/forgot-password`,
  VERIFY_OTP: `${API_URL}/auth/verify-otp`,
  RESET_PASSWORD: `${API_URL}/auth/reset-password`,
} as const;

/** Protected endpoints (JWT required) */
export const PROTECTED_ENDPOINTS = {
  PROFILE: `${API_URL}/protected/profile`,
  DASHBOARD_REPORT: `${API_URL}/protected/dashboard-report`,
  ACCOUNT: `${API_URL}/protected/account`,
  STOCKS: `${API_URL}/protected/stocks`,
  RESTOCK: `${API_URL}/protected/restock`,
  WASTE: `${API_URL}/protected/waste`,
  WASTE_HISTORY: `${API_URL}/protected/waste-history`,
  SALES_REPORT: `${API_URL}/protected/sales-report`,
  MENU_ITEMS: `${API_URL}/protected/menu-items`,
  STAFF: `${API_URL}/protected/staff`,
  MANAGER_DASHBOARD: `${API_URL}/protected/manager-dashboard`,
} as const;

// TEST: Unit test that API_URL is well-formed (starts with http, contains port)
// TEST: Verify all endpoint constants contain the API_URL prefix

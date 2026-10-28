/**
 * @file apiConfig.ts
 * @description Centralized API configuration. In development the host IP is
 * detected automatically from the Expo dev server, so nothing needs editing
 * when your Wi-Fi/IP changes. Every screen imports from this file.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Backend server port */
const PORT = 3000;

/**
 * Fallback IP, used only if auto-detection fails (e.g. a standalone build).
 * THIS IS THE ONLY PLACE TO CHANGE THE SERVER IP — every screen imports API_URL
 * from this file. Run `ipconfig` on the PC running the backend to find it.
 */
const FALLBACK_HOST_IP = '192.168.1.40';

/**
 * Optional manual override. Set EXPO_PUBLIC_API_URL in a .env file
 * (e.g. EXPO_PUBLIC_API_URL=https://my-server.com) to bypass detection,
 * for deployment or testing against a hosted backend.
 */
const ENV_API_URL: string | undefined = process.env.EXPO_PUBLIC_API_URL;

/**
 * Detects the dev machine's IP from the Expo dev server address.
 * hostUri looks like "192.168.1.36:8081" -> returns "192.168.1.36".
 * Returns undefined when not available (production builds, tunnel mode).
 */
const detectDevHost = (): string | undefined => {
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  const host = hostUri?.split(':')[0];

  // Tunnel mode returns a public domain, not your LAN IP, so ignore it.
  if (!host || host.includes('exp.direct') || host.includes('ngrok')) {
    return undefined;
  }
  return host;
};

/**
 * Base URL for all API requests.
 * Priority: env override -> web localhost -> auto-detected IP -> fallback IP.
 */
export const API_URL: string =
  ENV_API_URL ??
  (Platform.OS === 'web'
    ? `http://localhost:${PORT}`
    : `http://${detectDevHost() ?? FALLBACK_HOST_IP}:${PORT}`);

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
  ACCOUNT: `${API_URL}/protected/account`,
  CHANGE_PASSWORD: `${API_URL}/protected/change-password`,
  DASHBOARD_REPORT: `${API_URL}/protected/dashboard-report`,
  SALES_REPORT: `${API_URL}/protected/sales-report`,
  TRANSACTIONS: `${API_URL}/protected/transactions`,
  ORDERS: `${API_URL}/protected/orders`,
  STOCKS: `${API_URL}/protected/stocks`,
  RESTOCK: `${API_URL}/protected/restock`,
  WASTE: `${API_URL}/protected/waste`,
  WASTE_HISTORY: `${API_URL}/protected/waste-history`,
  MENU_ITEMS: `${API_URL}/protected/menu-items`,
  STAFF: `${API_URL}/protected/staff`,
  MANAGER_DASHBOARD: `${API_URL}/protected/manager-dashboard`,
  /** PUT — update one menu item's price */
  menuItem: (id: number | string) => `${API_URL}/protected/menu-items/${id}`,
  /** PUT — set the stock portion one order of a menu item uses */
  menuItemPortion: (id: number | string) => `${API_URL}/protected/menu-items/${id}/portion`,
  /** PUT / DELETE — one staff member */
  staffMember: (id: number | string) => `${API_URL}/protected/staff/${id}`,
  /** PATCH — suspend / reactivate one staff member */
  staffSuspend: (id: number | string) => `${API_URL}/protected/staff/${id}/suspend`,
} as const;

// TEST: Unit test that API_URL is well-formed (starts with http, contains port)
// TEST: Verify all endpoint constants contain the API_URL prefix
// TEST: Mock Constants.expoConfig.hostUri = '10.0.0.5:8081' -> API_URL host is 10.0.0.5
// TEST: Verify EXPO_PUBLIC_API_URL overrides detection
// TEST: Verify tunnel hosts (exp.direct) fall back to FALLBACK_HOST_IP
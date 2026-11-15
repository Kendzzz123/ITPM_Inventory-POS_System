/**
 * @file apiConfig.ts
 * @description The ONLY place that knows where the backend is. Screens never
 * build URLs: they call `api.get(API_ROUTES.STOCKS)` and this file supplies the
 * server address.
 *
 * Nobody types an IP address. The app finds the server by itself, in this order:
 *   1. EXPO_PUBLIC_API_URL, if set in frontend/.env (e.g. a hosted server)
 *   2. Web: the same host the page was opened from
 *   3. The PC running the Expo dev server, then the last server this phone used
 *   4. A search of this phone's Wi-Fi (every address answering GET /health on SERVER_PORT)
 * The server found is remembered, and searched for again if it stops answering
 * (e.g. the PC got a new IP from the router).
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Network from 'expo-network';
import { getStoredItem, setStoredItem } from '@/services/storage';

/** Port the backend listens on (PORT in backend/.env). */
export const SERVER_PORT = 3000;

/** Every backend route the app calls. Paths only, the server address is added by `api`. */
export const API_ROUTES = {
  // Auth (no token)
  LOGIN: '/auth/login',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_OTP: '/auth/verify-otp',
  RESET_PASSWORD: '/auth/reset-password',

  // Protected (JWT required)
  PROFILE: '/protected/profile',
  ACCOUNT: '/protected/account',
  CHANGE_PASSWORD: '/protected/change-password',
  DASHBOARD_REPORT: '/protected/dashboard-report',
  MANAGER_DASHBOARD: '/protected/manager-dashboard',
  SALES_REPORT: '/protected/sales-report',
  TRANSACTIONS: '/protected/transactions',
  TRANSACTIONS_EXPORT: '/protected/transactions/export',
  ORDERS: '/protected/orders',
  STOCKS: '/protected/stocks',
  RESTOCK: '/protected/restock',
  WASTE: '/protected/waste',
  WASTE_HISTORY: '/protected/waste-history',
  MENU_ITEMS: '/protected/menu-items',
  STAFF: '/protected/staff',
  /** PUT — one menu item's price */
  menuItem: (id: number | string) => `/protected/menu-items/${id}`,
  /** PUT — the stock one order of a menu item uses */
  menuItemPortion: (id: number | string) => `/protected/menu-items/${id}/portion`,
  /** PUT / DELETE — one staff member */
  staffMember: (id: number | string) => `/protected/staff/${id}`,
  /** PATCH — suspend / reactivate one staff member */
  staffSuspend: (id: number | string) => `/protected/staff/${id}/suspend`,
} as const;

// ---------------------------------------------------------------------------
// Finding the server
// ---------------------------------------------------------------------------

/** Optional fixed address for a hosted backend (frontend/.env: EXPO_PUBLIC_API_URL=https://...). */
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') || undefined;

const SAVED_SERVER_KEY = 'api_server_url';
const QUICK_TIMEOUT_MS = 1500; // dev PC / last known server
const SCAN_TIMEOUT_MS = 900; // each address during the Wi-Fi search
const SCAN_BATCH = 64; // addresses checked at the same time

const NOT_FOUND_MESSAGE =
  "Can't find the Mr. Liempo server on this Wi-Fi. Make sure the backend is running " +
  '(npm start in the backend folder) and this phone is on the same Wi-Fi as that PC.';

const urlFor = (host: string) => `http://${host}:${SERVER_PORT}`;

/** The PC running the Expo dev server ("192.168.1.36:8081" -> "192.168.1.36"), if any. */
function devServerHost(): string | undefined {
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];
  // Tunnel mode gives a public domain, not the PC's Wi-Fi address.
  if (!host || host.includes('exp.direct') || host.includes('ngrok')) return undefined;
  return host;
}

/** True if this address is our backend (its /health answers with a status). */
async function isOurServer(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    const body = await res.json();
    // 200 {status:'ok'} or 500 {status:'error'} when MySQL is down: either way it is our server.
    return typeof body?.status === 'string' && 'db' in body;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Checks all addresses at once; resolves with the first one that is our server. */
function firstServer(urls: string[], timeoutMs: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (urls.length === 0) {
      resolve(undefined);
      return;
    }
    let left = urls.length;
    for (const url of urls) {
      isOurServer(url, timeoutMs).then((found) => {
        if (found) resolve(url);
        else if (--left === 0) resolve(undefined);
      });
    }
  });
}

/** Searches the phone's Wi-Fi network (x.x.x.1 to x.x.x.254) for the backend. */
async function searchWifi(): Promise<string | undefined> {
  let ip: string | undefined;
  try {
    ip = await Network.getIpAddressAsync();
  } catch {
    ip = undefined;
  }
  const parts = (ip ?? '').split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255) || parts[0] === 0) {
    return undefined; // no Wi-Fi address (offline, mobile data only, ...)
  }
  const prefix = parts.slice(0, 3).join('.');
  const candidates: string[] = [];
  for (let n = 1; n <= 254; n += 1) if (n !== parts[3]) candidates.push(urlFor(`${prefix}.${n}`));

  for (let i = 0; i < candidates.length; i += SCAN_BATCH) {
    const found = await firstServer(candidates.slice(i, i + SCAN_BATCH), SCAN_TIMEOUT_MS);
    if (found) return found;
  }
  return undefined;
}

async function findServer(): Promise<string> {
  if (ENV_API_URL) return ENV_API_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return urlFor(window.location.hostname);

  const dev = devServerHost();
  const saved = await getStoredItem(SAVED_SERVER_KEY);
  const quick = [dev ? urlFor(dev) : null, saved].filter((u, i, all): u is string => !!u && all.indexOf(u) === i);

  const url = (await firstServer(quick, QUICK_TIMEOUT_MS)) ?? (await searchWifi());
  if (!url) throw new Error(NOT_FOUND_MESSAGE);
  if (url !== saved) await setStoredItem(SAVED_SERVER_KEY, url);
  return url;
}

let serverUrl: string | null = null;
let finding: Promise<string> | null = null;

/** The backend's base URL (found once, then reused). All screens share one search. */
export function getApiUrl(): Promise<string> {
  if (serverUrl) return Promise.resolve(serverUrl);
  if (!finding) {
    finding = findServer()
      .then((url) => {
        serverUrl = url;
        return url;
      })
      .finally(() => {
        finding = null;
      });
  }
  return finding;
}

/** The address in use right now (null until the first request), e.g. for error messages. */
export const getKnownApiUrl = (): string | null => serverUrl;

// ---------------------------------------------------------------------------
// Shared HTTP client: use `api` instead of `axios` everywhere
// ---------------------------------------------------------------------------

/**
 * axios with the server address filled in: `api.get(API_ROUTES.STOCKS, { headers })`.
 * A free online server sleeps when unused and takes up to a minute to wake up,
 * so with EXPO_PUBLIC_API_URL the first request is allowed to wait longer.
 */
export const api = axios.create({ timeout: ENV_API_URL ? 75000 : 20000 });

api.interceptors.request.use(async (config) => {
  config.baseURL = await getApiUrl();
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _searchedAgain?: boolean };

api.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as RetryConfig | undefined;
  // No answer at all: the PC may have a new IP. Search once more, then retry the request.
  if (config && !error.response && !config._searchedAgain && !ENV_API_URL && Platform.OS !== 'web') {
    config._searchedAgain = true;
    serverUrl = null;
    return api.request(config);
  }
  return Promise.reject(error);
});

// TEST: EXPO_PUBLIC_API_URL set -> getApiUrl() returns it without any network check; timeout 75 s (server may be waking up)
// TEST: dev host answers /health -> used and saved; nothing scanned
// TEST: no dev host, nothing saved -> Wi-Fi search finds the PC answering /health on SERVER_PORT
// TEST: saved server stops answering -> next request searches again and retries once
// TEST: no server anywhere -> requests fail with NOT_FOUND_MESSAGE

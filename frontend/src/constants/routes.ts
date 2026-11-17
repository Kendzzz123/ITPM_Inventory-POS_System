/**
 * @file routes.ts
 * @description Every screen path in one place. Folders in parentheses,
 * like (auth) and (main), are route groups and do not appear in the URL.
 */
import type { Href } from 'expo-router';

export const ROUTES = {
  // (auth)
  LOGIN: '/',
  FORGOT_PASSWORD: '/forgot-password',
  OTP: '/otp',
  NEW_PASSWORD: '/new-password',
  CHANGE_PASSWORD: '/change-password',

  // (main) — manager
  MANAGER_HOME: '/dashboard',
  SALES_REPORT: '/sales-report',
  ACCOUNT_INFO: '/account-info',
  STAFF_MANAGEMENT: '/staff-management',
  CREATE_STAFF: '/create-staff',
  EDIT_STAFF: '/edit-staff',
  SUSPEND_STAFF: '/suspend-staff',
  MANAGE_PRICE: '/manage-price',
  EDIT_PRICE: '/edit-price',
  RESTOCK: '/restock',
  RECORD_WASTE: '/record-waste',
  WASTE_HISTORY: '/waste-history',

  // (main) — shared / cashier
  CASHIER_HOME: '/cashier-dashboard',
  CASHIER_ACCOUNT: '/cashier-account',
  EDIT_PASSWORD: '/edit-password',
  STOCKS: '/stocks',
  STOCK_ALERT: '/stock-alert',
  POS: '/pos',
  POS_PAYMENT: '/pos-payment',
  TRANSACTION_SUCCESS: '/transaction-success',
  TRANSACTION_HISTORY: '/transaction-history',
} as const satisfies Record<string, Href>;

/** Home screen for a role. */
export const homeRouteFor = (role: string | null | undefined): Href =>
  String(role).toLowerCase() === 'manager' ? ROUTES.MANAGER_HOME : ROUTES.CASHIER_HOME;

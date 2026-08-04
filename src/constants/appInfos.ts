const DEFAULT_BASE_URL = '/identity';

export const appInfo = {
  APP_NAME: 'Mobile Team Documents',
  APP_DESCRIPTION: 'Mot tai khoan, mo khoa moi trai nghiem',
  APP_VERSION: '0.1.0',
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL,
  LOGO_URL: '/images/ic_logo_vlive.png',
} as const;

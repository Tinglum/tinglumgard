export const vippsConfig = {
  // Vipps credentials (same for both Login and Checkout)
  clientId: process.env.VIPPS_CLIENT_ID!,
  clientSecret: process.env.VIPPS_CLIENT_SECRET!,
  merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER!,
  subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY!,

  // Use test environment if configured
  isTest: process.env.VIPPS_ENV === 'test',

  get apiBaseUrl() {
    return this.isTest
      ? 'https://apitest.vipps.no'
      : 'https://api.vipps.no';
  },

  get loginBaseUrl() {
    return this.isTest
      ? 'https://apitest.vipps.no'
      : 'https://api.vipps.no';
  },

  redirectUri: process.env.VIPPS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/vipps/callback`,
};

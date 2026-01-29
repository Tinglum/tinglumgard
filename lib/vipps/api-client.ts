import { vippsConfig } from './config';

class VippsClient {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: vippsConfig.clientId,
      response_type: 'code',
      scope: 'openid email name phoneNumber address',
      state,
      redirect_uri: vippsConfig.redirectUri,
    });

    return `${vippsConfig.loginBaseUrl}/access-management-1.0/access/oauth2/auth?${params.toString()}`;
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${vippsConfig.apiBaseUrl}/accesstoken/get`, {
      method: 'POST',
      headers: {
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Vipps access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  async exchangeCodeForToken(code: string) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: vippsConfig.redirectUri,
      client_id: vippsConfig.clientId,
      client_secret: vippsConfig.clientSecret,
    });

    const response = await fetch(`${vippsConfig.loginBaseUrl}/access-management-1.0/access/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vipps token exchange failed:', response.status, errorText);
      throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async getUserInfo(accessToken: string) {
    const userInfoUrl = vippsConfig.isTest
      ? `${vippsConfig.loginBaseUrl}/access-management-1.0/access/userinfo`
      : `${vippsConfig.loginBaseUrl}/vipps-userinfo-api/userinfo`;

    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vipps getUserInfo failed:', response.status, errorText);
      throw new Error(`Failed to get user info: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async createPayment(paymentData: any) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
        'Vipps-System-Name': 'tinglumgard',
        'Vipps-System-Version': '1.0.0',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create payment: ${error}`);
    }

    return response.json();
  }

  async createCheckoutSession(sessionData: any) {
    const accessToken = await this.getAccessToken();

    console.log('Vipps Checkout - Creating session with credentials in headers');

    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
        'Vipps-System-Name': 'tinglumgard',
        'Vipps-System-Version': '1.0.0',
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create checkout session: ${error}`);
    }

    return response.json();
  }

  async getPayment(orderId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${vippsConfig.apiBaseUrl}/ecomm/v2/payments/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get payment details');
    }

    return response.json();
  }

  async getPaymentStatus(reference: string) {
    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session/${reference}`, {
      headers: {
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get payment status');
    }

    return response.json();
  }

  async getCheckoutSession(sessionId: string) {
    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session/${sessionId}`, {
      headers: {
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get checkout session');
    }

    return response.json();
  }
}

export const vippsClient = new VippsClient();

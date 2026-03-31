import { vippsConfig } from './config';

class VippsClient {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: vippsConfig.clientId,
      response_type: 'code',
      scope: 'openid email name phoneNumber',
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

    const endpoint = `${vippsConfig.apiBaseUrl}/checkout/v3/session`;
    const requestTimestamp = new Date().toISOString();
    console.log('Vipps Checkout - Creating session', {
      endpoint,
      timestamp: requestTimestamp,
      msn: vippsConfig.merchantSerialNumber,
      clientIdPrefix: vippsConfig.clientId.substring(0, 8) + '...',
      subscriptionKeyPrefix: vippsConfig.subscriptionKey.substring(0, 8) + '...',
      env: vippsConfig.isTest ? 'test' : 'production',
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
        'Vipps-System-Name': 'tinglumgard',
        'Vipps-System-Version': '1.0.0',
        'Vipps-System-Plugin-Name': 'tinglumgard-checkout',
        'Vipps-System-Plugin-Version': '1.0.0',
      },
      body: JSON.stringify(sessionData),
    });

    const responseText = await response.text();
    console.log('Vipps API Response:', {
      status: response.status,
      statusText: response.statusText,
      timestamp: requestTimestamp,
      responseBody: responseText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      console.error('Vipps Checkout session creation failed:', {
        endpoint,
        timestamp: requestTimestamp,
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
        msn: vippsConfig.merchantSerialNumber,
        requestBody: JSON.stringify(sessionData),
      });
      throw new Error(`Failed to create checkout session: ${response.status} ${responseText}`);
    }

    const result = JSON.parse(responseText);

    // Vipps Checkout v3 returns a JWT token instead of sessionId
    // We need to decode the token to get the session info
    if (!result.token) {
      console.error('ERROR: Vipps returned 200 OK but no token!');
      throw new Error('Vipps API returned success but missing token');
    }

    // Decode the JWT to extract session information
    const tokenPayload = JSON.parse(
      Buffer.from(result.token.split('.')[1], 'base64').toString()
    );


    // Extract session ID and URL from the token
    const sessionId = tokenPayload.sid;
    const sessionUrl = tokenPayload.sessionUrl;

    // Construct the checkout URL using the token
    // The frontend expects the token as a parameter
    const checkoutUrlWithToken = `${result.checkoutFrontendUrl}?token=${result.token}`;

    console.log('Vipps Checkout session created successfully:', { sessionId });

    // Return a normalized response that matches what the rest of the code expects
    return {
      ...result,
      sessionId, // Add sessionId for database storage
      sessionUrl, // Add the direct session URL
      checkoutFrontendUrl: checkoutUrlWithToken, // Override with token-based URL
    };
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
        'Vipps-System-Name': 'tinglumgard',
        'Vipps-System-Version': '1.0.0',
        'Vipps-System-Plugin-Name': 'tinglumgard-checkout',
        'Vipps-System-Plugin-Version': '1.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get payment status (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getCheckoutSession(sessionIdOrReference: string) {
    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session/${sessionIdOrReference}`, {
      headers: {
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
        'Vipps-System-Name': 'tinglumgard',
        'Vipps-System-Version': '1.0.0',
        'Vipps-System-Plugin-Name': 'tinglumgard-checkout',
        'Vipps-System-Plugin-Version': '1.0.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get checkout session (${response.status}): ${errorText}`);
    }

    return response.json();
  }
}

export const vippsClient = new VippsClient();

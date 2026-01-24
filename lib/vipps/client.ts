import { vippsConfig } from './config';

interface VippsAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface VippsUserInfo {
  sub: string;
  phone_number?: string;
  email?: string;
  name?: string;
}

interface CreatePaymentRequest {
  amount: {
    currency: string;
    value: number;
  };
  paymentMethod: {
    type: string;
  };
  customer: {
    phoneNumber?: string;
  };
  reference: string;
  userFlow: string;
  returnUrl: string;
  paymentDescription: string;
}

interface CheckoutSessionRequest {
  merchantInfo: {
    callbackAuthorizationToken?: string;
    callbackUrl?: string;
    returnUrl: string;
    termsAndConditionsUrl?: string;
  };
  transaction: {
    amount: {
      currency: string;
      value: number;
    };
    reference: string;
    paymentDescription: string;
  };
  logistics?: {
    dynamicOptionsCallback?: {
      url: string;
      authToken: string;
    };
  };
  configuration?: {
    customerInteraction?: string;
    elements?: string;
    requireUserInfo?: boolean;
    userFlow?: string;
  };
}

interface VippsPayment {
  reference: string;
  state: string;
  amount: {
    value: number;
    currency: string;
  };
  aggregate: {
    authorizedAmount: {
      value: number;
      currency: string;
    };
    capturedAmount: {
      value: number;
      currency: string;
    };
  };
}

interface CheckoutSession {
  sessionId: string;
  sessionState: string;
  paymentMethod?: {
    type: string;
  };
  amount: {
    value: number;
    currency: string;
  };
  aggregate?: {
    authorizedAmount: {
      value: number;
      currency: string;
    };
    capturedAmount: {
      value: number;
      currency: string;
    };
  };
}

export class VippsClient {
  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${vippsConfig.apiBaseUrl}/accesstoken/get`, {
      method: 'POST',
      headers: {
        'client_id': vippsConfig.clientId,
        'client_secret': vippsConfig.clientSecret,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Vipps access token: ${error}`);
    }

    const data: VippsAccessToken = await response.json();
    return data.access_token;
  }

  async getUserInfo(accessToken: string): Promise<VippsUserInfo> {
    const response = await fetch(`${vippsConfig.loginBaseUrl}/vipps-userinfo-api/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Vipps user info');
    }

    return response.json();
  }

  async createPayment(request: CreatePaymentRequest): Promise<{ reference: string; redirectUrl: string }> {
    const token = await this.getAccessToken();

    const response = await fetch(`${vippsConfig.apiBaseUrl}/epayment/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
        'Idempotency-Key': request.reference,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Vipps payment: ${error}`);
    }

    const data = await response.json();
    return {
      reference: data.reference,
      redirectUrl: data.redirectUrl,
    };
  }

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<{ sessionId: string; checkoutUrl: string; pollingUrl: string }> {
    const token = await this.getAccessToken();

    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
        'Idempotency-Key': request.transaction.reference,
        'Vipps-System-Name': 'tinglum-farm',
        'Vipps-System-Version': '1.0',
        'Vipps-System-Plugin-Name': 'nextjs',
        'Vipps-System-Plugin-Version': '13.5.1',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vipps Checkout API Error:', errorText);
      throw new Error(`Failed to create Vipps checkout session: ${errorText}`);
    }

    const data = await response.json();

    // Construct checkout URL
    const checkoutBaseUrl = vippsConfig.isTest
      ? 'https://checkout.test.vipps.no'
      : 'https://checkout.vipps.no';

    return {
      sessionId: data.sessionId,
      checkoutUrl: `${checkoutBaseUrl}/${data.sessionId}`,
      pollingUrl: data.pollingUrl,
    };
  }

  async getPayment(reference: string): Promise<VippsPayment> {
    const token = await this.getAccessToken();

    const response = await fetch(`${vippsConfig.apiBaseUrl}/epayment/v1/payments/${reference}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Vipps payment');
    }

    return response.json();
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const token = await this.getAccessToken();

    const response = await fetch(`${vippsConfig.apiBaseUrl}/checkout/v3/session/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': vippsConfig.subscriptionKey,
        'Merchant-Serial-Number': vippsConfig.merchantSerialNumber,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get checkout session:', errorText);
      throw new Error('Failed to get Vipps checkout session');
    }

    return response.json();
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: vippsConfig.clientId,
      response_type: 'code',
      scope: 'openid phoneNumber email name',
      state,
      redirect_uri: vippsConfig.redirectUri,
    });

    return `${vippsConfig.loginBaseUrl}/access-management-1.0/access/oauth2/auth?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string; id_token: string }> {
    const response = await fetch(`${vippsConfig.loginBaseUrl}/access-management-1.0/access/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${vippsConfig.clientId}:${vippsConfig.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: vippsConfig.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    return response.json();
  }
}

export const vippsClient = new VippsClient();

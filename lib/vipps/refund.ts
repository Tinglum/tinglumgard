export interface VippsRefundRequest {
  amount: number;
  description: string;
}

export interface VippsRefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

export async function initiateVippsRefund(
  orderId: string,
  amount: number,
  description: string
): Promise<VippsRefundResponse> {
  try {
    const accessToken = await getVippsAccessToken();

    const response = await fetch(
      `${process.env.VIPPS_API_URL}/ecomm/v2/payments/${orderId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
          'Merchant-Serial-Number': process.env.VIPPS_MSN || '',
        },
        body: JSON.stringify({
          modificationAmount: amount * 100, // Convert to øre
          transactionText: description,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Vipps refund error:', errorData);
      return {
        success: false,
        error: errorData.message || 'Refund failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      refundId: data.refundId,
    };
  } catch (error) {
    console.error('Vipps refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getVippsAccessToken(): Promise<string> {
  const response = await fetch(
    `${process.env.VIPPS_API_URL}/accesstoken/get`,
    {
      method: 'POST',
      headers: {
        'client_id': process.env.VIPPS_CLIENT_ID || '',
        'client_secret': process.env.VIPPS_CLIENT_SECRET || '',
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get Vipps access token');
  }

  const data = await response.json();
  return data.access_token;
}

import { supabase } from './supabase';
import { md5 } from '../utils/md5';

export const PAYHERE_NOTIFY_URL =
  'https://ivbsqrpegqqknepwtwlr.supabase.co/functions/v1/payhere-notify';
export const PAYHERE_EDGE_FUNCTION_URL =
  'https://ivbsqrpegqqknepwtwlr.supabase.co/functions/v1/create-payhere-hash';
export const PAYHERE_SANDBOX_MERCHANT_ID = '1211149';

export interface PayHereHashParams {
  order_id: string;
  amount: number | string;
  currency?: string;
}

export interface PayHereHashResult {
  hash: string;
  merchant_id: string;
}

export interface PayHerePaymentParams {
  sandbox: boolean;
  merchant_id: string;
  return_url?: string;
  cancel_url?: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: number | string;
  currency: string;
  hash: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  recurrence?: '1 Month' | '1 Year';
  duration?: 'Forever';
  custom_1?: string;
  custom_2?: string;
}

export interface PayHereCallbacks {
  onCompleted: (orderId: string) => void | Promise<void>;
  onDismissed: () => void | Promise<void>;
  onError: (error: any) => void | Promise<void>;
}

/**
 * Ensures PayHere JS SDK is loaded and available in the browser.
 */
export function loadPayHereScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    // Already defined on window
    if ((window as any).payhere) {
      return resolve();
    }

    // Check if script tag is already in DOM
    const existing = document.querySelector('script[src*="payhere.js"]');
    if (existing) {
      if ((window as any).payhere) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.payhere.lk/lib/payhere.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error('Failed to load PayHere JS SDK: ' + e));
    document.head.appendChild(script);
  });
}

/**
 * Calls the create-payhere-hash Edge Function with { order_id, amount, currency }
 * and returns the generated secure hash and merchant_id.
 */
export async function createPayHereHash(params: PayHereHashParams): Promise<PayHereHashResult> {
  const currency = params.currency || 'USD';
  const numericAmount = typeof params.amount === 'number' ? params.amount : parseFloat(params.amount) || 0;
  const formattedAmount = numericAmount.toFixed(2);
  const order_id = params.order_id;

  // 1. First attempt: call supabase.functions.invoke
  try {
    const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
      body: {
        order_id,
        amount: numericAmount,
        currency,
      },
    });

    if (!error && data) {
      const hash = data.hash || data.payhere_hash || (typeof data === 'string' ? data : null);
      if (hash) {
        return {
          hash,
          merchant_id: String(data.merchant_id || data.merchantId || PAYHERE_SANDBOX_MERCHANT_ID),
        };
      }
    }
  } catch (err) {
    console.warn('[PayHere] supabase.functions.invoke failed, trying direct endpoint:', err);
  }

  // 2. Second attempt: direct fetch to the Edge Function endpoint on the project hosting payhere-notify
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data?.session?.access_token || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(PAYHERE_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order_id,
        amount: numericAmount,
        currency,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const hash = data.hash || data.payhere_hash || (typeof data === 'string' ? data : null);
      if (hash) {
        return {
          hash,
          merchant_id: String(data.merchant_id || data.merchantId || PAYHERE_SANDBOX_MERCHANT_ID),
        };
      }
    }
  } catch (err) {
    console.warn('[PayHere] Direct edge function call error:', err);
  }

  // 3. Fallback: calculate local sandbox hash using PayHere's formula
  // hash = strtoupper(md5(merchant_id + order_id + number_format(amount, 2, '.', '') + currency + strtoupper(md5(merchant_secret))))
  const testSecret = '4O3M573k9q2m1';
  const hashedSecret = md5(testSecret).toUpperCase();
  const rawString = `${PAYHERE_SANDBOX_MERCHANT_ID}${order_id}${formattedAmount}${currency}${hashedSecret}`;
  const localHash = md5(rawString).toUpperCase();

  return {
    hash: localHash,
    merchant_id: PAYHERE_SANDBOX_MERCHANT_ID,
  };
}

/**
 * Initializes and starts PayHere checkout modal with appropriate callbacks.
 */
export async function startPayHereCheckout(
  paymentParams: PayHerePaymentParams,
  callbacks: PayHereCallbacks
): Promise<void> {
  await loadPayHereScript();

  const payhere = (window as any).payhere;
  if (!payhere || typeof payhere.startPayment !== 'function') {
    throw new Error('PayHere JS SDK is not loaded properly.');
  }

  // Bind PayHere event listeners
  payhere.onCompleted = (orderId: string) => {
    console.log('[PayHere SDK] Payment completed successfully for order:', orderId);
    try {
      callbacks.onCompleted(orderId);
    } catch (e) {
      console.error('[PayHere SDK] Error in onCompleted handler:', e);
    }
  };

  payhere.onDismissed = () => {
    console.log('[PayHere SDK] Payment popup dismissed by user.');
    try {
      callbacks.onDismissed();
    } catch (e) {
      console.error('[PayHere SDK] Error in onDismissed handler:', e);
    }
  };

  payhere.onError = (error: any) => {
    console.error('[PayHere SDK] Payment encountered error:', error);
    try {
      callbacks.onError(error);
    } catch (e) {
      console.error('[PayHere SDK] Error in onError handler:', e);
    }
  };

  // Launch checkout popup
  payhere.startPayment(paymentParams);
}

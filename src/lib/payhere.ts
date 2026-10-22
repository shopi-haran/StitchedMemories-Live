import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

export const PAYHERE_NOTIFY_URL = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/payhere-notify`
  : 'https://ivbsqrpegqqknepwtwlr.supabase.co/functions/v1/payhere-notify';

export const PAYHERE_EDGE_FUNCTION_URL = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-payhere-hash`
  : 'https://ivbsqrpegqqknepwtwlr.supabase.co/functions/v1/create-payhere-hash';

// PAYHERE_SANDBOX_MERCHANT_ID removed — merchant_id comes only from create-payhere-hash Edge Function

export type PayHereHashRequest =
  | { kind: 'subscription'; tier: 'pro' | 'studio' | string }
  | { kind: 'order'; orderRowId: string | number };

export interface PayHereHashResult {
  merchant_id: string;
  order_id: string;
  amount: string;
  currency: string;
  hash: string;
  stage?: string | null;
  amount_exceeds_50k?: boolean;
}

export interface PayHerePaymentParams {
  sandbox: boolean;
  merchant_id: string;
  return_url?: string;
  cancel_url?: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
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
 * Calls create-payhere-hash Edge Function with ONLY { kind: 'subscription', tier }
 * or { kind: 'order', orderRowId }. Never sends order_id, amount, or currency.
 * Returns merchant_id, order_id, amount, currency, hash.
 */
export async function createPayHereHash(req: PayHereHashRequest): Promise<PayHereHashResult> {
  const sessionRes = await supabase.auth.getSession();
  const token = sessionRes.data?.session?.access_token || '';

  // 1. First attempt: call supabase.functions.invoke
  try {
    const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
      body: req,
    });

    if (!error && data) {
      // Amount exceeds limit: return the flag so caller can show bank transfer instead
      if (data.amount_exceeds_50k) {
        return {
          merchant_id: String(data.merchant_id || ''),
          order_id: String(data.order_id),
          amount: String(data.amount),
          currency: String(data.currency),
          hash: String(data.hash || ''),
          stage: data.stage ?? null,
          amount_exceeds_50k: true,
        };
      }
      if (data.hash && data.merchant_id && data.order_id && data.amount && data.currency) {
        return {
          merchant_id: String(data.merchant_id),
          order_id: String(data.order_id),
          amount: String(data.amount),
          currency: String(data.currency),
          hash: String(data.hash),
          stage: data.stage ?? null,
          amount_exceeds_50k: false,
        };
      }
    }
    if (error) {
      console.warn('[createPayHereHash] supabase.functions.invoke error:', error);
    }
  } catch (err) {
    console.warn('[createPayHereHash] supabase.functions.invoke exception, trying direct endpoint:', err);
  }

  // 2. Second attempt: direct fetch to the Edge Function endpoint
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(PAYHERE_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(req),
    });

    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (data.amount_exceeds_50k) {
          return {
            merchant_id: String(data.merchant_id || ''),
            order_id: String(data.order_id),
            amount: String(data.amount),
            currency: String(data.currency),
            hash: String(data.hash || ''),
            stage: data.stage ?? null,
            amount_exceeds_50k: true,
          };
        }
        if (data.hash && data.merchant_id && data.order_id && data.amount && data.currency) {
          return {
            merchant_id: String(data.merchant_id),
            order_id: String(data.order_id),
            amount: String(data.amount),
            currency: String(data.currency),
            hash: String(data.hash),
            stage: data.stage ?? null,
            amount_exceeds_50k: false,
          };
        }
      }
    } else {
      console.warn('[createPayHereHash] Direct endpoint responded with status:', res.status);
    }
  } catch (err) {
    console.warn('[createPayHereHash] Direct edge function call error:', err);
  }

  // If both Edge Function attempts fail, throw — never generate a local hash or fallback.
  // The only way to start a PayHere checkout is with values returned by create-payhere-hash.
  throw new Error('Could not reach create-payhere-hash Edge Function');
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

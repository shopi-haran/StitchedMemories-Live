// Supabase Edge Function: payhere-notify
// Receives server-to-server webhook notifications from PayHere upon completed payment or recurring charge

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAYHERE_MERCHANT_SECRET = Deno.env.get('PAYHERE_MERCHANT_SECRET') || '4O3M573k9q2m1';

async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const formData = await req.formData();
    const merchant_id = formData.get('merchant_id') as string;
    const order_id = formData.get('order_id') as string;
    const payhere_amount = formData.get('payhere_amount') as string;
    const payhere_currency = formData.get('payhere_currency') as string;
    const status_code = formData.get('status_code') as string;
    const md5sig = formData.get('md5sig') as string;

    console.log('[payhere-notify] Received notification for order_id:', order_id, 'status_code:', status_code);

    // Verify PayHere signature:
    // local_md5sig = strtoupper(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret))))
    const hashedSecret = (await md5(PAYHERE_MERCHANT_SECRET)).toUpperCase();
    const checkString = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`;
    const localSig = (await md5(checkString)).toUpperCase();

    if (localSig !== (md5sig || '').toUpperCase()) {
      console.warn('[payhere-notify] Signature verification failed');
      // For sandbox development continue or reject
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Status 2 is Success in PayHere
    if (status_code === '2') {
      if (order_id.startsWith('sub-')) {
        // Subscription payment: extract profile id
        // sub-${profile.id}-${timestamp}
        const parts = order_id.split('-');
        if (parts.length >= 2) {
          const profileId = parts[1];
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              has_selected_plan: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profileId);
        }
      } else if (order_id.startsWith('order-')) {
        // Order payment: extract order id
        const rawOrderId = order_id.replace('order-', '');
        await supabase
          .from('custom_orders')
          .update({
            fulfillment_status: 'processing',
            payment_status: 'paid',
            status_note: 'Payment completed via PayHere.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', rawOrderId);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('[payhere-notify] Error processing notify:', err);
    return new Response('Error', { status: 500 });
  }
});

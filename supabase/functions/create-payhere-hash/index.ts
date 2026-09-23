// Supabase Edge Function: create-payhere-hash
// Generates secure PayHere checkout hash for both one-time payments and recurring subscriptions.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const PAYHERE_MERCHANT_ID = Deno.env.get('PAYHERE_MERCHANT_ID') || '1211149';
const PAYHERE_MERCHANT_SECRET = Deno.env.get('PAYHERE_MERCHANT_SECRET') || '4O3M573k9q2m1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, amount, currency = 'USD' } = await req.json();

    if (!order_id || amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: order_id and amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const formattedAmount = numericAmount.toFixed(2);

    // PayHere hash formula:
    // hash = strtoupper(md5(merchant_id + order_id + number_format(amount, 2, '.', '') + currency + strtoupper(md5(merchant_secret))))
    const hashedSecret = (await md5(PAYHERE_MERCHANT_SECRET)).toUpperCase();
    const rawString = `${PAYHERE_MERCHANT_ID}${order_id}${formattedAmount}${currency}${hashedSecret}`;
    const hash = (await md5(rawString)).toUpperCase();

    return new Response(
      JSON.stringify({
        hash,
        merchant_id: PAYHERE_MERCHANT_ID,
        order_id,
        amount: formattedAmount,
        currency,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[create-payhere-hash] Error generating hash:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

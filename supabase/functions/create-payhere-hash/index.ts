// Supabase Edge Function: create-payhere-hash
// Generates secure PayHere checkout hash for both one-time payments and recurring subscriptions.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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
    // 1. JWT verification / Authenticated User check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[create-payhere-hash] Failure: Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.log('[create-payhere-hash] Failure: Invalid or expired JWT', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Parse request body: takes kind ('subscription' | 'order') and tier / orderRowId
    const body = await req.json().catch(() => ({}));
    const { kind, tier, orderRowId } = body;

    if (!kind || (kind !== 'subscription' && kind !== 'order')) {
      console.log('[create-payhere-hash] Failure: Invalid or missing kind:', kind);
      return new Response(
        JSON.stringify({ error: "Invalid kind. Must be 'subscription' or 'order'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let calculatedAmount = 0;
    let order_id = '';
    const currency = 'LKR';
    const PAYMENT_LIMIT_LKR = 50000;
    let amountExceedsLimit = false;
    let period: string | null = null;
    let stage: string | null = null;

    if (kind === 'subscription') {
      const normalizedTier = (tier || '').toLowerCase().trim();
      if (!normalizedTier || normalizedTier === 'free') {
        console.log('[create-payhere-hash] Failure: Unknown or free subscription tier requested:', tier);
        return new Response(
          JSON.stringify({ error: "Invalid subscription tier. 'free' cannot be purchased." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch price from subscription_plans table using service role client
      const { data: planData, error: planError } = await adminClient
        .from('subscription_plans')
        .select('tier, price_lkr, yearly_price_lkr')
        .eq('tier', normalizedTier)
        .maybeSingle();

      if (planError) {
        console.log('[create-payhere-hash] Failure: Error querying subscription_plans table:', planError);
        return new Response(
          JSON.stringify({ error: 'Database error fetching plan' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine period from body
      const requestPeriod = (body as any)?.period || 'monthly';
      period = requestPeriod;

      let price = planData?.price_lkr;
      if (!price) {
        // Known fallback if table row doesn't exist yet
        const defaultPriceMap: Record<string, number> = {
          pro: 2700,
          studio: 5700,
        };
        price = defaultPriceMap[normalizedTier];
      }

      if (!price || isNaN(price) || price <= 0) {
        console.log('[create-payhere-hash] Failure: Unknown subscription tier or price not found:', normalizedTier);
        return new Response(
          JSON.stringify({ error: `Tier '${tier}' is not a valid purchasable plan` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle yearly billing: use yearly_price_lkr from database
      if (period === 'yearly') {
        const yearlyPrice = planData?.yearly_price_lkr != null ? Number(planData.yearly_price_lkr) : null;
        if (yearlyPrice && yearlyPrice > 0) {
          calculatedAmount = yearlyPrice;
        } else {
          // Fallback: calculate 20% discount × 12 months
          calculatedAmount = Math.round(Number(price) * 0.8 * 12);
        }
      } else {
        calculatedAmount = Number(price);
      }

      order_id = `sub-${user.id}-${Date.now()}`;
    } else if (kind === 'order') {
      if (!orderRowId) {
        console.log('[create-payhere-hash] Failure: Missing orderRowId for kind=order');
        return new Response(
          JSON.stringify({ error: 'Missing orderRowId for order payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up order from orders or custom_orders table and verify ownership
      const cleanOrderId = String(orderRowId).replace(/^order_/, '');
      let orderRow: any = null;

      const { data: oData, error: oError } = await adminClient
        .from('orders')
        .select('*')
        .eq('id', cleanOrderId)
        .maybeSingle();

      if (!oError && oData) {
        orderRow = oData;
      } else {
        const { data: coData, error: coError } = await adminClient
          .from('custom_orders')
          .select('*')
          .eq('id', cleanOrderId)
          .maybeSingle();
        if (!coError && coData) {
          orderRow = coData;
        }
      }

      if (!orderRow) {
        console.log('[create-payhere-hash] Failure: Order not found for id:', cleanOrderId);
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the row belongs to the authenticated user
      const orderUserId = orderRow.user_id || orderRow.profile_id;
      const orderEmail = orderRow.customer_email || orderRow.email;
      const isOwner =
        (orderUserId && String(orderUserId).toLowerCase() === String(user.id).toLowerCase()) ||
        (orderEmail && user.email && String(orderEmail).toLowerCase() === String(user.email).toLowerCase());

      if (!isOwner) {
        console.log('[create-payhere-hash] Failure: User', user.id, 'does not own order', cleanOrderId);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You do not own this order' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Read amount from the orders table (the accepted quote)
      const details = typeof orderRow.request_details === 'string'
        ? (() => { try { return JSON.parse(orderRow.request_details); } catch { return {}; } })()
        : orderRow.request_details || {};
      const quoteObj = typeof orderRow.quote === 'string'
        ? (() => { try { return JSON.parse(orderRow.quote); } catch { return {}; } })()
        : orderRow.quote || details.quote || {};

      const rawAmount =
        orderRow.total_amount ??
        quoteObj?.total_amount ??
        orderRow.quoted_price ??
        details.quoted_price ??
        0;

      const orderType = (orderRow.order_type || '').toLowerCase();
      const isCustomStitched = orderType === 'custom_stitched';

      // Determine stage for custom_stitched orders
      if (isCustomStitched) {
        const progressPercent = Number(orderRow.progress_percent || 0);
        const existingAmountPaid = Number(orderRow.amount_paid_lkr || 0);
        const totalCents = Math.round(calculatedAmount * 100);
        const advanceCents = Math.floor(totalCents / 2);
        const advanceLkr = advanceCents / 100;

        if (progressPercent >= 100 && existingAmountPaid >= advanceLkr) {
          // Balance stage
          stage = 'balance';
          calculatedAmount = calculatedAmount - Math.max(existingAmountPaid, advanceLkr);
          order_id = `order-${orderRow.id}-bal`;
        } else {
          // Deposit stage (50% advance)
          stage = 'deposit';
          calculatedAmount = advanceLkr;
          order_id = `order-${orderRow.id}-dep`;
        }
      } else {
        stage = 'full';
        order_id = `order-${orderRow.id}`;
      }

      if (!calculatedAmount || calculatedAmount <= 0) {
        console.log('[create-payhere-hash] Failure: Order does not have a valid quoted amount:', cleanOrderId, rawAmount);
        return new Response(
          JSON.stringify({ error: 'Order has no valid quote amount to pay' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check payment limit - flag but do not reject
      if (calculatedAmount > PAYMENT_LIMIT_LKR) {
        amountExceedsLimit = true;
      }
    }

    const formattedAmount = calculatedAmount.toFixed(2);

    // 3. Upsert row into pending_payments via service_role client
    const { error: upsertError } = await adminClient
      .from('pending_payments')
      .upsert(
        {
          order_id,
          profile_id: user.id,
          kind,
          tier: kind === 'subscription' ? (tier || '').toLowerCase().trim() : null,
          period: period,
          stage: stage,
          amount: formattedAmount,
          currency,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'order_id' }
      );

    if (upsertError) {
      console.log('[create-payhere-hash] Failure: Error upserting into pending_payments:', upsertError);
      // We log but do not prevent payment hash generation if table schema allows or differs
    }

    // 4. Calculate MD5 hash
    // hash = strtoupper(md5(merchant_id + order_id + number_format(amount, 2, '.', '') + currency + strtoupper(md5(merchant_secret))))
    const hashedSecret = (await md5(PAYHERE_MERCHANT_SECRET)).toUpperCase();
    const rawString = `${PAYHERE_MERCHANT_ID}${order_id}${formattedAmount}${currency}${hashedSecret}`;
    const hash = (await md5(rawString)).toUpperCase();

    // 5. Return merchant_id, order_id, amount (2-decimal string), currency, hash
    return new Response(
      JSON.stringify({
        merchant_id: PAYHERE_MERCHANT_ID,
        order_id,
        amount: formattedAmount,
        currency,
        hash,
        stage: stage || null,
        amount_exceeds_50k: amountExceedsLimit,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.log('[create-payhere-hash] Failure: Unexpected exception:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

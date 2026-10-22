// Supabase Edge Function: create-payhere-hash
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// No fallback values: a missing secret must fail, never fall back to a value stored in code
const MERCHANT_ID = Deno.env.get("PAYHERE_MERCHANT_ID");
const MERCHANT_SECRET = Deno.env.get("PAYHERE_MERCHANT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const CURRENCY = "LKR";
const TIER_RANK: Record<string, number> = { free: 0, pro: 1, studio: 2 };

// Only these order types are paid as 50% advance + balance
const DEPOSIT_ORDER_TYPES = ["custom_stitched"];

// PayHere plan limit per single payment. Set to null once the limit is lifted.
const PAYMENT_LIMIT_LKR: number | null = 50000;

// The balance becomes payable when the stitch tracker reaches 100%
function isBalanceDue(order: any): boolean {
  const progress = Number(order.progress_percent ?? 0);
  return Number.isFinite(progress) && progress >= 100;
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

// Reads the final payable amount from orders.quote (LKR only)
function extractAmount(quote: any): number | null {
  if (quote == null) return null;
  if (typeof quote === "number" || typeof quote === "string") return toNumber(quote);
  if (typeof quote === "object") {
    for (const key of ["total_amount", "total", "amount", "price", "final_price"]) {
      const n = toNumber(quote[key]);
      if (n !== null) return n;
    }
  }
  return null;
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex").toUpperCase();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!MERCHANT_ID || !MERCHANT_SECRET) {
      console.error("create-payhere-hash: PAYHERE_MERCHANT_ID or PAYHERE_MERCHANT_SECRET is not set");
      return json({ error: "Payments are not configured" }, 500);
    }

    // 1. Verify the caller is logged in
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("create-payhere-hash: auth failed", authError);
      return json({ error: "Not authenticated" }, 401);
    }

    // 2. Client sends intent only: never order_id, amount, currency or stage
    const body = await req.json().catch(() => ({}));
    const kind = body.kind;
    let orderId: string;
    let amount: number;
    let tier: string | null = null;
    let period: "monthly" | "yearly" | null = null;
    let stage: "full" | "deposit" | "balance" | null = null;

    if (kind === "subscription") {
      tier = String(body.tier ?? "").toLowerCase().trim();

      const rawPeriod = body.period === undefined ? "monthly" : String(body.period).toLowerCase();
      if (rawPeriod !== "monthly" && rawPeriod !== "yearly") {
        console.error("create-payhere-hash: invalid period", { period: body.period });
        return json({ error: "Invalid period" }, 400);
      }
      period = rawPeriod;

      const { data: plan, error: planErr } = await admin
        .from("subscription_plans")
        .select("price_lkr, yearly_price_lkr, active")
        .eq("tier", tier)
        .maybeSingle();

      if (planErr) {
        console.error("create-payhere-hash: plan lookup error", planErr);
        return json({ error: "Could not load plan" }, 500);
      }

      // Prices come only from the database. A null yearly price means annual is switched off.
      const price = plan
        ? Number(period === "yearly" ? plan.yearly_price_lkr : plan.price_lkr)
        : 0;
      if (!plan || !plan.active || !Number.isFinite(price) || price <= 0) {
        console.error("create-payhere-hash: unknown, inactive or unpriced tier/period", { tier, period });
        return json({ error: "Invalid tier" }, 400);
      }

      // Block downgrades while a higher paid plan is still running
      const { data: prof } = await admin
        .from("profiles")
        .select("subscription_tier, subscription_status, access_until")
        .eq("id", user.id)
        .maybeSingle();
      const stillActive =
        prof?.subscription_status === "active" &&
        prof?.access_until &&
        new Date(prof.access_until).getTime() > Date.now();
      if (
        stillActive &&
        (TIER_RANK[tier] ?? 0) < (TIER_RANK[String(prof.subscription_tier)] ?? 0)
      ) {
        console.error("create-payhere-hash: downgrade blocked", {
          current: prof.subscription_tier,
          requested: tier,
        });
        return json({ error: "Downgrades are not supported" }, 400);
      }

      amount = price;
      orderId = `sub-${user.id}-${Date.now()}`;
    } else if (kind === "order") {
      const orderRowId = String(body.orderRowId ?? "").replace(/^order_/, "");
      if (!orderRowId) return json({ error: "Missing orderRowId" }, 400);

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("*")
        .eq("id", orderRowId)
        .maybeSingle();

      if (orderErr || !order) {
        console.error("create-payhere-hash: order lookup failed", { orderRowId, orderErr });
        return json({ error: "Order not found" }, 404);
      }

      const ownerId = order.user_id ?? order.customer_id ?? order.profile_id ?? null;
      if (ownerId !== user.id) {
        console.error("create-payhere-hash: order not owned by user", { orderRowId });
        return json({ error: "Forbidden" }, 403);
      }
      if (order.payment_status === "paid") {
        return json({ error: "Order already paid" }, 400);
      }

      // Currency guard: only LKR quotes may be charged
      const quoteCurrency =
        order.quote && typeof order.quote === "object" ? order.quote.currency : null;
      if (quoteCurrency !== "LKR") {
        console.error("create-payhere-hash: quote is not in LKR", { orderRowId, quoteCurrency });
        return json({ error: "Quote must be in LKR" }, 400);
      }

      // The accepted quote is the only source of the total (never the legacy total_amount column)
      const q = extractAmount(order.quote);
      if (!q || q <= 0) {
        console.error("create-payhere-hash: no valid quote amount", {
          orderRowId,
          quoteShape: typeof order.quote === "object" ? Object.keys(order.quote ?? {}) : typeof order.quote,
        });
        return json({ error: "Order has no accepted quote" }, 400);
      }

      // Work in whole cents so deposit + balance always equal the total exactly
      const totalCents = Math.round(q * 100);
      const depositCents = Math.floor(totalCents / 2);
      let amountCents: number;

      if (!DEPOSIT_ORDER_TYPES.includes(order.order_type)) {
        // Kits and every other order type: pay in full
        stage = "full";
        amountCents = totalCents;
      } else if (order.payment_status === "deposit_paid") {
        // Stitched order, second payment: only once the stitch tracker is at 100%
        if (!isBalanceDue(order)) {
          console.error("create-payhere-hash: balance not due yet", {
            orderRowId,
            progress: order.progress_percent,
          });
          return json({ error: "Balance is not due yet" }, 400);
        }
        // "deposit_paid" means at least the advance was received, even if the admin
        // recorded it by hand and left amount_paid_lkr at 0
        const paidCents = Math.max(
          Math.round(Number(order.amount_paid_lkr ?? 0) * 100),
          depositCents
        );
        amountCents = totalCents - paidCents;
        if (amountCents <= 0) {
          console.error("create-payhere-hash: nothing left to pay", { orderRowId });
          return json({ error: "Nothing left to pay" }, 400);
        }
        stage = "balance";
      } else {
        // Stitched order, first payment: 50% of the final total, rounded down to the cent
        stage = "deposit";
        amountCents = depositCents;
      }

      amount = amountCents / 100;
      orderId =
        stage === "full"
          ? `order-${order.id}`
          : stage === "deposit"
            ? `order-${order.id}-dep`
            : `order-${order.id}-bal`;
    } else {
      console.error("create-payhere-hash: invalid kind", { kind });
      return json({ error: "Invalid kind" }, 400);
    }

    const formattedAmount = amount.toFixed(2);

    // Per-payment limit of the current PayHere plan: same rule for subscriptions and orders.
    // No hash and no pending row are created; the UI offers bank transfer instead.
    if (PAYMENT_LIMIT_LKR !== null && amount > PAYMENT_LIMIT_LKR) {
      console.error("create-payhere-hash: amount exceeds payment limit", { kind, orderId, amount });
      return json({
        amount_exceeds_50k: true,
        merchant_id: null,
        order_id: orderId,
        amount: formattedAmount,
        currency: CURRENCY,
        hash: null,
        stage,
        tier,
        period,
      });
    }

    // 3. Don't reopen an already-completed payment
    const { data: existing } = await admin
      .from("pending_payments")
      .select("status")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing?.status === "completed") {
      return json({ error: "Payment already completed" }, 400);
    }

    // 4. Record what the webhook should expect. If this fails, no hash is issued.
    const { error: upsertErr } = await admin.from("pending_payments").upsert({
      order_id: orderId,
      profile_id: user.id,
      kind,
      tier,
      period,
      stage,
      amount: formattedAmount,
      currency: CURRENCY,
      status: "pending",
    });
    if (upsertErr) {
      console.error("create-payhere-hash: pending upsert failed", upsertErr);
      return json({ error: "Could not start payment" }, 500);
    }

    // 5. PayHere hash
    const hash = md5(`${MERCHANT_ID}${orderId}${formattedAmount}${CURRENCY}${md5(MERCHANT_SECRET)}`);

    console.log("create-payhere-hash issued", {
      merchant_id: MERCHANT_ID,
      order_id: orderId,
      amount: formattedAmount,
      currency: CURRENCY,
      period,
      stage,
    });

    return json({
      amount_exceeds_50k: false,
      merchant_id: MERCHANT_ID,
      order_id: orderId,
      amount: formattedAmount,
      currency: CURRENCY,
      hash,
      stage,
      tier,
      period,
    });
  } catch (err) {
    console.error("create-payhere-hash error:", err);
    return json({ error: "Server error" }, 500);
  }
});
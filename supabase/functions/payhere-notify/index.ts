// Supabase Edge Function: payhere-notify
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHash } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// No fallback values: a missing secret must fail, never fall back to a value stored in code
const MERCHANT_SECRET = Deno.env.get("PAYHERE_MERCHANT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SUB_RE =
  /^sub-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)$/i;
const ORDER_RE =
  /^order-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-(dep|bal))?$/i;
const DAY_MS = 24 * 3600 * 1000;

function md5Upper(input: string): string {
  return createHash("md5").update(input).digest("hex").toUpperCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function releaseClaim(orderId: string) {
  const { error } = await admin
    .from("pending_payments")
    .update({ status: "pending", completed_at: null })
    .eq("order_id", orderId);
  if (error) console.error("payhere-notify: failed to release claim", error);
}

serve(async (req) => {
  try {
    if (!MERCHANT_SECRET) {
      console.error("payhere-notify: PAYHERE_MERCHANT_SECRET is not set");
      return new Response("Not configured", { status: 500 });
    }

    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      token,
      card_no,
      method,
    } = params;

    // Safe log: no cardholder name, card number or expiry
    console.log(
      "payhere-notify received:",
      JSON.stringify({
        order_id,
        status_code,
        payhere_amount,
        payhere_currency,
        method,
        has_token: Boolean(token),
        has_card_no: Boolean(card_no),
      })
    );

    // 1. Signature check
    const expectedSig = md5Upper(
      `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${md5Upper(MERCHANT_SECRET)}`
    );
    if (expectedSig !== (md5sig ?? "").toUpperCase()) {
      console.error("payhere-notify: signature mismatch", { order_id });
      return new Response("Invalid signature", { status: 401 });
    }

    // 2. Only successful payments
    if (status_code !== "2") {
      console.log("payhere-notify: non-success status", { order_id, status_code });
      return new Response("OK", { status: 200 });
    }

    // 3. Look up what we expected
    const { data: pending, error: pendErr } = await admin
      .from("pending_payments")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (pendErr) {
      console.error("payhere-notify: pending lookup error", pendErr);
      return new Response("Database error", { status: 500 });
    }
    if (!pending) {
      console.error("payhere-notify: MANUAL REVIEW no pending payment for order_id", { order_id });
      return new Response("Unknown order", { status: 400 });
    }
    if (pending.status === "completed") {
      console.log("payhere-notify: already completed", { order_id });
      return new Response("OK", { status: 200 });
    }

    // 4. Amount + currency must match what the server expected
    const paid = Number(payhere_amount).toFixed(2);
    const expected = Number(pending.amount).toFixed(2);
    if (paid !== expected || payhere_currency !== pending.currency) {
      console.error("payhere-notify: MANUAL REVIEW amount/currency mismatch", {
        order_id, paid, expected, payhere_currency, expectedCurrency: pending.currency,
      });
      return new Response("Amount mismatch", { status: 400 });
    }

    // 5. Atomically claim it, so concurrent PayHere retries can't double-apply
    const { data: claimed, error: claimErr } = await admin
      .from("pending_payments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("order_id", order_id)
      .eq("status", "pending")
      .select("order_id");

    if (claimErr) {
      console.error("payhere-notify: claim failed", claimErr);
      return new Response("Database error", { status: 500 });
    }
    if (!claimed || claimed.length === 0) {
      console.log("payhere-notify: claimed by another request", { order_id });
      return new Response("OK", { status: 200 });
    }

    // 6. Apply the payment. Any failure releases the claim and returns 500 so PayHere retries.
    if (pending.kind === "subscription") {
      const m = order_id.match(SUB_RE);
      if (!m || m[1] !== pending.profile_id) {
        console.error("payhere-notify: order_id/profile mismatch", { order_id });
        await releaseClaim(order_id);
        return new Response("Bad order_id", { status: 400 });
      }
      const profileId = m[1];

      const { data: profile, error: profErr } = await admin
        .from("profiles")
        .select("access_until")
        .eq("id", profileId)
        .maybeSingle();
      if (profErr) {
        console.error("payhere-notify: profile fetch failed", profErr);
        await releaseClaim(order_id);
        return new Response("Database error", { status: 500 });
      }

      // 365 days for yearly, 30 for monthly (from the stored period, never guessed from the amount).
      // Extend from the current expiry if it is still in the future.
      const periodMs = (pending.period === "yearly" ? 365 : 30) * DAY_MS;
      const now = Date.now();
      const currentEnd = profile?.access_until ? new Date(profile.access_until).getTime() : 0;
      const base = currentEnd > now ? currentEnd : now;
      const accessUntil = new Date(base + periodMs).toISOString();

      const { error } = await admin
        .from("profiles")
        .update({
          subscription_tier: pending.tier,
          subscription_status: "active",
          has_selected_plan: true,
          access_until: accessUntil,
          payhere_customer_token: token || null,
          payment_last4: card_no ? card_no.slice(-4) : null,
          payment_brand: method || null,
        })
        .eq("id", profileId);

      if (error) {
        console.error("payhere-notify: failed to update profile", error);
        await releaseClaim(order_id);
        return new Response("Database error", { status: 500 });
      }
    } else if (pending.kind === "order") {
      const m = order_id.match(ORDER_RE);
      if (!m) {
        console.error("payhere-notify: bad order id format", { order_id });
        await releaseClaim(order_id);
        return new Response("Bad order_id", { status: 400 });
      }
      const orderRowId = m[1];
      const stage: string = pending.stage ?? "full";

      const { data: orderRow, error: fetchError } = await admin
        .from("orders")
        .select("order_type, payment_status, amount_paid_lkr")
        .eq("id", orderRowId)
        .maybeSingle();

      if (fetchError || !orderRow) {
        console.error("payhere-notify: order not found", { orderRowId, fetchError });
        await releaseClaim(order_id);
        return new Response("Order not found", { status: 404 });
      }

      const nowIso = new Date().toISOString();
      const payAmount = Number(pending.amount);
      const newPaidTotal = round2(Number(orderRow.amount_paid_lkr ?? 0) + payAmount);
      let patch: Record<string, unknown>;

      if (stage === "deposit") {
        if (orderRow.payment_status === "deposit_paid" || orderRow.payment_status === "paid") {
          console.error("payhere-notify: MANUAL REVIEW duplicate deposit", { order_id, status: orderRow.payment_status });
          return new Response("OK", { status: 200 });
        }
        patch = {
          payment_status: "deposit_paid",
          fulfillment_status: "confirmed",
          deposit_paid_at: nowIso,
          amount_paid_lkr: newPaidTotal,
        };
      } else if (stage === "balance") {
        if (orderRow.payment_status !== "deposit_paid") {
          console.error("payhere-notify: MANUAL REVIEW balance without deposit", { order_id, status: orderRow.payment_status });
          return new Response("OK", { status: 200 });
        }
        // fulfillment_status is left alone: the admin controls it
        patch = {
          payment_status: "paid",
          balance_paid_at: nowIso,
          amount_paid_lkr: newPaidTotal,
        };
      } else {
        if (orderRow.payment_status === "paid") {
          console.error("payhere-notify: MANUAL REVIEW order already paid", { order_id });
          return new Response("OK", { status: 200 });
        }
        patch = {
          payment_status: "paid",
          fulfillment_status: orderRow.order_type === "store" ? "received" : "confirmed",
          amount_paid_lkr: newPaidTotal,
        };
      }

      const { error } = await admin
        .from("orders")
        .update({ ...patch, updated_at: nowIso })
        .eq("id", orderRowId);

      if (error) {
        console.error("payhere-notify: failed to update order", error);
        await releaseClaim(order_id);
        return new Response("Database error", { status: 500 });
      }
    } else {
      console.error("payhere-notify: unknown kind", { kind: pending.kind });
      await releaseClaim(order_id);
      return new Response("Bad kind", { status: 400 });
    }

    console.log("payhere-notify: applied", {
      order_id,
      kind: pending.kind,
      stage: pending.stage,
      period: pending.period,
    });
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("payhere-notify error:", err);
    return new Response("Server error", { status: 500 });
  }
});
// Supabase Edge Function: notify-contact-message
// Sends an email notification to stitchedmemoriies@gmail.com whenever a new contact_messages row is inserted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'stitchedmemoriies@gmail.com';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Stitched Memories <notifications@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[notify-contact-message] Received webhook payload:', JSON.stringify(payload));

    // Support both Supabase Database Webhook payload ({ record: { ... } }) and direct invoke
    const record = payload.record || payload;

    const name = record.name || 'Anonymous Crafter';
    const email = record.email || 'No email provided';
    const inquiryType = record.inquiry_type || record.inquiryType || 'General Inquiry';
    const subject = record.subject || `Inquiry from ${name}`;
    const message = record.message || 'No message content';
    const createdAt = record.created_at ? new Date(record.created_at).toLocaleString() : new Date().toLocaleString();

    if (!RESEND_API_KEY) {
      console.warn('[notify-contact-message] RESEND_API_KEY is not configured in Supabase secrets.');
      return new Response(
        JSON.stringify({
          success: false,
          warning: 'RESEND_API_KEY missing from Supabase secrets. Please set RESEND_API_KEY in Supabase dashboard.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Prepare HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F4EE; margin: 0; padding: 24px; color: #1D231E; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E8E1D2; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #FAF6EE; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; background-color: #FFF3EB; color: #E06C38; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 8px; }
    .title { margin: 0; font-size: 22px; font-weight: bold; color: #1D231E; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .meta-table td { padding: 8px 0; font-size: 14px; vertical-align: top; }
    .meta-label { font-weight: bold; color: #5A6659; width: 120px; }
    .meta-value { color: #1D231E; }
    .message-box { background-color: #FAF6EE; border: 1px solid #E8E1D2; border-radius: 12px; padding: 20px; font-size: 15px; line-height: 1.6; color: #1D231E; white-space: pre-wrap; margin-bottom: 28px; }
    .button { display: inline-block; background-color: #E06C38; color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 10px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8E1D2; font-size: 12px; color: #7A8679; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">New Contact Message</div>
      <h1 class="title">You received a new inquiry on Stitched Memories</h1>
    </div>

    <table class="meta-table">
      <tr>
        <td class="meta-label">From:</td>
        <td class="meta-value"><strong>${name}</strong> (&lt;<a href="mailto:${email}">${email}</a>&gt;)</td>
      </tr>
      <tr>
        <td class="meta-label">Topic:</td>
        <td class="meta-value"><strong>${inquiryType}</strong></td>
      </tr>
      <tr>
        <td class="meta-label">Subject:</td>
        <td class="meta-value">${subject}</td>
      </tr>
      <tr>
        <td class="meta-label">Received At:</td>
        <td class="meta-value">${createdAt}</td>
      </tr>
    </table>

    <div style="font-weight: bold; font-size: 13px; color: #5A6659; text-transform: uppercase; margin-bottom: 8px;">Message Content:</div>
    <div class="message-box">${message}</div>

    <div style="text-align: center;">
      <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" class="button">Reply directly to ${name}</a>
    </div>

    <div class="footer">
      Stitched Memories Studio Notification System • <a href="https://stitchedmemories.com/admin" style="color: #5A6659;">Open Admin Dashboard</a>
    </div>
  </div>
</body>
</html>
`;

    const textBody = `New Contact Message on Stitched Memories\n\n` +
      `From: ${name} (${email})\n` +
      `Topic: ${inquiryType}\n` +
      `Subject: ${subject}\n` +
      `Date: ${createdAt}\n\n` +
      `Message:\n${message}\n\n` +
      `Reply directly to: ${email}`;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_NOTIFICATION_EMAIL],
        reply_to: email,
        subject: `[Contact Inquiry] ${subject} - from ${name}`,
        html: htmlBody,
        text: textBody,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[notify-contact-message] Resend API error:', resendData);
      return new Response(JSON.stringify({ success: false, error: resendData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('[notify-contact-message] Email sent successfully:', resendData);

    return new Response(JSON.stringify({ success: true, resendId: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[notify-contact-message] Error handling request:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

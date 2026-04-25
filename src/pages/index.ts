import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'PEAK \'25 Meetup <noreply@yourdomain.com>' // ← change this

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { registration, status } = await req.json()

  const isApproved = status === 'approved'

  const subject = isApproved
    ? "✅ Your PEAK '25 Meetup ticket is confirmed!"
    : "❌ PEAK '25 Meetup — Payment not verified"

  const html = isApproved ? `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
      .card { background: #fff; max-width: 520px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      .header { background: #030d0e; padding: 32px 28px; text-align: center; }
      .header h1 { color: #00d4e0; font-size: 36px; margin: 0; letter-spacing: 4px; }
      .header p { color: #5a7a7d; font-size: 12px; margin: 6px 0 0; letter-spacing: 2px; text-transform: uppercase; }
      .body { padding: 32px 28px; }
      .greeting { font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #111; }
      .message { color: #555; font-size: 14px; line-height: 1.7; margin-bottom: 24px; }
      .ticket-box { background: #f0fffe; border: 2px solid #00d4e0; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; }
      .ticket-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
      .ticket-value { font-size: 15px; font-weight: bold; color: #111; margin-bottom: 12px; }
      .ticket-id { font-size: 11px; color: #aaa; font-family: monospace; word-break: break-all; }
      .cta { display: block; background: #00d4e0; color: #030d0e; text-decoration: none; font-weight: bold; font-size: 14px; text-align: center; padding: 14px 24px; border-radius: 8px; margin-bottom: 20px; }
      .footer { background: #f9f9f9; padding: 16px 28px; text-align: center; font-size: 11px; color: #aaa; }
    </style></head>
    <body>
    <div class="card">
      <div class="header">
        <h1>PEAK '25</h1>
        <p>Meetup · The Gathering of Future Engineers</p>
      </div>
      <div class="body">
        <div class="greeting">Hi ${registration.full_name.split(' ')[0]}! 🎉</div>
        <div class="message">
          Your payment has been verified and your ticket for <strong>PEAK '25 Meetup</strong> is confirmed!
          Your QR ticket is ready — show it at the entrance to get in.
        </div>
        <div class="ticket-box">
          <div class="ticket-label">Name</div><div class="ticket-value">${registration.full_name}</div>
          <div class="ticket-label">School</div><div class="ticket-value">${registration.school}</div>
          <div class="ticket-label">Food Preference</div><div class="ticket-value" style="text-transform:capitalize">${registration.food_preference}</div>
          <div class="ticket-label" style="margin-top:8px">Ticket ID</div>
          <div class="ticket-id">${registration.ticket_id}</div>
        </div>
        <a href="https://peak25.vercel.app/status" class="cta">View My QR Ticket →</a>
        <div class="message" style="font-size:12px;color:#888">
          Visit <strong>peak25.vercel.app/status</strong> and enter your email to access your QR code anytime.
        </div>
      </div>
      <div class="footer">Pre Engineering Association Kandy · PEAK '25 Meetup</div>
    </div>
    </body></html>
  ` : `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
      .card { background: #fff; max-width: 520px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      .header { background: #030d0e; padding: 32px 28px; text-align: center; }
      .header h1 { color: #00d4e0; font-size: 36px; margin: 0; letter-spacing: 4px; }
      .body { padding: 32px 28px; }
      .message { color: #555; font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
      .note-box { background: #fff5f5; border: 1px solid #ffcccc; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #cc0000; margin-bottom: 20px; }
      .footer { background: #f9f9f9; padding: 16px 28px; text-align: center; font-size: 11px; color: #aaa; }
    </style></head>
    <body>
    <div class="card">
      <div class="header"><h1>PEAK '25</h1></div>
      <div class="body">
        <div class="message"><strong>Hi ${registration.full_name.split(' ')[0]},</strong><br><br>
        Unfortunately, we were unable to verify your payment for PEAK '25 Meetup. Please contact the PEAK organizers for assistance.</div>
        ${registration.admin_note ? `<div class="note-box"><strong>Note from admin:</strong> ${registration.admin_note}</div>` : ''}
        <div class="message" style="font-size:12px;color:#aaa">If you believe this is a mistake, please reply to this email or contact us directly.</div>
      </div>
      <div class="footer">Pre Engineering Association Kandy · PEAK '25 Meetup</div>
    </div>
    </body></html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [registration.email], subject, html }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})

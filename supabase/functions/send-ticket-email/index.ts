import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = "PEAK '25 Meetup <onboarding@resend.dev>"

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { registration, status } = await req.json()
  const isApproved = status === 'approved'
  const subject = isApproved ? "✅ Your PEAK '25 Meetup ticket is confirmed!" : "❌ PEAK '25 Meetup — Payment not verified"

  const qrData = encodeURIComponent(JSON.stringify({ ticket_id: registration.ticket_id, name: registration.full_name, nic: registration.nic }))
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`

  const html = isApproved ? `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:#030d0e;padding:32px 28px;text-align:center">
        <h1 style="color:#00d4e0;font-size:36px;margin:0;letter-spacing:4px">PEAK '25</h1>
        <p style="color:#5a7a7d;font-size:12px;margin:6px 0 0;letter-spacing:2px">MEETUP · THE GATHERING OF FUTURE ENGINEERS</p>
      </div>
      <div style="padding:32px 28px;background:#fff">
        <h2 style="color:#111;margin-bottom:8px">Hi ${registration.full_name.split(' ')[0]}! 🎉</h2>
        <p style="color:#555;line-height:1.7">Your payment has been verified. Here is your QR ticket — show it at the entrance to get in.</p>
        <div style="text-align:center;margin:28px 0">
          <div style="display:inline-block;background:#fff;border:3px solid #00d4e0;border-radius:12px;padding:16px">
            <img src="${qrImageUrl}" width="200" height="200" alt="QR Ticket" style="display:block"/>
          </div>
          <p style="color:#888;font-size:12px;margin-top:10px">Screenshot this QR code for offline access</p>
        </div>
        <div style="background:#f0fffe;border:1px solid #00d4e0;border-radius:10px;padding:20px 24px;margin-bottom:24px">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Name</div>
          <div style="font-size:15px;font-weight:bold;color:#111;margin-bottom:10px">${registration.full_name}</div>
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">School</div>
          <div style="font-size:15px;font-weight:bold;color:#111;margin-bottom:10px">${registration.school}</div>
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Food Preference</div>
          <div style="font-size:15px;font-weight:bold;color:#111;margin-bottom:10px;text-transform:capitalize">${registration.food_preference}</div>
          <div style="font-size:11px;color:#aaa;font-family:monospace;word-break:break-all;margin-top:8px">Ticket ID: ${registration.ticket_id}</div>
        </div>
        <div style="text-align:center">
          <a href="https://peak25.vercel.app/status" style="display:inline-block;background:#00d4e0;color:#030d0e;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:8px">View Ticket Online →</a>
        </div>
      </div>
      <div style="background:#f9f9f9;padding:16px 28px;text-align:center;font-size:11px;color:#aaa">
        Pre Engineering Association Kandy · PEAK '25 Meetup
      </div>
    </div>
  ` : `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="background:#030d0e;padding:32px 28px;text-align:center">
        <h1 style="color:#00d4e0;font-size:36px;margin:0;letter-spacing:4px">PEAK '25</h1>
      </div>
      <div style="padding:32px 28px;background:#fff">
        <h2 style="color:#111">Hi ${registration.full_name.split(' ')[0]},</h2>
        <p style="color:#555;line-height:1.7">Unfortunately we could not verify your payment for PEAK '25 Meetup. Please contact the organizers for assistance.</p>
        ${registration.admin_note ? `<div style="background:#fff5f5;border:1px solid #ffcccc;border-radius:8px;padding:14px 18px;font-size:13px;color:#cc0000"><strong>Note:</strong> ${registration.admin_note}</div>` : ''}
      </div>
      <div style="background:#f9f9f9;padding:16px 28px;text-align:center;font-size:11px;color:#aaa">
        Pre Engineering Association Kandy · PEAK '25 Meetup
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [registration.email], subject, html }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
})

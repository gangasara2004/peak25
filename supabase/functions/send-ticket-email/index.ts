import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = "PEAK '25 Meetup <onboarding@resend.dev>"

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { registration, status } = await req.json()
  const isApproved = status === 'approved'
  const subject = isApproved ? "✅ Your PEAK '25 Meetup ticket is confirmed!" : "❌ PEAK '25 Meetup — Payment not verified"
  const html = isApproved ? `<h2>Hi ${registration.full_name.split(' ')[0]}! 🎉</h2><p>Your payment is verified. Your QR ticket is ready!</p><p><a href="https://peak25.vercel.app/status">View My QR Ticket →</a></p><p>Ticket ID: ${registration.ticket_id}</p>` : `<h2>Hi ${registration.full_name.split(' ')[0]},</h2><p>Unfortunately we could not verify your payment. Please contact the PEAK organizers.${registration.admin_note ? '<br><br><strong>Note:</strong> ' + registration.admin_note : ''}</p>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [registration.email], subject, html }),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
})

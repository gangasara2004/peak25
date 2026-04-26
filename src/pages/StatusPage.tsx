import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, Registration } from '../lib/supabase'

export default function StatusPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reg, setReg] = useState<Registration | null>(null)
  const [searched, setSearched] = useState(false)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email.'); return }
    setError('')
    setLoading(true)
    setSearched(false)
    setReg(null)

    try {
      const { data, error: dbErr } = await supabase
        .from('registrations')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (dbErr || !data) {
        setError('No registration found for this email. Please check and try again.')
      } else {
        setReg(data as Registration)
        setSearched(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 57px)', padding: '48px 20px 60px' }}>
      <div className="container" style={{ maxWidth: 540 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-block',
            background: 'var(--cyan-dim)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            color: 'var(--cyan)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.1em',
            padding: '5px 16px',
            marginBottom: 14,
            textTransform: 'uppercase',
          }}>
            Ticket Status
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            My <span style={{ color: 'var(--cyan)' }}>Ticket</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Enter your registered email to check your status and retrieve your QR ticket.
          </p>
        </div>

        {/* Email lookup form */}
        <div className="card fade-up" style={{ marginBottom: 24 }}>
          <form onSubmit={handleCheck} style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setReg(null) }}
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={loading} style={{ flexShrink: 0 }}>
              {loading ? <div className="spinner" /> : 'Check →'}
            </button>
          </form>
          {error && <div className="alert alert--error" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        {/* Result */}
        {searched && reg && (
          <div className="fade-up">
            {reg.status === 'pending' && <PendingCard reg={reg} />}
            {reg.status === 'approved' && <ApprovedCard reg={reg} />}
            {reg.status === 'rejected' && <RejectedCard reg={reg} />}
          </div>
        )}
      </div>
    </div>
  )
}

function PendingCard({ reg }: { reg: Registration }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
      <div className="badge badge--pending" style={{ marginBottom: 16 }}>Pending Approval</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
        Hi, {reg.full_name.split(' ')[0]}!
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
        Your registration is under review. Our team is verifying your payment slip.
        Once approved, your QR ticket will appear here. Check back soon!
      </p>
      <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
        Registered on {new Date(reg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}

function ApprovedCard({ reg }: { reg: Registration }) {
  const qrValue = JSON.stringify({ ticket_id: reg.ticket_id, name: reg.full_name, nic: reg.nic })

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PEAK '25 Meetup — Ticket</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; color: #000; }
          .ticket { max-width: 400px; margin: 40px auto; border: 2px solid #000; border-radius: 12px; overflow: hidden; }
          .ticket-header { background: #030d0e; color: #fff; padding: 20px; text-align: center; }
          .ticket-header h1 { font-size: 32px; letter-spacing: 4px; color: #00d4e0; }
          .ticket-header p { font-size: 12px; color: #aaa; margin-top: 4px; letter-spacing: 2px; }
          .ticket-body { padding: 24px; text-align: center; }
          .ticket-name { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
          .ticket-details { font-size: 13px; color: #555; margin-bottom: 20px; }
          .ticket-qr { margin: 0 auto; }
          .ticket-id { font-size: 10px; color: #aaa; margin-top: 12px; word-break: break-all; }
          .ticket-footer { background: #f5f5f5; padding: 12px; text-align: center; font-size: 11px; color: #888; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="ticket-header">
            <h1>PEAK '25 Meetup</h1>
            <p>THE GATHERING OF FUTURE ENGINEERS</p>
          </div>
          <div class="ticket-body">
            <div class="ticket-name">${reg.full_name}</div>
            <div class="ticket-details">${reg.school} · District Rank #${reg.district_rank ?? '—'}</div>
            <div class="ticket-qr">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}" width="200" height="200" />
            </div>
            <div class="ticket-id">Ticket ID: ${reg.ticket_id}</div>
          </div>
          <div class="ticket-footer">Pre Engineering Association Kandy · Present this ticket at the entrance</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      {/* Status */}
      <div className="badge badge--approved" style={{ marginBottom: 16 }}>✓ Approved</div>

      {/* Name */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>
        {reg.full_name}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        {reg.school} · District Rank #{reg.district_rank ?? '—'}
      </p>

      {/* QR Code */}
      <div style={{
        display: 'inline-block',
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 0 40px var(--cyan-glow)',
      }}>
        <QRCodeSVG
          value={qrValue}
          size={200}
          level="H"
          includeMargin={false}
        />
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        Show this QR code at the entrance
      </p>

      {/* Ticket ID */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius)',
        padding: '10px 14px',
        marginBottom: 20,
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'var(--text-muted)',
        wordBreak: 'break-all',
      }}>
        #{reg.ticket_id}
      </div>

      {/* Check-in status */}
      {reg.checked_in && (
        <div className="alert alert--success" style={{ marginBottom: 16, fontSize: 13 }}>
          ✓ Checked in at {reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleTimeString('en-GB') : '—'}
        </div>
      )}

      <button className="btn btn--secondary btn--full" onClick={handlePrint} style={{ fontSize: 13 }}>
        🖨 Print Ticket
      </button>
    </div>
  )
}

function RejectedCard({ reg }: { reg: Registration }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
      <div className="badge badge--rejected" style={{ marginBottom: 16 }}>Payment Rejected</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
        Hi, {reg.full_name.split(' ')[0]}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
        Unfortunately your payment could not be verified. Please contact the PEAK organizers for assistance.
      </p>
      {reg.admin_note && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--danger)' }}>
          Note from admin: {reg.admin_note}
        </div>
      )}
    </div>
  )
}

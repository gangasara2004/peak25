import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase, Registration } from '../lib/supabase'

type ScanResult = {
  valid: boolean; attendee?: Registration; message: string; alreadyCheckedIn?: boolean
}

const SCANNER_PASSWORD = import.meta.env.VITE_SCANNER_PASSWORD || 'peak2025scan'

export default function ScannerPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw === SCANNER_PASSWORD) setAuthed(true)
    else setPwError('Incorrect password.')
  }

  if (!authed) return (
    <div style={{ minHeight: 'calc(100vh - 57px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card fade-up" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>QR <span style={{ color: 'var(--cyan)' }}>Scanner</span></h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Enter the scanner password to access check-in.</p>
        {pwError && <div className="alert alert--error" style={{ marginBottom: 12 }}>{pwError}</div>}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><input type="password" placeholder="Scanner password" value={pw} onChange={e => setPw(e.target.value)} /></div>
          <button type="submit" className="btn btn--primary btn--full">Enter Scanner →</button>
        </form>
      </div>
    </div>
  )

  return <Scanner />
}

interface Stats { total: number; approved: number; checkedIn: number }

function Scanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, checkedIn: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = async () => {
    setStatsLoading(true)
    const { data } = await supabase.from('registrations').select('status, checked_in')
    if (data) {
      setStats({
        total: data.length,
        approved: data.filter(r => r.status === 'approved').length,
        checkedIn: data.filter(r => r.checked_in).length,
      })
    }
    setStatsLoading(false)
  }

  useEffect(() => {
    fetchStats()
    // Refresh stats every 30 seconds
    const id = setInterval(fetchStats, 30000)
    return () => clearInterval(id)
  }, [])

  const startScanner = async () => {
    setResult(null)
    const html5Qr = new Html5Qrcode('qr-reader')
    scannerRef.current = html5Qr
    try {
      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => { await html5Qr.stop(); setScanning(false); await processQR(decodedText) },
        undefined
      )
      setScanning(true)
    } catch {
      alert('Could not access camera. Check permissions or use manual entry below.')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) { try { await scannerRef.current.stop() } catch {} }
    setScanning(false)
  }

  useEffect(() => { return () => { stopScanner() } }, [])

  const processQR = async (raw: string) => {
    setProcessing(true); setResult(null)
    try {
      let ticket_id: string
      try { const parsed = JSON.parse(raw); ticket_id = parsed.ticket_id }
      catch { ticket_id = raw.trim() }

      if (!ticket_id) throw new Error('Invalid QR format.')

      const { data: reg, error } = await supabase.from('registrations').select('*').eq('ticket_id', ticket_id).single()
      if (error || !reg) { setResult({ valid: false, message: 'Ticket not found. Invalid or unrecognized QR.' }); setProcessing(false); return }

      const registration = reg as Registration
      if (registration.status !== 'approved') {
        setResult({ valid: false, message: `Ticket not approved. Status: ${registration.status}`, attendee: registration })
        setProcessing(false); return
      }
      if (registration.checked_in) {
        setResult({ valid: false, alreadyCheckedIn: true, attendee: registration, message: `Already checked in at ${registration.checked_in_at ? new Date(registration.checked_in_at).toLocaleTimeString('en-GB') : 'unknown time'}.` })
        setProcessing(false); return
      }

      const { error: updateErr } = await supabase.from('registrations')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() }).eq('id', registration.id)
      if (updateErr) throw new Error('Could not mark check-in.')

      setResult({ valid: true, attendee: registration, message: "Welcome to PEAK '25 Meetup!" })
      fetchStats() // refresh stats after check-in
    } catch (e: unknown) {
      setResult({ valid: false, message: e instanceof Error ? e.message : 'Error processing QR.' })
    } finally { setProcessing(false) }
  }

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault(); if (!manualInput.trim()) return
    await processQR(manualInput.trim()); setManualInput('')
  }

  const checkedInPct = stats.approved > 0 ? Math.round((stats.checkedIn / stats.approved) * 100) : 0

  return (
    <div style={{ minHeight: 'calc(100vh - 57px)', padding: '32px 20px 60px' }}>
      <div className="container" style={{ maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            Check-In <span style={{ color: 'var(--cyan)' }}>Scanner</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>PEAK '25 Meetup · Event Entry</p>
        </div>

        {/* Live Stats */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Live Attendance
            </h4>
            <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: 18 }} title="Refresh">↻</button>
          </div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: 10 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Registered', value: stats.total, color: 'var(--cyan)' },
                  { label: 'Approved', value: stats.approved, color: 'var(--success)' },
                  { label: 'Checked In', value: stats.checkedIn, color: 'var(--yellow)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '12px 8px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>Check-in progress</span>
                  <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>{checkedInPct}%</span>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${checkedInPct}%`, background: 'var(--yellow)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, textAlign: 'right' }}>
                  {stats.checkedIn} / {stats.approved} approved attendees arrived
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scanner */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div id="qr-reader" style={{ width: '100%', display: scanning ? 'block' : 'none', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }} />
          {!scanning && !processing && !result && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📸</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Point camera at attendee's QR ticket.</p>
              <button className="btn btn--primary" onClick={startScanner} style={{ minWidth: 180 }}>Start Camera →</button>
            </div>
          )}
          {scanning && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Scanning… align QR code in frame.</p>
              <button className="btn btn--secondary" onClick={stopScanner} style={{ fontSize: 13 }}>✕ Cancel</button>
            </div>
          )}
          {processing && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Validating ticket…</p>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="card fade-up" style={{
            marginBottom: 20, textAlign: 'center',
            borderColor: result.valid ? 'var(--success)' : result.alreadyCheckedIn ? 'var(--yellow)' : 'var(--danger)',
            background: result.valid ? 'rgba(0,232,150,0.06)' : result.alreadyCheckedIn ? 'rgba(255,190,0,0.06)' : 'rgba(255,77,109,0.06)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{result.valid ? '✅' : result.alreadyCheckedIn ? '⚠️' : '❌'}</div>
            {result.attendee && (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>{result.attendee.full_name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{result.attendee.school}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="badge badge--approved" style={{ textTransform: 'capitalize' }}>{result.attendee.food_preference}</span>
                  <span className="badge" style={{
                    background: result.valid ? 'rgba(0,232,150,0.1)' : 'rgba(255,77,109,0.1)',
                    color: result.valid ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${result.valid ? 'rgba(0,232,150,0.25)' : 'rgba(255,77,109,0.25)'}`,
                  }}>{result.valid ? '✓ Checked In' : 'Not Admitted'}</span>
                </div>
              </>
            )}
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: result.valid ? 'var(--success)' : result.alreadyCheckedIn ? 'var(--yellow)' : 'var(--danger)' }}>
              {result.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={() => { setResult(null); startScanner() }}>Scan Next →</button>
              <button className="btn btn--secondary" onClick={() => setResult(null)} style={{ fontSize: 13 }}>Reset</button>
            </div>
          </div>
        )}

        {/* Manual lookup */}
        <div className="card">
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, marginBottom: 4 }}>Manual Ticket ID Lookup</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14 }}>Use if camera is unavailable. Enter the attendee's ticket UUID.</p>
          <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <input type="text" placeholder="Paste ticket UUID…" value={manualInput} onChange={e => setManualInput(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <button type="submit" className="btn btn--primary" disabled={processing} style={{ flexShrink: 0 }}>
              {processing ? <div className="spinner" /> : 'Check'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

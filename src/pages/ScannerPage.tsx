import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase, Registration } from '../lib/supabase'

type ScanResult = { valid: boolean; attendee?: Registration; message: string; alreadyCheckedIn?: boolean }
type Tab = 'scanner' | 'attendance'
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
    <div className="sc-auth-wrap">
      <div className="card sc-auth-card fade-up">
        <div className="sc-auth-icon">📷</div>
        <h2 className="sc-auth-title">QR <span style={{ color: 'var(--cyan)' }}>Scanner</span></h2>
        <p className="sc-auth-sub">Enter the scanner password to access check-in.</p>
        {pwError && <div className="alert alert--error" style={{ marginBottom: 12 }}>{pwError}</div>}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><input type="password" placeholder="Scanner password" value={pw} onChange={e => setPw(e.target.value)} /></div>
          <button type="submit" className="btn btn--primary btn--full">Enter →</button>
        </form>
      </div>
      <style>{`
        .sc-auth-wrap { min-height: calc(100vh - 57px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .sc-auth-card { max-width: 360px; width: 100%; text-align: center; }
        .sc-auth-icon { font-size: 40px; margin-bottom: 12px; }
        .sc-auth-title { font-family: var(--font-display); font-size: 22px; margin-bottom: 6px; }
        .sc-auth-sub { color: var(--text-muted); font-size: 13px; margin-bottom: 20px; }
      `}</style>
    </div>
  )

  return <ScannerDashboard />
}

function ScannerDashboard() {
  const [tab, setTab] = useState<Tab>('scanner')
  const [attendanceList, setAttendanceList] = useState<Registration[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchAttendance = async () => {
    setAttendanceLoading(true)
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('checked_in', true)
      .order('checked_in_at', { ascending: false })
    setAttendanceList((data as Registration[]) || [])
    setAttendanceLoading(false)
  }

  useEffect(() => {
    if (tab === 'attendance') fetchAttendance()
  }, [tab])

  const exportAttendanceCSV = () => {
    const headers = ['Name', 'Email', 'NIC', 'School', 'District Rank', 'Food', 'Checked In At']
    const rows = attendanceList.map(r => [
      r.full_name, r.email, r.nic, r.school,
      r.district_rank ?? '—', r.food_preference,
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString('en-GB') : '—',
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'peak25-attendance.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = attendanceList.filter(r => {
    const q = search.toLowerCase()
    return !q || r.full_name.toLowerCase().includes(q) || r.nic.toLowerCase().includes(q) || r.school.toLowerCase().includes(q)
  })

  return (
    <div className="sc-dash">
      {/* Header */}
      <div className="sc-header">
        <div>
          <h1 className="sc-header-title">Check-In <span style={{ color: 'var(--cyan)' }}>Dashboard</span></h1>
          <p className="sc-header-sub">PEAK '25 Meetup · Event Entry</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sc-tabs">
        <button className={`sc-tab ${tab === 'scanner' ? 'sc-tab--active' : ''}`} onClick={() => setTab('scanner')}>
          📷 Scanner
        </button>
        <button className={`sc-tab ${tab === 'attendance' ? 'sc-tab--active' : ''}`} onClick={() => setTab('attendance')}>
          📋 Attendance List
        </button>
      </div>

      {tab === 'scanner' && <ScannerPanel onCheckIn={fetchAttendance} />}

      {tab === 'attendance' && (
        <div className="sc-attendance">
          <div className="sc-attendance-toolbar">
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input type="text" placeholder="🔍 Search by name, NIC, school…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 14 }} />
            </div>
            <button className="btn btn--secondary" onClick={fetchAttendance} style={{ fontSize: 13, flexShrink: 0 }}>↻ Refresh</button>
            <button className="btn btn--primary" onClick={exportAttendanceCSV} style={{ fontSize: 13, flexShrink: 0 }}>⬇ Export CSV</button>
          </div>

          {attendanceLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {search ? `No results for "${search}"` : 'No attendees checked in yet.'}
            </div>
          ) : (
            <>
              <div className="sc-attendance-count">
                {filtered.length} attendee{filtered.length !== 1 ? 's' : ''} checked in
              </div>
              <div className="sc-list">
                {filtered.map((r, i) => (
                  <div key={r.id} className="sc-list-item">
                    <div className="sc-list-num">{i + 1}</div>
                    <div className="sc-list-info">
                      <div className="sc-list-name">{r.full_name}</div>
                      <div className="sc-list-meta">
                        {r.school}
                        {r.district_rank && <span className="sc-list-rank">Rank #{r.district_rank}</span>}
                      </div>
                    </div>
                    <div className="sc-list-right">
                      <span className="badge badge--approved" style={{ textTransform: 'capitalize', fontSize: 11 }}>{r.food_preference}</span>
                      <div className="sc-list-time">
                        {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .sc-dash { min-height: calc(100vh - 57px); padding: 28px 16px 60px; max-width: 680px; margin: 0 auto; }
        .sc-header { margin-bottom: 24px; }
        .sc-header-title { font-family: var(--font-display); font-size: 26px; font-weight: 800; }
        .sc-header-sub { color: var(--text-muted); font-size: 13px; margin-top: 2px; }
        .sc-tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
        .sc-tab { background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); cursor: pointer; font-family: var(--font-body); font-size: 14px; font-weight: 500; padding: 10px 16px; margin-bottom: -1px; transition: all 0.2s; }
        .sc-tab:hover { color: var(--text); }
        .sc-tab--active { color: var(--cyan); border-bottom-color: var(--cyan); }
        .sc-attendance { display: flex; flex-direction: column; gap: 14px; }
        .sc-attendance-toolbar { display: flex; gap: 10px; flex-wrap: wrap; }
        .sc-attendance-count { font-size: 13px; color: var(--text-muted); padding: 0 4px; }
        .sc-list { display: flex; flex-direction: column; gap: 8px; }
        .sc-list-item { display: flex; align-items: center; gap: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; transition: border-color 0.15s; }
        .sc-list-item:hover { border-color: var(--border-hover); }
        .sc-list-num { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text-muted); min-width: 32px; text-align: center; }
        .sc-list-info { flex: 1; min-width: 0; }
        .sc-list-name { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sc-list-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sc-list-rank { background: var(--cyan-dim); color: var(--cyan); border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; }
        .sc-list-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .sc-list-time { font-size: 12px; color: var(--text-muted); font-family: monospace; }
        @media (max-width: 480px) {
          .sc-dash { padding: 20px 12px 60px; }
          .sc-attendance-toolbar { gap: 8px; }
          .sc-list-item { gap: 10px; padding: 12px; }
        }
      `}</style>
    </div>
  )
}

function ScannerPanel({ onCheckIn }: { onCheckIn: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [stats, setStats] = useState({ total: 0, approved: 0, checkedIn: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = async () => {
    setStatsLoading(true)
    const { data } = await supabase.from('registrations').select('status, checked_in')
    if (data) setStats({
      total: data.length,
      approved: data.filter(r => r.status === 'approved').length,
      checkedIn: data.filter(r => r.checked_in).length,
    })
    setStatsLoading(false)
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 30000)
    return () => { clearInterval(id); stopScanner() }
  }, [])

  const startScanner = async () => {
    setResult(null)
    const html5Qr = new Html5Qrcode('qr-reader')
    scannerRef.current = html5Qr
    setScanning(true)
    try {
      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => { await html5Qr.stop(); setScanning(false); await processQR(decodedText) },
        undefined
      )
    } catch {
      setScanning(false)
      alert('Could not access camera. Check permissions or use manual entry.')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) { try { await scannerRef.current.stop() } catch {} }
    setScanning(false)
  }

  const processQR = async (raw: string) => {
    setProcessing(true); setResult(null)
    try {
      let ticket_id: string
      try { const parsed = JSON.parse(raw); ticket_id = parsed.ticket_id }
      catch { ticket_id = raw.trim() }
      if (!ticket_id) throw new Error('Invalid QR format.')
      const { data: reg, error } = await supabase.from('registrations').select('*').eq('ticket_id', ticket_id).single()
      if (error || !reg) { setResult({ valid: false, message: 'Ticket not found. Invalid QR code.' }); setProcessing(false); return }
      const registration = reg as Registration
      if (registration.status !== 'approved') {
        setResult({ valid: false, message: `Ticket not approved. Status: ${registration.status}`, attendee: registration })
        setProcessing(false); return
      }
      if (registration.checked_in) {
        setResult({ valid: false, alreadyCheckedIn: true, attendee: registration, message: `Already checked in at ${registration.checked_in_at ? new Date(registration.checked_in_at).toLocaleTimeString('en-GB') : 'unknown time'}.` })
        setProcessing(false); return
      }
      await supabase.from('registrations').update({ checked_in: true, checked_in_at: new Date().toISOString() }).eq('id', registration.id)
      setResult({ valid: true, attendee: registration, message: "Welcome to PEAK '25 Meetup!" })
      fetchStats(); onCheckIn()
    } catch (e: unknown) {
      setResult({ valid: false, message: e instanceof Error ? e.message : 'Error processing QR.' })
    } finally { setProcessing(false) }
  }

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault(); if (!manualInput.trim()) return
    await processQR(manualInput.trim()); setManualInput('')
  }

  const pct = stats.approved > 0 ? Math.round((stats.checkedIn / stats.approved) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Attendance</span>
          <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: 18 }}>↻</button>
        </div>
        {statsLoading ? <div style={{ textAlign: 'center', padding: 10 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[{ l: 'Registered', v: stats.total, c: 'var(--cyan)' }, { l: 'Approved', v: stats.approved, c: 'var(--success)' }, { l: 'Checked In', v: stats.checkedIn, c: 'var(--yellow)' }].map(({ l, v, c }) => (
                <div key={l} style={{ textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 6px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Check-in progress</span><span style={{ color: 'var(--yellow)', fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--yellow)', borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </>
        )}
      </div>

      {/* Camera */}
      <div className="card">
        <div id="qr-reader" style={{ width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: scanning ? 12 : 0 }} />
        {!scanning && !processing && !result && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Point camera at attendee's QR ticket.</p>
            <button className="btn btn--primary" onClick={startScanner} style={{ minWidth: 180 }}>Start Camera →</button>
          </div>
        )}
        {scanning && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>Align QR code in frame…</p>
            <button className="btn btn--secondary" onClick={stopScanner} style={{ fontSize: 13 }}>✕ Cancel</button>
          </div>
        )}
        {processing && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Validating…</p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card fade-up" style={{
          textAlign: 'center',
          borderColor: result.valid ? 'var(--success)' : result.alreadyCheckedIn ? 'var(--yellow)' : 'var(--danger)',
          background: result.valid ? 'rgba(0,232,150,0.06)' : result.alreadyCheckedIn ? 'rgba(255,190,0,0.06)' : 'rgba(255,77,109,0.06)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{result.valid ? '✅' : result.alreadyCheckedIn ? '⚠️' : '❌'}</div>
          {result.attendee && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>{result.attendee.full_name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{result.attendee.school}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="badge badge--approved" style={{ textTransform: 'capitalize' }}>{result.attendee.food_preference}</span>
                {result.attendee.district_rank && <span className="badge" style={{ background: 'var(--cyan-dim)', color: 'var(--cyan)', border: '1px solid var(--border)' }}>Rank #{result.attendee.district_rank}</span>}
              </div>
            </>
          )}
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: result.valid ? 'var(--success)' : result.alreadyCheckedIn ? 'var(--yellow)' : 'var(--danger)' }}>{result.message}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => { setResult(null); startScanner() }}>Scan Next →</button>
            <button className="btn btn--secondary" onClick={() => setResult(null)} style={{ fontSize: 13 }}>Reset</button>
          </div>
        </div>
      )}

      {/* Manual */}
      <div className="card">
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 4 }}>Manual Ticket ID Lookup</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>Use if camera is unavailable.</p>
        <form onSubmit={handleManual} style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <input type="text" placeholder="Paste ticket UUID…" value={manualInput} onChange={e => setManualInput(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={processing} style={{ flexShrink: 0 }}>
            {processing ? <div className="spinner" /> : 'Check'}
          </button>
        </form>
      </div>
    </div>
  )
}

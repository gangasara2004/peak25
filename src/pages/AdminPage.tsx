import { useState, useEffect } from 'react'
import { supabase, Registration, RegistrationStatus } from '../lib/supabase'

type FilterStatus = 'all' | RegistrationStatus

export default function AdminPage() {
  const [session, setSession] = useState<boolean>(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session)
      setCheckingAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checkingAuth) {
    return (
      <div style={{ minHeight: 'calc(100vh - 57px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  return session ? <AdminDashboard /> : <AdminLogin />
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 57px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card fade-up" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>
            Admin <span style={{ color: 'var(--yellow)' }}>Portal</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>PEAK '25 Meetup · Organizer Access</p>
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="admin@peak.lk" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? <><div className="spinner" />Signing in…</> : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selected, setSelected] = useState<Registration | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [toast, setToast] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false })
    setRegistrations((data as Registration[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const updateStatus = async (id: string, status: RegistrationStatus) => {
    setActionLoading(true)
    const { error } = await supabase
      .from('registrations')
      .update({ status, admin_note: adminNote || null })
      .eq('id', id)

    if (!error) {
      showToast(status === 'approved' ? '✓ Registration approved!' : '✗ Registration rejected.')
      setSelected(null)
      setAdminNote('')
      fetchAll()
    }
    setActionLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const filtered = registrations.filter(r => filter === 'all' || r.status === filter)

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 57px)', padding: '32px 20px 60px' }}>
      <div className="container--wide">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 2 }}>
              Admin <span style={{ color: 'var(--yellow)' }}>Dashboard</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>PEAK '25 Meetup · Registration Management</p>
          </div>
          <button className="btn btn--secondary" onClick={handleSignOut} style={{ fontSize: 13 }}>
            Sign Out
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total', value: counts.all, color: 'var(--cyan)' },
            { label: 'Pending', value: counts.pending, color: 'var(--yellow)' },
            { label: 'Approved', value: counts.approved, color: 'var(--success)' },
            { label: 'Rejected', value: counts.rejected, color: 'var(--danger)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '18px 12px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn--primary' : 'btn--secondary'}`}
              style={{ fontSize: 13, padding: '8px 18px' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${counts.all})` : `(${counts[f]})`}
            </button>
          ))}
          <button className="btn btn--secondary" onClick={fetchAll} style={{ fontSize: 13, padding: '8px 18px', marginLeft: 'auto' }}>
            ↻ Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No registrations found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'NIC', 'School', 'Food', 'Registered', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.full_name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{r.email}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12 }}>{r.nic}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.school}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.food_preference}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge badge--${r.status}`}>{r.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        className="btn btn--secondary"
                        style={{ fontSize: 12, padding: '6px 14px' }}
                        onClick={() => { setSelected(r); setAdminNote(r.admin_note || '') }}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20
          }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="card fade-up" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Registration Review</h3>
              <button className="btn btn--secondary" onClick={() => setSelected(null)} style={{ padding: '6px 14px', fontSize: 13 }}>✕ Close</button>
            </div>

            {/* Attendee details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                ['Full Name', selected.full_name],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['NIC', selected.nic],
                ['School', selected.school],
                ['Food Preference', selected.food_preference],
                ['Registered', new Date(selected.created_at).toLocaleString('en-GB')],
                ['Status', selected.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, textTransform: label === 'Food Preference' || label === 'Status' ? 'capitalize' : 'none' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Payment slip */}
            {selected.payment_slip_url && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Payment Slip</div>
                <a href={selected.payment_slip_url} target="_blank" rel="noreferrer">
                  <img
                    src={selected.payment_slip_url}
                    alt="Payment slip"
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: 'var(--cyan)' }}>
                    Click to open full size ↗
                  </div>
                </a>
              </div>
            )}

            {/* Admin note */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Admin Note (optional, shown to attendee if rejected)</label>
              <textarea
                placeholder="e.g. Payment amount doesn't match, please re-upload..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                style={{ resize: 'vertical', minHeight: 72 }}
              />
            </div>

            {/* Action buttons */}
            {selected.status !== 'approved' && (
              <button
                className="btn btn--success btn--full"
                style={{ marginBottom: 10 }}
                onClick={() => updateStatus(selected.id, 'approved')}
                disabled={actionLoading}
              >
                {actionLoading ? <div className="spinner" /> : '✓ Approve & Generate Ticket'}
              </button>
            )}

            {selected.status !== 'rejected' && (
              <button
                className="btn btn--danger btn--full"
                onClick={() => updateStatus(selected.id, 'rejected')}
                disabled={actionLoading}
              >
                {actionLoading ? <div className="spinner" /> : '✗ Reject Registration'}
              </button>
            )}

            {selected.status !== 'pending' && (
              <button
                className="btn btn--secondary btn--full"
                style={{ marginTop: 10 }}
                onClick={() => updateStatus(selected.id, 'pending')}
                disabled={actionLoading}
              >
                ↩ Move Back to Pending
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 20px', fontSize: 14, zIndex: 9999,
          color: 'var(--text)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeUp 0.3s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

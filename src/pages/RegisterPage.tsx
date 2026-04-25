import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── SET YOUR EVENT DATE HERE ──────────────────────────────
const EVENT_DATE = new Date('2026-05-16T08:00:00')
// ─────────────────────────────────────────────────────────

type Step = 'form' | 'success'

interface FormData {
  full_name: string; email: string; phone: string; nic: string
  school: string; food_preference: string; slip: File | null
}

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, over: true }
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      over: false,
    }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => { const id = setInterval(() => setTime(calc()), 1000); return () => clearInterval(id) }, [])
  return time
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [slipError, setSlipError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const countdown = useCountdown(EVENT_DATE)

  const [form, setForm] = useState<FormData>({
    full_name: '', email: '', phone: '', nic: '', school: '', food_preference: '', slip: null,
  })

  const set = (key: keyof FormData, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload an image or PDF of your payment slip.'); return
    }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return }
    setError('')
    setForm(prev => ({ ...prev, slip: file }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }, [handleFile])

  const validate = () => {
    const { full_name, email, phone, nic, school, food_preference, slip } = form
    if (!full_name.trim()) return 'Full name is required.'
    if (!email.trim() || !email.includes('@')) return 'Valid email is required.'
    if (!phone.trim() || phone.length < 9) return 'Valid phone number is required.'
    if (!nic.trim()) return 'NIC is required.'
    if (!school.trim()) return 'School / institution is required.'
    if (!food_preference) return 'Please select your food preference.'
    if (!slip) return 'Please upload your payment slip.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate(); 
    if (err) {
  setError(err)
  if (!form.slip) setSlipError(true)  // ← add this
  return
}
    setSlipError(false)
    setError(''); setSubmitting(true)
    try {
      const ext = form.slip!.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('payment-slips').upload(fileName, form.slip!)
      if (uploadErr) throw new Error('Failed to upload payment slip: ' + uploadErr.message)
      const { data: urlData } = supabase.storage.from('payment-slips').getPublicUrl(fileName)
      const { error: insertErr } = await supabase.from('registrations').insert({
        full_name: form.full_name.trim(), email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(), nic: form.nic.trim().toUpperCase(),
        school: form.school.trim(), food_preference: form.food_preference,
        payment_slip_url: urlData.publicUrl, status: 'pending',
      })
      if (insertErr) {
        if (insertErr.code === '23505') throw new Error('This NIC is already registered.')
        throw new Error(insertErr.message)
      }
      setStep('success')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally { setSubmitting(false) }
  }

  if (step === 'success') return <SuccessScreen email={form.email} />

  return (
    <div className="reg-page">
      <div className="reg-hero">
        <div className="reg-hero-glow" />
        <div className="reg-hero-inner">
          <h1 className="reg-title">PEAK '25 <span className="reg-title-year">MEETUP</span></h1>
          <p className="reg-subtitle">The Gathering of Future Engineers</p>
          <p className="reg-desc">Secure your spot at the most anticipated engineering meetup of the year.</p>

          {!countdown.over ? (
            <div className="countdown">
              {[{ label: 'Days', value: countdown.days }, { label: 'Hours', value: countdown.hours },
                { label: 'Mins', value: countdown.minutes }, { label: 'Secs', value: countdown.seconds }].map(({ label, value }) => (
                <div key={label} className="countdown-block">
                  <div className="countdown-num">{String(value).padStart(2, '0')}</div>
                  <div className="countdown-label">{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="countdown-over">🎉 The event is happening now!</div>
          )}
          <div className="event-meta">
            <span>📅 16th May 2026</span>
            <span className="event-meta-divider">·</span>
            <span>📍 YMBA Hall - Kandy </span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 60 }}>
        <div className="card fade-up">
          <h2 className="form-section-title">Registration Details</h2>
          {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-2">
                <div className="field"><label>Full Name</label><input type="text" placeholder="e.g. Gangasara Jayawickrama" value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
                <div className="field"><label>Email Address</label><input type="email" placeholder="e.g. gk@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Phone Number</label><input type="tel" placeholder="07X XXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                <div className="field"><label>NIC Number</label><input type="text" placeholder="e.g. 200XXXXXXXXX" value={form.nic} onChange={e => set('nic', e.target.value)} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>School / Institution</label><input type="text" placeholder="e.g. Kingswood College, Kandy" value={form.school} onChange={e => set('school', e.target.value)} /></div>
                <div className="field">
                  <label>Food Preference</label>
                  <select value={form.food_preference} onChange={e => set('food_preference', e.target.value)}>
                    <option value="" disabled>Select preference</option>
                    <option value="non-vegetarian">Non-Vegetarian</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Payment Slip <span style={{ color: 'var(--error, #f87171)', fontSize: 12 }}>* required</span></label>
                <div className={`dropzone ${dragOver ? 'dragover' : ''} ${form.slip ? 'has-file' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
                  {form.slip ? (
                    <div className="dropzone-success">
                      <span className="dropzone-icon">✓</span>
                      <span className="dropzone-filename">{form.slip.name}</span>
                      <span className="dropzone-size">({(form.slip.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div className="dropzone-empty">
                      <span className="dropzone-upload-icon">⬆</span>
                      <span>Drag & drop your payment slip here</span>
                      <span className="dropzone-hint">or click to browse · JPG, PNG, PDF · max 5MB</span>
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
                {submitting ? <><div className="spinner" />Submitting…</> : 'Submit Registration →'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .reg-page { min-height: calc(100vh - 57px); }
        .reg-hero { position: relative; overflow: hidden; padding: 60px 24px 50px; text-align: center; border-bottom: 1px solid var(--border); margin-bottom: 40px; }
        .reg-hero-glow { position: absolute; top: -80px; left: 50%; transform: translateX(-50%); width: 600px; height: 400px; background: radial-gradient(ellipse, rgba(0,212,224,0.12) 0%, transparent 70%); pointer-events: none; }
        .reg-hero-inner { position: relative; z-index: 1; }
        .reg-event-tag { display: inline-block; background: var(--cyan-dim); border: 1px solid var(--border); border-radius: 20px; color: var(--cyan); font-size: 12px; font-weight: 500; letter-spacing: 0.1em; padding: 5px 16px; margin-bottom: 20px; text-transform: uppercase; }
        .reg-title { font-size: clamp(52px, 10vw, 88px); font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: 0.05em; }
        .reg-title-year { color: var(--cyan); }
        .reg-subtitle { font-family: var(--font-display); font-size: 14px; font-weight: 500; color: var(--text-muted); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px; }
        .reg-desc { max-width: 500px; margin: 0 auto 24px; color: var(--text-muted); font-size: 14px; line-height: 1.7; }
        .form-section-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 14px; }
        .countdown { display: inline-flex; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 24px; }
        .countdown-block { text-align: center; min-width: 56px; }
        .countdown-num { font-family: var(--font-display); font-size: 36px; font-weight: 800; color: var(--cyan); line-height: 1; }
        .countdown-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }
        .countdown-over { display: inline-block; background: rgba(0,232,150,0.1); border: 1px solid rgba(0,232,150,0.25); border-radius: 20px; color: var(--success); padding: 8px 20px; font-size: 14px; }
        .dropzone { border: 2px dashed var(--border); border-radius: var(--radius); cursor: pointer; padding: 28px 20px; text-align: center; transition: all 0.2s; }
        .dropzone:hover { border-color: var(--cyan); background: var(--cyan-dim); }
        .dropzone.dragover { border-color: var(--cyan); background: rgba(0,212,224,0.1); }
        .dropzone.has-file { border-color: var(--success); border-style: solid; background: rgba(0,232,150,0.05); }
        .dropzone-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-muted); font-size: 14px; }
        .dropzone-upload-icon { font-size: 28px; margin-bottom: 4px; }
        .dropzone-hint { font-size: 12px; opacity: 0.7; }
        .dropzone-success { display: flex; align-items: center; gap: 10px; justify-content: center; color: var(--success); font-size: 14px; flex-wrap: wrap; }
        .dropzone-icon { font-size: 22px; font-weight: 700; }
        .dropzone-filename { font-weight: 500; }
        .dropzone-size { color: var(--text-muted); font-size: 12px; }
        .event-meta { display: flex; align-items: center; gap: 10px; justify-content: center; margin-top: 16px; font-size: 14px; color: var(--text-muted); flex-wrap: wrap; }
        .event-meta-divider { color: var(--border-hover); }
        @media (max-width: 480px) { .countdown { gap: 8px; padding: 12px 16px; } .countdown-num { font-size: 26px; } .countdown-block { min-width: 40px; } }
      `}</style>
    </div>
  )
}

function SuccessScreen({ email }: { email: string }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 57px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card fade-up" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10, color: 'var(--cyan)' }}>Registration Submitted!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7, fontSize: 14 }}>
          Your registration for <strong style={{ color: 'var(--text)' }}>PEAK '25 Meetup</strong> is pending payment verification.
          Once approved, you'll receive a <strong style={{ color: 'var(--text)' }}>confirmation email</strong> with your QR ticket.
        </p>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 24, fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Check status anytime </span>
          <strong style={{ color: 'var(--cyan)' }}>status</strong>
          <span style={{ color: 'var(--text-muted)' }}> using <strong style={{ color: 'var(--text)' }}>{email}</strong></span>
        </div>
        <a href="/status" className="btn btn--primary" onClick={(e) => { e.preventDefault(); window.location.href = '/status' }}>Check My Ticket →</a>
      </div>
    </div>
  )
}

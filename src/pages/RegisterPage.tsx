import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EVENT_DATE = new Date('2026-05-16T08:00:00')
const EVENT_VENUE = 'Your Venue Name Here'

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

interface FormData {
  full_name: string; email: string; phone: string; nic: string
  school: string; district_rank: string; food_preference: string; slip: File | null
}

type Step = 'form' | 'success'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const countdown = useCountdown(EVENT_DATE)

  const [form, setForm] = useState<FormData>({
    full_name: '', email: '', phone: '', nic: '',
    school: '', district_rank: '', food_preference: '', slip: null,
  })

  const set = (key: keyof FormData, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload an image or PDF of your payment slip.'); return
    }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return }
    setError(''); setForm(prev => ({ ...prev, slip: file }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }, [handleFile])

  const validate = () => {
    const { full_name, email, phone, nic, school, district_rank, food_preference, slip } = form
    if (!full_name.trim()) return 'Full name is required.'
    if (!email.trim() || !email.includes('@')) return 'Valid email is required.'
    if (!phone.trim() || phone.length < 9) return 'Valid phone number is required.'
    if (!nic.trim()) return 'NIC is required.'
    if (!school.trim()) return 'School / institution is required.'
    if (!district_rank) return 'District rank is required.'
    const rank = parseInt(district_rank)
    if (isNaN(rank) || rank < 1 || rank > 180) return 'District rank must be between 1 and 180.'
    if (!food_preference) return 'Please select your food preference.'
    if (!slip) return 'Please upload your payment slip.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate(); if (err) { setError(err); return }
    setError(''); setSubmitting(true)
    try {
      const ext = form.slip!.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('payment-slips').upload(fileName, form.slip!)
      if (uploadErr) throw new Error('Failed to upload payment slip: ' + uploadErr.message)
      const { data: urlData } = supabase.storage.from('payment-slips').getPublicUrl(fileName)
      const { error: insertErr } = await supabase.from('registrations').insert({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        nic: form.nic.trim().toUpperCase(),
        school: form.school.trim(),
        district_rank: parseInt(form.district_rank),
        food_preference: form.food_preference,
        payment_slip_url: urlData.publicUrl,
        status: 'pending',
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
    <div className="rp">
      {/* Hero */}
      <div className="rp-hero">
        <div className="rp-glow" />
        <div className="rp-hero-inner">
          <span className="rp-tag">Pre Engineering Association Kandy</span>
          <h1 className="rp-title">PEAK <span className="rp-title-accent">'25</span></h1>
          <p className="rp-subtitle">MEETUP · The Gathering of Future Engineers</p>

          {/* Countdown */}
          {!countdown.over ? (
            <div className="rp-countdown">
              {[{ l: 'Days', v: countdown.days }, { l: 'Hours', v: countdown.hours },
                { l: 'Mins', v: countdown.minutes }, { l: 'Secs', v: countdown.seconds }].map(({ l, v }) => (
                <div key={l} className="rp-cd-block">
                  <div className="rp-cd-num">{String(v).padStart(2, '0')}</div>
                  <div className="rp-cd-label">{l}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rp-cd-over">🎉 The event is happening now!</div>
          )}

          {/* Event details */}
          <div className="rp-event-details">
            <div className="rp-detail-badge">🗓️ Saturday, 16th May 2026</div>
            <div className="rp-detail-badge">🕘 9.00 AM onwards</div>
            <div className="rp-detail-badge">🏡 E L Senanayake Auditorium</div>
            <div className="rp-detail-badge rp-detail-badge--yellow">🎟️ Rs. 1,500.00</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rp-form-wrap">
        <div className="card rp-card">
          <div className="rp-card-header">
            <h2 className="rp-card-title">Registration Details</h2>
            <p className="rp-card-sub">Fill in all fields and upload your payment slip to secure your spot.</p>
          </div>

          {error && <div className="alert alert--error rp-error">{error}</div>}

          <form onSubmit={handleSubmit} className="rp-form">
            {/* Row 1: Name + Email */}
            <div className="rp-row">
              <div className="field">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Kasun Perera" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input type="email" placeholder="e.g. kasun@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>

            {/* Row 2: Phone + NIC */}
            <div className="rp-row">
              <div className="field">
                <label>Phone Number</label>
                <input type="tel" placeholder="07X XXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="field">
                <label>NIC Number</label>
                <input type="text" placeholder="e.g. 200012345678" value={form.nic} onChange={e => set('nic', e.target.value)} />
              </div>
            </div>

            {/* Row 3: School + District Rank */}
            <div className="rp-row">
              <div className="field">
                <label>School / Institution</label>
                <input type="text" placeholder="e.g. Dharmaraja College, Kandy" value={form.school} onChange={e => set('school', e.target.value)} />
              </div>
              <div className="field">
                <label>District Rank <span className="rp-label-hint">(1 – 180)</span></label>
                <select value={form.district_rank} onChange={e => set('district_rank', e.target.value)}>
                  <option value="" disabled>Select your rank</option>
                  {Array.from({ length: 180 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Food */}
            <div className="rp-row rp-row--third">
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

            {/* Bank Details */}
            <div className="rp-payment-box rp-payment-box--inline">
              <div className="rp-payment-title">💳 Payment Details — Tap to Copy</div>
              {[
                { label: 'Account Name', value: 'Udara Bandaranayake' },
                { label: 'Account Number', value: '1007 5527 3937' },
                { label: 'Bank', value: 'Sampath Bank PLC' },
                { label: 'Branch', value: 'Kandy Super Branch' },
              ].map(({ label, value }) => (
                <CopyRow key={label} label={label} value={value} />
              ))}
              <div className="rp-payment-note">Transfer Rs. 1,500.00 and upload your slip below</div>
            </div>
            {/* Payment Slip */}
            <div className="field">
              <label>Payment Slip</label>
              
              <div
                className={`rp-drop ${dragOver ? 'rp-drop--over' : ''} ${form.slip ? 'rp-drop--done' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
                {form.slip ? (
                  <div className="rp-drop-done">
                    <span className="rp-drop-check">✓</span>
                    <div>
                      <div className="rp-drop-name">{form.slip.name}</div>
                      <div className="rp-drop-size">{(form.slip.size / 1024).toFixed(0)} KB</div>
                    </div>
                  </div>
                ) : (
                  <div className="rp-drop-empty">
                    <div className="rp-drop-icon">⬆</div>
                    <div className="rp-drop-text">Drag & drop payment slip here</div>
                    <div className="rp-drop-hint">or tap to browse · JPG, PNG, PDF · max 5MB</div>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--full rp-submit" disabled={submitting}>
              {submitting ? <><div className="spinner" style={{ borderTopColor: '#030d0e' }} />Submitting…</> : 'Submit Registration →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .rp { min-height: calc(100vh - 57px); }

        /* Hero */
        .rp-hero { position: relative; overflow: hidden; padding: 52px 20px 44px; text-align: center; border-bottom: 1px solid var(--border); margin-bottom: 36px; }
        .rp-glow { position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 700px; height: 500px; background: radial-gradient(ellipse, rgba(0,212,224,0.1) 0%, transparent 65%); pointer-events: none; }
        .rp-hero-inner { position: relative; z-index: 1; }
        .rp-tag { display: inline-block; background: var(--cyan-dim); border: 1px solid var(--border); border-radius: 20px; color: var(--cyan); font-size: 11px; font-weight: 600; letter-spacing: 0.12em; padding: 5px 16px; margin-bottom: 18px; text-transform: uppercase; }
        .rp-title { font-size: clamp(48px, 12vw, 96px); font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 6px; letter-spacing: 0.04em; }
        .rp-title-accent { color: var(--cyan); }
        .rp-subtitle { font-family: var(--font-display); font-size: clamp(11px, 2vw, 14px); font-weight: 500; color: var(--text-muted); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 28px; }

        /* Countdown */
        .rp-countdown { display: inline-flex; gap: 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 14px 20px; margin-bottom: 18px; }
        .rp-cd-block { text-align: center; min-width: 52px; }
        .rp-cd-num { font-family: var(--font-display); font-size: clamp(28px, 6vw, 40px); font-weight: 800; color: var(--cyan); line-height: 1; }
        .rp-cd-label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }
        .rp-cd-over { display: inline-block; background: rgba(0,232,150,0.1); border: 1px solid rgba(0,232,150,0.25); border-radius: 20px; color: var(--success); padding: 8px 20px; font-size: 14px; margin-bottom: 18px; }

        /* Event details */
        .rp-event-details { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 20px; }
        .rp-detail-badge { background: var(--cyan-dim); border: 1px solid var(--border); border-radius: 20px; color: var(--cyan); font-size: 12px; font-weight: 600; letter-spacing: 0.08em; padding: 6px 16px; text-transform: uppercase; }
        .rp-detail-badge--yellow { background: var(--yellow-dim); border-color: rgba(255,190,0,0.25); color: var(--yellow); }

        /* Payment box */
        .rp-payment-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px 24px; margin-top: 20px; max-width: 380px; margin-left: auto; margin-right: auto; text-align: left; }
        .rp-payment-title { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; text-align: center; }
        .rp-payment-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .rp-payment-row:last-of-type { border-bottom: none; }
        .rp-payment-row span { color: var(--text-muted); }
        .rp-payment-row strong { color: var(--text); font-weight: 600; }
        .rp-payment-note { font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }

        /* Form wrap */
        .rp-form-wrap { max-width: 760px; margin: 0 auto; padding: 0 16px 60px; }
        .rp-card { padding: 32px; }
        .rp-card-header { margin-bottom: 28px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
        .rp-card-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .rp-card-sub { font-size: 13px; color: var(--text-muted); }
        .rp-error { margin-bottom: 20px; }
        .rp-form { display: flex; flex-direction: column; gap: 18px; }

        /* Rows */
        .rp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .rp-row--third { display: grid; grid-template-columns: 1fr; }
        @media (max-width: 560px) { .rp-row { grid-template-columns: 1fr; } }

        /* Label hint */
        .rp-label-hint { color: var(--cyan); font-size: 11px; font-weight: 400; margin-left: 4px; }

        /* Dropzone */
        .rp-drop { border: 2px dashed var(--border); border-radius: var(--radius); cursor: pointer; padding: 28px 20px; text-align: center; transition: all 0.2s; }
        .rp-drop:hover, .rp-drop--over { border-color: var(--cyan); background: var(--cyan-dim); }
        .rp-drop--done { border-color: var(--success); border-style: solid; background: rgba(0,232,150,0.04); }
        .rp-drop-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-muted); }
        .rp-drop-icon { font-size: 28px; margin-bottom: 4px; }
        .rp-drop-text { font-size: 14px; }
        .rp-drop-hint { font-size: 12px; opacity: 0.6; }
        .rp-drop-done { display: flex; align-items: center; gap: 14px; justify-content: center; }
        .rp-drop-check { font-size: 28px; color: var(--success); font-weight: 700; }
        .rp-drop-name { font-size: 14px; font-weight: 500; color: var(--success); }
        .rp-drop-size { font-size: 12px; color: var(--text-muted); }

        .rp-submit { height: 52px; font-size: 15px; margin-top: 4px; }

        @media (max-width: 480px) {
          .rp-hero { padding: 40px 16px 36px; }
          .rp-countdown { gap: 6px; padding: 12px 14px; }
          .rp-cd-block { min-width: 42px; }
          .rp-card { padding: 20px 16px; }
        }
      `}</style>
    </div>
  )
}

function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="rp-success-wrap">
      <div className="card rp-success-card fade-up">
        <div className="rp-success-emoji">🎉</div>
        <h2 className="rp-success-title">Registration Submitted!</h2>
        <p className="rp-success-desc">
          Your registration for <strong>PEAK '25 Meetup</strong> is pending payment verification.
          Once approved, your QR ticket will be ready.
        </p>
        <div className="rp-success-email">
          Check status anytime at <strong style={{ color: 'var(--cyan)' }}>/status</strong> using <strong>{email}</strong>
        </div>
        <a href="/status" className="btn btn--primary btn--full">Check My Ticket →</a>
      </div>
      <style>{`
        .rp-success-wrap { min-height: calc(100vh - 57px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .rp-success-card { max-width: 460px; width: 100%; text-align: center; padding: 40px 32px; }
        .rp-success-emoji { font-size: 56px; margin-bottom: 16px; }
        .rp-success-title { font-family: var(--font-display); font-size: 26px; color: var(--cyan); margin-bottom: 12px; }
        .rp-success-desc { color: var(--text-muted); font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
        .rp-payment-row--copy { cursor: pointer; border-radius: 6px; padding: 8px 6px; margin: 0 -6px; transition: background 0.15s; }
        .rp-payment-row--copy:hover { background: var(--cyan-dim); }
        .rp-copy-right { display: flex; align-items: center; gap: 8px; }
        .rp-copy-icon { font-size: 14px; color: var(--cyan); opacity: 0.6; }
        .rp-payment-row--copy:hover .rp-copy-icon { opacity: 1; }.rp-payment-box--inline { max-width: 100%; margin-top: 0; }
        .rp-success-email { background: var(--bg-elevated); border-radius: var(--radius); padding: 12px 16px; font-size: 13px; color: var(--text-muted); margin-bottom: 24px; word-break: break-all; }
      `}</style>
    </div>
  )
}
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const el = document.createElement('textarea')
    el.value = value
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rp-payment-row rp-payment-row--copy" onClick={copy}>
      <span>{label}</span>
      <div className="rp-copy-right">
        <strong>{value}</strong>
        <span className="rp-copy-icon" style={{ color: copied ? 'var(--success)' : 'var(--cyan)' }}>
          {copied ? '✓' : '⎘'}
        </span>
      </div>
    </div>
  )
}

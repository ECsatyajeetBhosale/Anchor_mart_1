import { useState } from 'react'
import { asset } from '../lib/images'
import { useAuth } from '../context/AuthContext'

type Step = 's-login' | 's-forgot' | 's-sent' | 's-otp'

export function Login() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('s-login')
  const [email, setEmail] = useState('admin@anchormart.io')
  const [pass, setPass] = useState('password123')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errEmail, setErrEmail] = useState(false)
  const [errPass, setErrPass] = useState(false)

  const doLogin = () => {
    let ok = true
    if (!email || !email.includes('@')) { setErrEmail(true); ok = false } else setErrEmail(false)
    if (!pass || pass.length < 6) { setErrPass(true); ok = false } else setErrPass(false)
    if (!ok) return
    setLoading(true)
    // Demo console: any valid-format email + 6+ char password signs in.
    setTimeout(() => { setLoading(false); login() }, 1400)
  }

  return (
    <div className="login-screen" id="ls" style={{ display: 'flex' }}>
      <div className="lbg">
        <div className="lbg-grid" />
        <div className="lbg-dots" />
        <div className="lbg-blob b1" />
        <div className="lbg-blob b2" />
        <div className="lbg-blob b3" />
      </div>
      <div className="login-card">
        <div className="login-hero">
          <div className="lh-logo logo-only">
            <img src={asset('assets/logo-wordmark-white.svg')} alt="AnchorMart logo" className="logo-graphic" />
          </div>
          <div className="lh-headline">The command<br />bridge for your<br />maritime ops.</div>
          <div className="lh-desc">Complete visibility across sailor orders, delivery partner operations, inventory, and real-time port logistics.</div>
        </div>

        <div className="login-form">
          {/* Step 1: Sign in */}
          {step === 's-login' && (
            <div>
              <p className="lf-eyebrow">Admin Console</p>
              <h1 className="lf-title">Welcome back</h1>
              <p className="lf-sub">Sign in to access the AnchorMart control center.</p>
              <div className="fg">
                <label className="fg-label">Email Address</label>
                <div className="fi-wrap">
                  <i className="ti ti-mail fi-il" />
                  <input
                    type="email" className={`fi${errEmail ? ' err' : ''}`} placeholder="admin@anchormart.io"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className={`fi-err${errEmail ? ' show' : ''}`}><i className="ti ti-alert-circle" />Please enter a valid email address.</div>
              </div>
              <div className="fg">
                <label className="fg-label">Password</label>
                <div className="fi-wrap">
                  <i className="ti ti-lock fi-il" />
                  <input
                    type={showPw ? 'text' : 'password'} className={`fi${errPass ? ' err' : ''}`} placeholder="Your password"
                    value={pass} onChange={(e) => setPass(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
                  />
                  <button className="fi-ir" onClick={() => setShowPw((s) => !s)} tabIndex={-1}>
                    <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} />
                  </button>
                </div>
                <div className={`fi-err${errPass ? ' show' : ''}`}><i className="ti ti-alert-circle" />Password must be at least 6 characters.</div>
              </div>
              <div className="l-row">
                <span className="l-link" onClick={() => setStep('s-forgot')}>Forgot password?</span>
              </div>
              <button className={`l-btn${loading ? ' loading' : ''}`} disabled={loading} onClick={doLogin}>
                <div className="spin" />
                <span className="lbl"><i className="ti ti-login" style={{ fontSize: 17 }} />&nbsp; Sign In to Console</span>
              </button>
            </div>
          )}

          {/* Step 2: Forgot password */}
          {step === 's-forgot' && (
            <div>
              <div className="lf-back" onClick={() => setStep('s-login')}><i className="ti ti-arrow-left" />Back to sign in</div>
              <h2 className="lf-title">Reset your password</h2>
              <p className="lf-sub">Enter your admin email — we'll send a reset link.</p>
              <div className="fg" style={{ marginTop: 28 }}>
                <label className="fg-label">Email Address</label>
                <div className="fi-wrap">
                  <i className="ti ti-mail fi-il" />
                  <input type="email" className="fi" placeholder="admin@anchormart.io" />
                </div>
              </div>
              <button className="l-btn" onClick={() => setStep('s-sent')}>
                <span className="lbl"><i className="ti ti-send" style={{ fontSize: 17 }} />&nbsp; Send Reset Link</span>
              </button>
            </div>
          )}

          {/* Step 3: Sent */}
          {step === 's-sent' && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div className="success-icon"><i className="ti ti-mail-check" /></div>
              <h2 className="lf-title" style={{ textAlign: 'center' }}>Check your inbox</h2>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--t3)', lineHeight: 1.72, marginBottom: 28 }}>
                Reset link sent to <strong>admin@anchormart.io</strong>. Check your inbox and spam folder.
              </p>
              <button className="l-btn" onClick={() => setStep('s-otp')}>
                <span className="lbl"><i className="ti ti-keyboard" style={{ fontSize: 17 }} />&nbsp; Enter OTP Code</span>
              </button>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t4)', marginTop: 14 }}>Didn't receive it? <span className="l-link">Resend email</span></p>
              <div className="lf-back" style={{ justifyContent: 'center', marginTop: 14 }} onClick={() => setStep('s-login')}><i className="ti ti-arrow-left" />Back to sign in</div>
            </div>
          )}

          {/* Step 4: OTP */}
          {step === 's-otp' && (
            <div style={{ paddingTop: 8 }}>
              <div className="lf-back" onClick={() => setStep('s-sent')}><i className="ti ti-arrow-left" />Back</div>
              <h2 className="lf-title">Verify your identity</h2>
              <p className="lf-sub">Enter the 6-digit code sent to your email address.</p>
              <div className="otp-row" style={{ marginTop: 28 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <input key={i} className="otp-input" maxLength={1} type="text" inputMode="numeric" />
                ))}
              </div>
              <button className="l-btn" onClick={doLogin}>
                <span className="lbl"><i className="ti ti-shield-check" style={{ fontSize: 17 }} />&nbsp; Verify &amp; Continue</span>
              </button>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t4)', textAlign: 'center', marginTop: 14 }}>Didn't get a code? <span className="l-link">Resend</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

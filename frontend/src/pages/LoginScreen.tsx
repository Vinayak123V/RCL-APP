import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import astraLogo from '../assets/astra-logo.png';

interface Props {
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LoginScreen: React.FC<Props> = ({ onToast }) => {
  const { login, loginAsGuest } = useAuthStore();
  const t = useT();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim())                    e.email    = t('email_required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = t('email_invalid');
    if (!password)                        e.password = t('password_required');
    else if (password.length < 6)         e.password = t('password_min');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = login(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setErrors({ password: result.error });
      onToast(result.error ?? t('login_title'), 'error');
    } else {
      onToast(t('sign_in_btn'), 'success');
    }
  }

  function handleGuest() {
    loginAsGuest();
    onToast(t('continue_guest'), 'info');
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(170deg, #0f172a 0%, #020617 100%)' }}>

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', boxShadow: '0 0 32px rgba(34,211,238,0.3)' }}>
          <BatteryIcon />
        </div>
        <div className="text-center">
          <img src={astraLogo} alt="ASTRA" className="h-7 w-auto object-contain mx-auto mb-1" style={{ filter: 'brightness(1.5)' }} />
          <p className="text-slate-600 text-xs mt-1">{t('app_subtitle')}</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-3xl p-6 space-y-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <h2 className="text-white font-semibold text-lg">{t('login_title')}</h2>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-slate-500 text-xs font-medium">{t('email_label')}</label>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-3 border transition-all ${errors.email ? 'border-red-500/50' : 'border-white/8'}`}
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <MailIcon />
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
              placeholder={t('email_placeholder')}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-700"
              autoComplete="email" />
          </div>
          {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-slate-500 text-xs font-medium">{t('password_label')}</label>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-3 border transition-all ${errors.password ? 'border-red-500/50' : 'border-white/8'}`}
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <LockIcon />
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
              placeholder={t('password_placeholder')}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-700"
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button onClick={() => setShowPw(v => !v)} className="text-slate-600 hover:text-slate-400 transition-colors">
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs">{errors.password}</p>}
        </div>

        {/* Login button */}
        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', boxShadow: '0 0 20px rgba(34,211,238,0.25)' }}>
          {loading
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />
            : t('sign_in_btn')}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-slate-700 text-xs">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <button onClick={handleGuest}
          className="w-full py-3.5 rounded-xl text-slate-400 font-semibold text-sm active:scale-[0.98] transition-all border"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          {t('continue_guest')}
        </button>
      </div>

      <p className="text-slate-700 text-xs mt-6 text-center max-w-xs animate-fade-up" style={{ animationDelay: '160ms' }}>
        {t('new_user_hint')}
      </p>
    </div>
  );
};

/* ── Icons ── */
function BatteryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="16" height="10" rx="2"/>
      <path d="M22 11v2"/>
      <line x1="6" y1="12" x2="10" y2="12"/>
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

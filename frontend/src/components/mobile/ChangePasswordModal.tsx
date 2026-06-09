import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuthStore } from '../../store/authStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ open, onClose, onToast }) => {
  const { changePassword } = useAuthStore();
  const [oldPw, setOldPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function reset() { setOldPw(''); setNewPw(''); setConfPw(''); setError(''); }

  async function handleSubmit() {
    if (!oldPw || !newPw || !confPw) { setError('All fields are required'); return; }
    if (newPw !== confPw)            { setError('New passwords do not match'); return; }
    if (newPw.length < 6)            { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const result = changePassword(oldPw, newPw);
    setLoading(false);

    if (!result.ok) { setError(result.error ?? 'Failed'); return; }
    onToast('Password changed successfully', 'success');
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Change Password">
      <div className="space-y-3">
        <PwField label="Current Password" value={oldPw} onChange={setOldPw} />
        <PwField label="New Password"     value={newPw} onChange={setNewPw} />
        <PwField label="Confirm Password" value={confPw} onChange={setConfPw} />

        {error && (
          <p className="text-red-400 text-xs px-1">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm mt-2 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}
        >
          {loading
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />
            : 'Update Password'}
        </button>
      </div>
    </Modal>
  );
};

const PwField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-slate-500 text-xs font-medium">{label}</label>
      <div className="flex items-center gap-2 rounded-xl px-3 py-3 border border-white/8"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-700"
        />
        <button onClick={() => setShow(v => !v)} className="text-slate-600 hover:text-slate-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {show
              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
          </svg>
        </button>
      </div>
    </div>
  );
};

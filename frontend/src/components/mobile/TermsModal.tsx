import React from 'react';
import { Modal } from './Modal';

interface Props { open: boolean; onClose: () => void }

export const TermsModal: React.FC<Props> = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Terms & Conditions">
    <div className="scroll-area max-h-72 space-y-4 text-slate-400 text-sm leading-relaxed pr-1">
      <p className="text-slate-300 font-semibold">1. Acceptance of Terms</p>
      <p>By using BMS Monitor, you agree to these terms. This application is designed for monitoring lithium battery management systems and is intended for use by qualified personnel only.</p>

      <p className="text-slate-300 font-semibold">2. Safety Disclaimer</p>
      <p>Lithium batteries can be dangerous if mishandled. Always follow manufacturer guidelines. This app provides monitoring data only — it does not replace professional battery management hardware or safety systems.</p>

      <p className="text-slate-300 font-semibold">3. Data & Privacy</p>
      <p>All data is stored locally on your device. No data is transmitted to external servers. Device connection history and settings are stored in local storage only.</p>

      <p className="text-slate-300 font-semibold">4. Limitation of Liability</p>
      <p>The developers of BMS Monitor are not liable for any damage to equipment, property, or persons resulting from the use or misuse of this application.</p>

      <p className="text-slate-300 font-semibold">5. Updates</p>
      <p>These terms may be updated at any time. Continued use of the application constitutes acceptance of any revised terms.</p>
    </div>
    <button
      onClick={onClose}
      className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all"
      style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}
    >
      I Understand
    </button>
  </Modal>
);

import React from 'react';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export const ConfirmModal: React.FC<Props> = ({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false,
}) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-slate-400 text-sm leading-relaxed mb-6">{message}</p>
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 py-3 rounded-xl text-slate-400 font-semibold text-sm active:scale-[0.98] transition-all border border-white/8"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        Cancel
      </button>
      <button
        onClick={() => { onConfirm(); onClose(); }}
        className="flex-1 py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all"
        style={danger
          ? { background: 'linear-gradient(135deg, #991b1b, #ef4444)' }
          : { background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }
        }
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
}

export const RenameDeviceModal: React.FC<Props> = ({ open, onClose, onSave, currentName }) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Rename Device">
      <div className="mb-6">
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
          Device Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter new device name"
          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 transition-colors"
          autoFocus
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl text-slate-400 font-semibold text-sm active:scale-[0.98] transition-all border border-white/5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || name.trim() === currentName}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
};

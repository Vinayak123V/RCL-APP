import React from 'react';
import { Modal } from './Modal';
import { Language } from '../../store/settingsStore';
import { useT } from '../../i18n';

const LANGUAGES: { value: Language; label: string; native: string; flag: string }[] = [
  { value: 'English', label: 'English', native: 'English',  flag: '' },
  { value: 'Hindi',   label: 'Hindi',   native: 'हिंदी',    flag: '' },
  { value: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ',    flag: '' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  current: Language;
  onChange: (l: Language) => void;
}

export const LanguageModal: React.FC<Props> = ({ open, onClose, current, onChange }) => {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('select_language')}>
      <div className="space-y-2">
        {LANGUAGES.map(l => (
          <button
            key={l.value}
            onClick={() => { onChange(l.value); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl active:scale-[0.98] transition-all"
            style={{
              background: current === l.value ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${current === l.value ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <span className="text-xl">{l.flag}</span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-medium ${current === l.value ? 'text-cyan-300' : 'text-slate-300'}`}>
                {l.native}
              </p>
              {l.native !== l.label && (
                <p className="text-xs text-slate-600 mt-0.5">{l.label}</p>
              )}
            </div>
            {current === l.value && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
};

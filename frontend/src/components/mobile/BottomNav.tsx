import React from 'react';
import { Tab } from '../../App';

interface Props {
  active: Tab | string;
  onChange: (t: any) => void;
}

export const BottomNav: React.FC<Props> = ({ active, onChange }) => {
  return (
    <div className="flex-shrink-0 pb-safe relative z-50 bg-[#060a14] border-t border-slate-800/80">
      <div className="flex items-center justify-around px-2 py-1">
        <NavBtn label="Dashboard" active={active === 'home'} onClick={() => onChange('home')}>
          <DashboardIcon />
        </NavBtn>
        <NavBtn label="Advance" active={active === 'advance'} onClick={() => onChange('advance')}>
          <CellsIcon />
        </NavBtn>
        <NavBtn label="Settings" active={active === 'profile'} onClick={() => onChange('profile')}>
          <SettingsIcon />
        </NavBtn>
      </div>
    </div>
  );
};

const NavBtn: React.FC<{ label: string; active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  label, active, onClick, children,
}) => (
  <button
    onClick={onClick}
    className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 transition-all duration-200"
    aria-label={label}
  >
    <div className={`transition-colors duration-200 ${active ? 'text-blue-500' : 'text-slate-500'}`}>
      {children}
    </div>
    <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-blue-500' : 'text-slate-500'}`}>
      {label}
    </span>
    {active && <span className="w-10 h-1 absolute bottom-0 rounded-t bg-blue-500 shadow-[0_-2px_10px_rgba(59,130,246,0.5)]"></span>}
  </button>
);

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 16 16 12"></polyline>
      <line x1="12" y1="8" x2="12" y2="12"></line>
    </svg>
  );
}

function CellsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="16" rx="2" ry="2"></rect>
      <line x1="10" y1="2" x2="14" y2="2"></line>
      <line x1="12" y1="9" x2="12" y2="15"></line>
      <line x1="9" y1="12" x2="15" y2="12"></line>
    </svg>
  );
}

function AlertsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

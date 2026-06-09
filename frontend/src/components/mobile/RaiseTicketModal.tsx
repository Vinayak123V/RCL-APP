import React, { useState } from 'react';
import { useT } from '../../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RaiseTicketModal: React.FC<Props> = ({ open, onClose, onToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !mobile.trim() || !location.trim() || !issue.trim()) {
      onToast('Please fill in all fields', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001/ticket'
        : 'https://rcl-app.onrender.com/ticket';
        
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issue,
          userInfo: {
            name,
            email,
            mobileNumber: mobile,
            location,
            timestamp: new Date().toISOString(),
          }
        }),
      });

      const data = await response.json();
      if (data.success) {
        onToast('Ticket raised successfully!', 'success');
        setName('');
        setEmail('');
        setMobile('');
        setLocation('');
        setIssue('');
        onClose();
      } else {
        throw new Error(data.error || 'Failed to raise ticket');
      }
    } catch (error: any) {
      console.error(error);
      onToast('Error sending ticket. Make sure backend is running.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
      <div className='absolute inset-0 bg-[#020617]/80 backdrop-blur-sm' onClick={onClose} />
      <div className='relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto'>
        <h3 className='text-lg font-bold text-white mb-2'>Raise a Ticket</h3>
        <p className='text-xs text-slate-400 mb-4'>Provide your details and describe the issue.</p>
        
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Name'
          className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-3'
          disabled={isSubmitting}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='Email'
          className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-3'
          disabled={isSubmitting}
        />
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder='Mobile Number'
          className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-3'
          disabled={isSubmitting}
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder='Location'
          className='w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-4'
          disabled={isSubmitting}
        />
        
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder='Describe your issue here...'
          className='w-full h-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-4 resize-none'
          disabled={isSubmitting}
        />
        
        <div className='flex items-center gap-3'>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className='flex-1 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='flex-1 py-2.5 rounded-xl font-semibold text-sm bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 flex items-center justify-center'
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/0000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Send Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
};

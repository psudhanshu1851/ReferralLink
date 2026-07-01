import React from 'react';
import { useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

export default function Header({ userEmail }) {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/create':
        return 'Create Short Link';
      case '/analytics':
        return 'Detailed Analytics';
      case '/settings':
        return 'Application Settings';
      default:
        return 'ReferralLink';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-20 shadow-sm">
      <h1 className="font-semibold text-lg text-slate-800">{getPageTitle()}</h1>
      
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Logged in as</p>
          <p className="text-sm font-semibold text-slate-700">{userEmail}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-inner">
          <User className="w-5 h-5 stroke-[2]" />
        </div>
      </div>
    </header>
  );
}

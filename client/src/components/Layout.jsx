import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ userEmail, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - fixed */}
      <Sidebar onLogout={onLogout} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col pl-64">
        {/* Header - fixed */}
        <Header userEmail={userEmail} />

        {/* Dynamic Pages Area */}
        <main className="p-8 pt-24 min-h-[calc(100vh-4rem)] flex flex-col flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

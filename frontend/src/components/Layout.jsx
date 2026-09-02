import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleLabel = { MINISTRY: 'משרד הבינוי', MUNICIPALITY: 'עירייה', APPRAISER: 'שמאי' };
const roleColor = { MINISTRY: 'bg-blue-100 text-blue-800', MUNICIPALITY: 'bg-purple-100 text-purple-800', APPRAISER: 'bg-amber-100 text-amber-800' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-xl">🏗️</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 leading-tight">מערכת שיקום מבנים</h1>
                <p className="text-xs text-slate-500">ניהול ופיקוח לאומי</p>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`
              }>
                לוח בקרה ארצי
              </NavLink>
              {user?.role === 'MINISTRY' && (
                <NavLink to="/notifications" className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`
                }>
                  מרכז הודעות
                </NavLink>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800">{user?.fullName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user?.role]}`}>
                  {roleLabel[user?.role]}
                  {user?.settlementId && ` · ${user?.settlementId}`}
                </span>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">התנתק</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-400">מערכת שיקום מבנים © 2026 | משרד הבינוי והשיכון</p>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_USERS = [
  { label: 'משרד הבינוי', user: 'ministry_admin', pass: 'ministry123', role: 'MINISTRY', icon: '🏛️', color: 'from-blue-600 to-blue-800' },
  { label: 'עירייה - חיפה', user: 'muni_haifa', pass: 'haifa123', role: 'MUNICIPALITY', icon: '🏙️', color: 'from-purple-600 to-purple-800' },
  { label: 'עירייה - ת"א', user: 'muni_tlv', pass: 'tlv123', role: 'MUNICIPALITY', icon: '🏙️', color: 'from-purple-600 to-purple-800' },
  { label: 'שמאי', user: 'appraiser1', pass: 'appraiser123', role: 'APPRAISER', icon: '📋', color: 'from-amber-500 to-amber-700' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאת התחברות');
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(u, p) {
    setUsername(u);
    setPassword(p);
    setLoading(true);
    try {
      await login(u, p);
      navigate('/');
    } catch {
      setError('שגיאה בהתחברות מהירה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
        backgroundSize: '20px 20px'
      }} />

      <div className="w-full max-w-md animate-slide-up relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl mb-6">
            <span className="text-4xl">🏗️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">מערכת שיקום מבנים</h1>
          <p className="text-blue-300 text-sm">ניהול ופיקוח לאומי | משרד הבינוי והשיכון</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">כניסה למערכת</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 text-sm text-center animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1.5">שם משתמש</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="הכנס שם משתמש" required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1.5">סיסמה</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="הכנס סיסמה" required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl
                         transition-all duration-200 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50
                         flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> מתחבר...</>
              ) : 'כניסה למערכת'}
            </button>
          </form>

          {/* Quick Login */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-blue-300 text-center mb-4 font-medium">כניסה מהירה לדמו</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map(d => (
                <button key={d.user} onClick={() => quickLogin(d.user, d.pass)}
                  disabled={loading}
                  className={`p-3 rounded-xl bg-gradient-to-br ${d.color} text-white text-xs font-medium
                               hover:opacity-90 transition-all shadow-lg disabled:opacity-40 text-right`}>
                  <span className="text-lg block mb-1">{d.icon}</span>
                  <span className="block font-semibold">{d.label}</span>
                  <span className="block opacity-70 text-xs">{d.user}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

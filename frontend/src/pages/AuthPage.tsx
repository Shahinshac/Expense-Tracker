import React, { useState } from 'react';
import {
  Receipt, ArrowRight, Lock, Mail, User as UserIcon,
  CheckCircle2, ShieldCheck, Clock, AlertCircle, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AuthPage: React.FC = () => {
  const { login, adminLogin, register } = useAuth();
  const { showToast } = useToast();

  const [loginType, setLoginType] = useState<'user' | 'admin'>('user');
  const [isRegistering, setIsRegistering] = useState(false);

  // User fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Admin fields
  const [adminUsername, setAdminUsername] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'info' | 'warning' | 'error' | 'success'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusNotice(null);

    try {
      if (loginType === 'admin') {
        await adminLogin({ username: adminUsername.trim(), password });
        showToast('Welcome Administrator!');
        window.history.pushState(null, '', '/admin');
        window.dispatchEvent(new Event('popstate'));
      } else if (isRegistering) {
        const res = await register({ email: email.trim(), password, full_name: fullName.trim(), currency });
        const successMsg = res?.message || 'Registration successful. Your account is waiting for administrator approval.';
        setStatusNotice({
          type: 'info',
          message: successMsg
        });
        showToast(successMsg, 'info');
        setIsRegistering(false);
      } else {
        await login({ email: email.trim(), password });
        showToast('Welcome back!');
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      if (msg.toLowerCase().includes('awaiting administrator approval') || msg.toLowerCase().includes('waiting for administrator approval')) {
        setStatusNotice({
          type: 'warning',
          message: 'Your account is waiting for administrator approval. You will be able to log in once an admin approves your request.'
        });
      } else if (msg.toLowerCase().includes('rejected')) {
        setStatusNotice({
          type: 'error',
          message: 'Your registration request was rejected by an administrator.'
        });
      } else if (msg.toLowerCase().includes('disabled')) {
        setStatusNotice({
          type: 'error',
          message: 'Your account has been disabled. Please contact the administrator.'
        });
      } else {
        setStatusNotice({
          type: 'error',
          message: msg
        });
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const switchToUserLogin = () => {
    setLoginType('user');
    setIsRegistering(false);
    setStatusNotice(null);
  };

  const switchToAdminLogin = () => {
    setLoginType('admin');
    setIsRegistering(false);
    setStatusNotice(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4">
          <Receipt className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          FinStudent
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Personal expense tracking designed specifically for college life.
        </p>

        {/* Login Type Toggle: User Login vs Admin Login */}
        <div className="mt-6 flex bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl max-w-xs mx-auto">
          <button
            type="button"
            onClick={switchToUserLogin}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              loginType === 'user'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            User Login
          </button>
          <button
            type="button"
            onClick={switchToAdminLogin}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginType === 'admin'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-100 dark:border-slate-800">
          {/* Header indicator for Admin vs User Register vs User Login */}
          <div className="mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {loginType === 'admin' ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Administrator Portal</span>
                </>
              ) : isRegistering ? (
                <>
                  <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Create Student Account</span>
                </>
              ) : (
                <>
                  <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Student Sign In</span>
                </>
              )}
            </div>

            {loginType === 'admin' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50">
                Staff Only
              </span>
            )}
          </div>

          {/* Status / Error Banner */}
          {statusNotice && (
            <div
              className={`mb-5 p-3.5 rounded-2xl text-xs flex items-start gap-3 ${
                statusNotice.type === 'info'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
                  : statusNotice.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : statusNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusNotice.type === 'warning' ? (
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              ) : statusNotice.type === 'info' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
              ) : statusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              )}
              <div className="leading-relaxed">{statusNotice.message}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ADMIN LOGIN FIELDS */}
            {loginType === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Admin Username
                </label>
                <div className="relative flex items-center">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter admin username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* USER REGISTRATION: FULL NAME */}
            {loginType === 'user' && isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* USER LOGIN & REGISTRATION: EMAIL */}
            {loginType === 'user' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* PASSWORD FIELD (COMMON) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* USER REGISTRATION: CURRENCY */}
            {loginType === 'user' && isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60"
              >
                <span>
                  {loginType === 'admin'
                    ? 'Admin Sign In'
                    : isRegistering
                    ? 'Create Student Account'
                    : 'Sign In to FinStudent'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* USER REGISTRATION / LOGIN TOGGLE LINK (ONLY FOR USER FLOW) */}
          {loginType === 'user' && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
              {isRegistering ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setStatusNotice(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setStatusNotice(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                >
                  Don't have an account? Register
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center">
          <div className="p-2">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Fast 3s Entry</div>
            <div className="text-[10px] text-slate-400">Quick rupee chips</div>
          </div>
          <div className="p-2">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">College Groups</div>
            <div className="text-[10px] text-slate-400">Xerox, canteen, fees</div>
          </div>
          <div className="p-2">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">100% Private</div>
            <div className="text-[10px] text-slate-400">Full backup & export</div>
          </div>
        </div>
      </div>
    </div>
  );
};

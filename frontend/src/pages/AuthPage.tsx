import React, { useState } from 'react';
import {
  Receipt, ArrowRight, Lock, Mail, User as UserIcon,
  CheckCircle2, Clock, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [isRegistering, setIsRegistering] = useState(false);

  // User form fields (empty initially)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'info' | 'warning' | 'error' | 'success'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusNotice(null);

    try {
      if (isRegistering) {
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
          message: 'Your account is awaiting administrator approval. You will be able to log in once an admin approves your request.'
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
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-100 dark:border-slate-800">
          {/* Header indicator */}
          <div className="mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {isRegistering ? 'Create Student Account' : 'Student Sign In'}
              </span>
            </div>
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
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
              ) : statusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              )}
              <div className="leading-relaxed">{statusNotice.message}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* USER REGISTRATION: FULL NAME */}
            {isRegistering && (
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
                    className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm rounded-xl pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* USER REGISTRATION: CURRENCY */}
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 outline-none transition-colors"
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
                <span>{isLoading ? 'Please wait...' : isRegistering ? 'Create Student Account' : 'Sign In to FinStudent'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* REGISTRATION / LOGIN TOGGLE LINK */}
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

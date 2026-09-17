import React, { useState } from 'react';
import {
  User, Shield, Moon, Sun, Monitor, Download, Upload,
  Keyboard, LogOut, CheckCircle2, AlertTriangle, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [collegeName, setCollegeName] = useState(user?.college_name || '');
  const [course, setCourse] = useState(user?.course || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [monthStartDay, setMonthStartDay] = useState(user?.month_starts_on_day || 1);
  const [isUpdating, setIsUpdating] = useState(false);

  // Backup restore state
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      await updateProfile({
        full_name: fullName,
        college_name: collegeName,
        course,
        currency,
        month_starts_on_day: Number(monthStartDay)
      });
      showToast('Profile settings updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `student_expense_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      showToast('Full backup JSON file downloaded!');
    } catch (err: any) {
      showToast('Backup export failed', 'error');
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      showToast('Please select a valid backup JSON file', 'error');
      return;
    }

    try {
      setIsRestoring(true);
      const text = await backupFile.text();
      const json = JSON.parse(text);
      await api.restoreBackup(json, 'replace');
      showToast('Data restored successfully! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to restore backup', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your college student profile, theme, shortcuts, and data backups
        </p>
      </div>

      {/* PROFILE SETTINGS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Student Profile Details
          </h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                College / University
              </label>
              <input
                type="text"
                placeholder="e.g. National Institute of Technology"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Major / Course
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech Computer Science"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Monthly Cycle Starts On Day
              </label>
              <select
                value={monthStartDay}
                onChange={(e) => setMonthStartDay(Number(e.target.value))}
                className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                {[1, 5, 10, 15, 20, 25].map((d) => (
                  <option key={d} value={d}>
                    {d}th of every month
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* THEME PREFERENCE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Moon className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Appearance
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as any)}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                  theme === item.id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BACKUP & DATA SAFETY */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Data Safety & Backup
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Full Data Export (JSON)</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Export all your expenses, categories, wallets, recurring rules, and savings goals into a secure JSON backup.
            </p>
            <button
              onClick={handleExportBackup}
              className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Restore from Backup</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Restore your tracker state from a previously downloaded JSON backup file.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {backupFile && (
              <button
                onClick={handleRestoreBackup}
                disabled={isRestoring}
                className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Restore</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS & SYSTEM INFO */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
            <span className="text-xs text-slate-400">Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px]">N</kbd> anywhere to quickly log an expense</span>
          </div>
        </div>

        <button
          onClick={() => setShowShortcuts(true)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View All
        </button>
      </div>

      {/* LOGOUT */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Student Account</span>
        </button>
      </div>

      {/* KEYBOARD SHORTCUTS MODAL */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Keyboard Shortcuts Cheat Sheet
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Quick Add Expense</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold">N</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Search / Filter</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold">/</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Close Modals</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold">Esc</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcuts(false)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  LayoutDashboard, Receipt, PieChart, Calendar, Wallet,
  Target, Repeat, ArrowDownLeft, Database, Settings,
  LogOut, Plus, Moon, Sun, Menu, X, ChevronRight, Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PwaInstallPrompt } from '../common/PwaInstallPrompt';

interface AppLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickAdd,
  children
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  const secondaryNavItems = [
    { id: 'income', label: 'Income / Received', icon: ArrowDownLeft },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'accounts', label: 'Wallets & Accounts', icon: Wallet },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'savings', label: 'Savings Goals', icon: Target },
    { id: 'backup', label: 'Export & Backup', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else setTheme('dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="FinStudent"
              className="w-10 h-10 rounded-xl shadow-md shadow-indigo-500/20 object-cover"
            />
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none">FinStudent</h1>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Student Expense Tracker</span>
            </div>
          </div>
        </div>

        {/* Quick Add Button in Sidebar */}
        <div className="p-4">
          <button
            onClick={onOpenQuickAdd}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Main
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Management
            </div>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Add to Home Screen / Install App Banner */}
        <div className="px-3 pb-2">
          <PwaInstallPrompt compact={true} />
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-300 shrink-0">
              {user?.full_name?.charAt(0) || 'S'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.full_name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* MOBILE TOP BAR */}
        <header className="md:hidden sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="FinStudent"
              className="w-8 h-8 rounded-lg shadow-sm object-cover"
            />
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">FinStudent</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-300"
            >
              {user?.full_name?.charAt(0) || 'S'}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 pb-safe flex items-center justify-around shadow-lg">
          <button
            onClick={() => { setCurrentTab('dashboard'); setMobileMoreOpen(false); }}
            className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
              currentTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Home</span>
          </button>

          <button
            onClick={() => { setCurrentTab('expenses'); setMobileMoreOpen(false); }}
            className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
              currentTab === 'expenses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Expenses</span>
          </button>

          {/* Center Floating Quick Add Button */}
          <div className="relative -top-4 flex items-center justify-center">
            <button
              onClick={onOpenQuickAdd}
              className="w-13 h-13 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 active:scale-95 transition-transform cursor-pointer"
              aria-label="Add Expense"
            >
              <Plus className="w-7 h-7" strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={() => { setCurrentTab('reports'); setMobileMoreOpen(false); }}
            className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
              currentTab === 'reports' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Reports</span>
          </button>

          <button
            onClick={() => setMobileMoreOpen(true)}
            className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
              mobileMoreOpen || ['budgets', 'income', 'categories', 'accounts', 'recurring', 'savings', 'calendar', 'backup', 'settings', 'admin'].includes(currentTab)
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">More</span>
          </button>
        </nav>

        {/* MOBILE "MORE" BOTTOM SHEET */}
        {mobileMoreOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">More Options</h3>
                <button
                  onClick={() => setMobileMoreOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Install App / Add to Home Screen Banner */}
              <div className="mb-3">
                <PwaInstallPrompt compact={true} />
              </div>

              <div className="grid grid-cols-3 gap-3 py-2">
                {[
                  { id: 'budgets', label: 'Budgets', icon: Target },
                  { id: 'calendar', label: 'Calendar', icon: Calendar },
                  { id: 'income', label: 'Income', icon: ArrowDownLeft },
                  { id: 'categories', label: 'Categories', icon: Tag },
                  { id: 'accounts', label: 'Accounts', icon: Wallet },
                  { id: 'recurring', label: 'Recurring', icon: Repeat },
                  { id: 'savings', label: 'Savings', icon: Target },
                  { id: 'backup', label: 'Export/Backup', icon: Database },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileMoreOpen(false);
                      }}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
                <button
                  onClick={() => { logout(); setMobileMoreOpen(false); }}
                  className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

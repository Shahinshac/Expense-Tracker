import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './pages/AuthPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CalendarPage } from './pages/CalendarPage';
import { IncomePage } from './pages/IncomePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AccountsPage } from './pages/AccountsPage';
import { RecurringPage } from './pages/RecurringPage';
import { SavingsPage } from './pages/SavingsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { QuickAddModal } from './components/expenses/QuickAddModal';
import { Category, Account, Expense } from './types';
import { api } from './services/api';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      return 'admin';
    }
    return 'dashboard';
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | null>(null);

  const loadInitialData = async () => {
    try {
      const [cats, accs] = await Promise.all([
        api.getCategories(),
        api.getAccounts()
      ]);
      setCategories(cats);
      setAccounts(accs);
    } catch (err) {
      console.error('Failed to load categories/accounts:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.is_admin) {
        setActiveTab('admin');
        if (window.location.pathname === '/admin/login') {
          window.history.replaceState(null, '', '/admin');
          setCurrentPath('/admin');
        }
      } else {
        loadInitialData();
        if (window.location.pathname === '/admin/login') {
          window.history.replaceState(null, '', '/');
          setCurrentPath('/');
        }
      }
    }
  }, [isAuthenticated, user?.is_admin]);

  // Handle browser back/forward and path changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path === '/admin' || window.location.hash === '#admin') {
        setActiveTab('admin');
      } else if (path === '/' || path === '') {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global Keyboard Shortcuts (e.g. 'n' for Quick Add)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input or textarea, ignore shortcut
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Unauthenticated routing
  if (!isAuthenticated) {
    if (currentPath === '/admin/login') {
      return <AdminLoginPage />;
    }
    if (currentPath === '/admin') {
      // Redirect unauthenticated /admin navigation to /admin/login
      window.history.replaceState(null, '', '/admin/login');
      return <AdminLoginPage />;
    }
    return <AuthPage />;
  }

  // Dedicated Admin Experience: Admin only manages users and approvals, no student features
  if (user?.is_admin) {
    return <AdminPage />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'admin') {
      window.history.pushState(null, '', '/admin');
      setCurrentPath('/admin');
    } else if (window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
      setCurrentPath('/');
    }
  };

  // Normal user attempting to access /admin
  const isUnauthorizedAdminAttempt = (activeTab === 'admin' || currentPath === '/admin') && !user?.is_admin;

  return (
    <AppLayout
      currentTab={activeTab}
      setCurrentTab={handleTabChange}
      onOpenQuickAdd={() => setIsQuickAddOpen(true)}
    >
      {isUnauthorizedAdminAttempt ? (
        <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Administrator privileges are required to access this portal.
          </p>
          <button
            onClick={() => handleTabChange('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardPage
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onSelectExpense={(exp) => {
                setSelectedExpenseForEdit(exp);
                handleTabChange('expenses');
              }}
              onNavigate={handleTabChange}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesPage
              categories={categories}
              accounts={accounts}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              selectedExpenseForEdit={selectedExpenseForEdit}
              onClearSelectedExpense={() => setSelectedExpenseForEdit(null)}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsPage categories={categories} />
          )}

          {activeTab === 'reports' && (
            <ReportsPage />
          )}

          {activeTab === 'calendar' && (
            <CalendarPage />
          )}

          {activeTab === 'income' && (
            <IncomePage accounts={accounts} />
          )}

          {activeTab === 'categories' && (
            <CategoriesPage
              categories={categories}
              onRefreshCategories={loadInitialData}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsPage
              accounts={accounts}
              onRefreshAccounts={loadInitialData}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringPage
              categories={categories}
              accounts={accounts}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsPage />
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}

        </>
      )}

      {/* QUICK ADD MODAL (GLOBAL) */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
        accounts={accounts}
        onExpenseAdded={() => {
          if (activeTab === 'dashboard') {
            window.dispatchEvent(new Event('expense_added'));
          }
        }}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

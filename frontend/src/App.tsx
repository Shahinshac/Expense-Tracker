import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './pages/AuthPage';
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

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

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
      loadInitialData();
    }
  }, [isAuthenticated]);

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

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else if (window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
  };

  return (
    <AppLayout
      currentTab={activeTab}
      setCurrentTab={handleTabChange}
      onOpenQuickAdd={() => setIsQuickAddOpen(true)}
    >
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

      {activeTab === 'admin' && (
        <AdminPage />
      )}

      {/* QUICK ADD MODAL (GLOBAL) */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
        accounts={accounts}
        onExpenseAdded={() => {
          // Re-render dashboard or expenses
          if (activeTab === 'dashboard') {
            // Trigger refresh by switching or let components reload on mount/events
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

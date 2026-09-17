import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Calendar,
  AlertCircle, CheckCircle2, ChevronRight, Plus, ArrowUpRight,
  Sparkles, Clock, Tag
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { DashboardSummary, Expense, Category, Account } from '../types';
import { formatPaise, formatDateRelative, getGreeting, getCategoryIconComponent } from '../utils/formatters';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/common/EmptyState';

interface DashboardPageProps {
  onOpenQuickAdd: () => void;
  onSelectExpense: (expense: Expense) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenQuickAdd,
  onSelectExpense,
  onNavigate
}) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl lg:col-span-2" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const todayDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const categoryChartData = dashboard.category_breakdown.map((item) => ({
    name: item.category_name,
    value: item.amount_paise / 100,
    color: item.color || '#6366f1'
  }));

  const dailyChartData = dashboard.daily_spending.map((item) => ({
    day: item.day_name,
    amount: item.amount_paise / 100
  }));

  return (
    <div className="space-y-6">
      {/* GREETING & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'} 👋
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {todayDateFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickAdd}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Spending */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Today</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatPaise(dashboard.today_spent_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              This Week: {formatPaise(dashboard.this_week_spent_paise)}
            </div>
          </div>
        </div>

        {/* This Month's Spending */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">This Month</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatPaise(dashboard.this_month_spent_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Total Spent so far
            </div>
          </div>
        </div>

        {/* Monthly Budget & Remaining */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Budget Left</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              dashboard.budget_status === 'exceeded'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : dashboard.budget_status === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {dashboard.monthly_budget_paise > 0
                ? formatPaise(dashboard.remaining_budget_paise)
                : 'Not Set'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {dashboard.monthly_budget_paise > 0
                ? `${dashboard.budget_used_percentage}% of ${formatPaise(dashboard.monthly_budget_paise)}`
                : 'Set a monthly limit'}
            </div>
          </div>
        </div>

        {/* Net Balance (Income - Expense) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Balance</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xl sm:text-2xl font-black tracking-tight ${
              dashboard.net_balance_paise >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatPaise(dashboard.net_balance_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Income: {formatPaise(dashboard.this_month_income_paise)}
            </div>
          </div>
        </div>
      </div>

      {/* BUDGET PROGRESS BAR IF SET */}
      {dashboard.monthly_budget_paise > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Monthly Budget Utilization
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  dashboard.budget_status === 'exceeded'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    : dashboard.budget_status === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {dashboard.budget_status === 'exceeded'
                  ? 'Exceeded'
                  : dashboard.budget_status === 'warning'
                  ? 'Near Limit'
                  : 'On Track'}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {dashboard.budget_used_percentage}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dashboard.budget_status === 'exceeded'
                  ? 'bg-rose-500'
                  : dashboard.budget_status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, dashboard.budget_used_percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* SMART INSIGHTS BOX */}
      {dashboard.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dashboard.insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
                insight.type === 'warning'
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                  : insight.type === 'danger'
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                  : insight.type === 'success'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {insight.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                {insight.type === 'danger' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {insight.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              </div>
              <div className="flex-1 font-medium">{insight.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>View details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-xs text-slate-400">
              No expense categories recorded this month yet
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₹${val}`, 'Spent']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="w-full sm:w-1/2 space-y-2 max-h-48 overflow-y-auto pr-1">
                {dashboard.category_breakdown.slice(0, 5).map((item) => (
                  <div key={item.category_id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                        {item.category_name}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white shrink-0">
                      {formatPaise(item.amount_paise)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Spending Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Daily Trend (Last 7 Days)
            </h3>
            <span className="text-xs text-slate-400">Total ₹</span>
          </div>

          <div className="flex-1 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Recent Expenses
            </h3>
            <span className="text-xs text-slate-400">Your latest recorded transactions</span>
          </div>
          <button
            onClick={() => onNavigate('expenses')}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {dashboard.recent_expenses.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Tag}
              title="No expenses yet"
              description="Start recording your daily college expenses with our 3-second quick add!"
              actionLabel="Add First Expense"
              onAction={onOpenQuickAdd}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dashboard.recent_expenses.map((expense) => {
              const IconComp = getCategoryIconComponent(expense.category?.icon || 'tag');
              return (
                <div
                  key={expense.id}
                  onClick={() => onSelectExpense(expense)}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${expense.category?.color || '#6366f1'}15`,
                        color: expense.category?.color || '#6366f1'
                      }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {expense.description || expense.category?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{formatDateRelative(expense.date)}</span>
                        <span>•</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300">
                          {expense.payment_method}
                        </span>
                        {expense.category?.group && (
                          <>
                            <span>•</span>
                            <span>{expense.category.group}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {formatPaise(expense.amount_paise)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {expense.time || ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  PieChart as PieChartIcon, Download, FileSpreadsheet, Calendar,
  TrendingUp, TrendingDown, ArrowUpRight, DollarSign, Wallet,
  CreditCard, ArrowDownRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ReportsSummary } from '../types';
import { formatPaise, getCategoryIconComponent } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState<ReportsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const params: any = { period };
      if (period === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      const data = await api.getAnalytics(params);
      setReports(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load report data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, startDate, endDate]);

  const handleExportCSV = () => {
    const token = localStorage.getItem('token');
    let url = '/api/v1/export/csv';
    if (period === 'custom' && startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    // Download via fetch or anchor
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `expense_report_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        showToast('CSV export downloaded!');
      })
      .catch(() => showToast('Failed to export CSV', 'error'));
  };

  const handleExportExcel = () => {
    const token = localStorage.getItem('token');
    let url = '/api/v1/export/excel';
    if (period === 'custom' && startDate && endDate) {
      url += `?start_date=${startDate}&end_date=${endDate}`;
    }
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `expense_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        showToast('Excel report downloaded!');
      })
      .catch(() => showToast('Failed to export Excel', 'error'));
  };

  const categoryChartData = reports?.category_breakdown.map((item) => ({
    name: item.category_name,
    value: item.amount_paise / 100,
    color: item.color || '#6366f1'
  })) || [];

  const dailyChartData = reports?.daily_spending.map((item) => ({
    day: item.day_name || item.date.slice(5),
    amount: item.amount_paise / 100
  })) || [];

  return (
    <div className="space-y-6">
      {/* HEADER & EXPORT ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Deep dive into where your student funds are being spent
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* PERIOD SELECTOR TABS */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1">
        {[
          { id: 'today', label: 'Today' },
          { id: 'this_week', label: 'This Week' },
          { id: 'this_month', label: 'This Month' },
          { id: 'last_month', label: 'Last Month' },
          { id: 'custom', label: 'Custom Range' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              period === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>
        )}
      </div>

      {/* METRIC SUMMARY CARDS */}
      {isLoading || !reports ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400">Total Spent</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatPaise(reports.total_expense_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {reports.transaction_count} transactions
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400">Total Income</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatPaise(reports.total_income_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Pocket money & receipts
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400">Daily Average</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatPaise(reports.avg_daily_expense_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg per day in period
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400">Highest Expense</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatPaise(reports.highest_expense_paise)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Lowest: {formatPaise(reports.lowest_expense_paise)}
            </div>
          </div>
        </div>
      )}

      {/* CHARTS */}
      {reports && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
              Category Distribution
            </h3>
            {categoryChartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12 text-xs text-slate-400">
                No expense data for selected period
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

                <div className="w-full sm:w-1/2 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {reports.category_breakdown.map((item) => (
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
                        {item.percentage}% ({formatPaise(item.amount_paise)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Trend Bar Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
              Daily Spending Trend
            </h3>
            <div className="flex-1 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
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
      )}

      {/* PAYMENT METHOD BREAKDOWN & TOP EXPENSES */}
      {reports && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Distribution */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
              Payment Methods Used
            </h3>
            <div className="space-y-3">
              {reports.payment_breakdown.map((pm) => (
                <div key={pm.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{pm.method}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPaise(pm.amount_paise)} ({pm.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${pm.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Expenses Ranking */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
              Top Expenses in Period
            </h3>
            <div className="space-y-3">
              {reports.top_expenses.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">No expenses in this period</div>
              ) : (
                reports.top_expenses.map((exp, i) => (
                  <div key={exp.id} className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {exp.description || exp.category?.name}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                        {exp.date}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white shrink-0">
                      {formatPaise(exp.amount_paise)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

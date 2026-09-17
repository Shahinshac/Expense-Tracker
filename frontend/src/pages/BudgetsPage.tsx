import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle2, AlertCircle, Edit3, Plus, ShieldAlert } from 'lucide-react';
import { BudgetStatus, Category } from '../types';
import { formatPaise, rupeesToPaise, paiseToRupees, getCategoryIconComponent } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface BudgetsPageProps {
  categories: Category[];
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({ categories }) => {
  const { showToast } = useToast();
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Budget Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalBudgetRupees, setTotalBudgetRupees] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBudget = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCurrentBudget();
      setBudgetStatus(data);

      if (data) {
        setTotalBudgetRupees(paiseToRupees(data.total_budget_paise).toString());
        setAlertThreshold(data.alert_threshold_percent || 80);
        const map: Record<number, string> = {};
        data.categories.forEach((c: any) => {
          map[c.category_id] = paiseToRupees(c.budget_paise).toString();
        });
        setCategoryBudgets(map);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalVal = parseFloat(totalBudgetRupees);
    if (isNaN(totalVal) || totalVal <= 0) {
      showToast('Please enter a valid monthly budget', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const catList = Object.entries(categoryBudgets)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([catId, val]) => ({
          category_id: Number(catId),
          amount_paise: rupeesToPaise(parseFloat(val))
        }));

      await api.setBudget({
        month: currentMonth,
        total_budget_paise: rupeesToPaise(totalVal),
        alert_threshold_percent: alertThreshold,
        categories: catList
      });

      showToast('Monthly budget saved successfully!');
      setIsModalOpen(false);
      fetchBudget();
    } catch (err: any) {
      showToast(err.message || 'Failed to save budget', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Monthly Budgets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Keep spending under control for {currentMonthName}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>{budgetStatus ? 'Modify Budget' : 'Set Budget'}</span>
        </button>
      </div>

      {/* OVERALL BUDGET CARD */}
      {budgetStatus ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Monthly Limit
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    budgetStatus.status === 'exceeded'
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                      : budgetStatus.status === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {budgetStatus.status === 'exceeded' && <AlertTriangle className="w-3 h-3" />}
                  {budgetStatus.status === 'warning' && <AlertCircle className="w-3 h-3" />}
                  {budgetStatus.status === 'normal' && <CheckCircle2 className="w-3 h-3" />}
                  <span>
                    {budgetStatus.status === 'exceeded'
                      ? 'Budget Exceeded'
                      : budgetStatus.status === 'warning'
                      ? 'Near Alert Limit'
                      : 'Within Safe Budget'}
                  </span>
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {formatPaise(budgetStatus.total_budget_paise)}
              </div>
            </div>

            <div className="flex items-center gap-6 sm:text-right">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Spent</span>
                <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                  {formatPaise(budgetStatus.spent_paise)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Remaining</span>
                <span
                  className={`text-base sm:text-lg font-bold ${
                    budgetStatus.remaining_paise >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPaise(budgetStatus.remaining_paise)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>Progress</span>
              <span>{budgetStatus.percentage_used}% used</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetStatus.status === 'exceeded'
                    ? 'bg-rose-500'
                    : budgetStatus.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, budgetStatus.percentage_used)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            No Budget Set for {currentMonthName}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Setting a monthly budget helps you keep college spending on track and gives you early warnings before running out of pocket money.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Set Monthly Budget Now</span>
          </button>
        </div>
      )}

      {/* CATEGORY-WISE BUDGETS */}
      {budgetStatus && budgetStatus.categories && budgetStatus.categories.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Category Budgets
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetStatus.categories.map((cat) => {
              const IconComp = getCategoryIconComponent(cat.category_icon || 'tag');
              return (
                <div
                  key={cat.category_id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${cat.category_color}18`,
                          color: cat.category_color
                        }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {cat.category_name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        cat.status === 'exceeded'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : cat.status === 'warning'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {cat.percentage_used}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Spent: <strong className="text-slate-700 dark:text-slate-300">{formatPaise(cat.spent_paise)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Limit: <strong className="text-slate-700 dark:text-slate-300">{formatPaise(cat.budget_paise)}</strong>
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cat.status === 'exceeded'
                          ? 'bg-rose-500'
                          : cat.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, cat.percentage_used)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BUDGET CONFIG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Configure {currentMonthName} Budget
            </h3>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              {/* Overall Monthly Budget */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Overall Monthly Budget (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 8000"
                  value={totalBudgetRupees}
                  onChange={(e) => setTotalBudgetRupees(e.target.value)}
                  className="w-full text-xl font-bold rounded-2xl px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              {/* Alert Threshold */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Warning Alert Threshold</span>
                  <span className="text-indigo-600 font-bold">{alertThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-[11px] text-slate-400">
                  Notify when spending reaches {alertThreshold}% of total budget.
                </span>
              </div>

              {/* Category-wise Budgets */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category Limits (Optional)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate w-36">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-1 w-32">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          placeholder="Limit"
                          value={categoryBudgets[cat.id] || ''}
                          onChange={(e) =>
                            setCategoryBudgets({ ...categoryBudgets, [cat.id]: e.target.value })
                          }
                          className="w-full text-xs rounded-xl px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

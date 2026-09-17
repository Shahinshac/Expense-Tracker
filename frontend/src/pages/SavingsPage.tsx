import React, { useState, useEffect } from 'react';
import { Plus, Target, PiggyBank, CheckCircle2, Trash2, Edit2, ArrowUpRight } from 'lucide-react';
import { SavingsGoal } from '../types';
import { formatPaise, rupeesToPaise, paiseToRupees } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const SavingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create/Edit Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [currentStr, setCurrentStr] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3b82f6');

  // Deposit Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositingGoal, setDepositingGoal] = useState<SavingsGoal | null>(null);
  const [depositAmountStr, setDepositAmountStr] = useState('');

  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSavingsGoals();
      setGoals(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load savings goals', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetStr('');
    setCurrentStr('0');
    setTargetDate('');
    setColor('#3b82f6');
    setIsGoalModalOpen(true);
  };

  const openDepositModal = (g: SavingsGoal) => {
    setDepositingGoal(g);
    setDepositAmountStr('');
    setIsDepositModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(targetStr);
    if (isNaN(targetVal) || targetVal <= 0) {
      showToast('Please enter a valid target amount', 'error');
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        target_amount_paise: rupeesToPaise(targetVal),
        current_amount_paise: rupeesToPaise(parseFloat(currentStr) || 0),
        target_date: targetDate || undefined,
        color,
        icon: 'target'
      };

      if (editingGoal) {
        await api.updateSavingsGoal(editingGoal.id, payload);
        showToast('Savings goal updated');
      } else {
        await api.createSavingsGoal(payload);
        showToast(`Goal "${title}" created!`);
      }

      setIsGoalModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      showToast(err.message || 'Failed to save goal', 'error');
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositingGoal) return;
    const depVal = parseFloat(depositAmountStr);
    if (isNaN(depVal) || depVal <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }

    try {
      await api.depositToGoal(depositingGoal.id, rupeesToPaise(depVal));
      showToast(`Deposited ₹${depVal} to "${depositingGoal.title}"!`);
      setIsDepositModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      showToast(err.message || 'Failed to deposit to goal', 'error');
    }
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    try {
      await api.deleteSavingsGoal(goalToDelete.id);
      showToast('Goal deleted');
      setGoalToDelete(null);
      fetchGoals();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete goal', 'error');
    }
  };

  const totalSavedPaise = goals.reduce((acc, curr) => acc + curr.current_amount_paise, 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Savings Goals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Save for laptops, semester trips, electronics & emergency funds
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* TOTAL SAVINGS CARD */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400">Total Funds Saved</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {formatPaise(totalSavedPaise)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <PiggyBank className="w-6 h-6" />
        </div>
      </div>

      {/* GOALS GRID */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No savings goals created"
          description="Plan ahead for your next semester trip, gadget upgrade, or book reserve."
          actionLabel="Create First Goal"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${goal.color}18`, color: goal.color }}
                  >
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{goal.title}</span>
                      {goal.is_completed && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Target: {formatPaise(goal.target_amount_paise)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setGoalToDelete(goal)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Saved: {formatPaise(goal.current_amount_paise)}</span>
                  <span>{goal.percentage_achieved}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${goal.percentage_achieved}%`,
                      backgroundColor: goal.color
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {goal.target_date ? `Target: ${goal.target_date}` : 'No deadline'}
                </span>

                <button
                  onClick={() => openDepositModal(goal)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Money</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingGoal ? 'Edit Goal' : 'New Savings Goal'}
            </h3>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Laptop, Goa Trip, Bike Downpayment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Target (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetStr}
                    onChange={(e) => setTargetStr(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Already Saved (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentStr}
                    onChange={(e) => setCurrentStr(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Target Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT MODAL */}
      {isDepositModalOpen && depositingGoal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Deposit to {depositingGoal.title}
            </h3>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Amount to Deposit (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={depositAmountStr}
                  onChange={(e) => setDepositAmountStr(e.target.value)}
                  className="w-full text-2xl font-bold rounded-2xl px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              {/* Quick chips */}
              <div className="flex gap-2">
                {[100, 500, 1000, 2000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const curr = parseFloat(depositAmountStr) || 0;
                      setDepositAmountStr((curr + chip).toString());
                    }}
                    className="flex-1 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    +{chip}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmModal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Savings Goal?"
        message={`Are you sure you want to delete goal "${goalToDelete?.title}"?`}
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
};

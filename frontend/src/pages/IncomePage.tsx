import React, { useState, useEffect } from 'react';
import { Plus, ArrowDownLeft, Trash2, Edit2, Wallet, Calendar } from 'lucide-react';
import { Income, Account } from '../types';
import { formatPaise, rupeesToPaise, paiseToRupees, formatDateRelative } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface IncomePageProps {
  accounts: Account[];
}

export const IncomePage: React.FC<IncomePageProps> = ({ accounts }) => {
  const { showToast } = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [source, setSource] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIncomes = async () => {
    try {
      setIsLoading(true);
      const data = await api.getIncomes();
      setIncomes(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load income records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const openCreateModal = () => {
    setEditingIncome(null);
    setSource('');
    setAmountStr('');
    setDateStr(new Date().toISOString().slice(0, 10));
    setAccountId(null);
    setNote('');
    setIsModalOpen(true);
  };

  const openEditModal = (inc: Income) => {
    setEditingIncome(inc);
    setSource(inc.source);
    setAmountStr(paiseToRupees(inc.amount_paise).toString());
    setDateStr(inc.date);
    setAccountId(inc.account_id || null);
    setNote(inc.note || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid income amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        source: source.trim() || 'Income',
        amount_paise: rupeesToPaise(val),
        date: dateStr,
        account_id: accountId || undefined,
        note: note.trim() || undefined
      };

      if (editingIncome) {
        await api.updateIncome(editingIncome.id, payload);
        showToast('Income updated successfully');
      } else {
        await api.createIncome(payload);
        showToast(`Added income of ₹${val}!`);
      }

      setIsModalOpen(false);
      fetchIncomes();
    } catch (err: any) {
      showToast(err.message || 'Failed to save income', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!incomeToDelete) return;
    try {
      await api.deleteIncome(incomeToDelete.id);
      showToast('Income record deleted');
      setIncomeToDelete(null);
      fetchIncomes();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete income', 'error');
    }
  };

  const totalIncomePaise = incomes.reduce((acc, curr) => acc + curr.amount_paise, 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Income & Money Received
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pocket money from parents, scholarships, refunds & part-time income
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>

      {/* TOTAL CARD */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400">Total Income Recorded</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatPaise(totalIncomePaise)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <ArrowDownLeft className="w-6 h-6" />
        </div>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : incomes.length === 0 ? (
        <EmptyState
          icon={ArrowDownLeft}
          title="No income recorded yet"
          description="Log pocket money or family transfers to accurately monitor your balance and savings."
          actionLabel="Add First Income"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {incomes.map((inc) => (
            <div
              key={inc.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {inc.source}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{formatDateRelative(inc.date)}</span>
                    {inc.note && (
                      <>
                        <span>•</span>
                        <span className="italic">{inc.note}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    +{formatPaise(inc.amount_paise)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(inc)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIncomeToDelete(inc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingIncome ? 'Edit Income' : 'Add Income'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full text-2xl font-bold rounded-2xl px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Source Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Pocket Money, Scholarship, Freelance"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Target Wallet
                    </label>
                    <select
                      value={accountId || ''}
                      onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="">None</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  {editingIncome ? 'Save Changes' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmModal
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Income Record?"
        message={`Are you sure you want to delete this income record of ${incomeToDelete ? formatPaise(incomeToDelete.amount_paise) : ''}?`}
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
};

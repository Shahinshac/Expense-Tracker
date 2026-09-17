import React, { useState, useEffect } from 'react';
import { Plus, Repeat, Calendar, Trash2, Edit2, Play, CheckCircle2 } from 'lucide-react';
import { RecurringExpense, Category, Account } from '../types';
import { formatPaise, rupeesToPaise, paiseToRupees, getCategoryIconComponent } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface RecurringPageProps {
  categories: Category[];
  accounts: Account[];
}

export const RecurringPage: React.FC<RecurringPageProps> = ({ categories, accounts }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [itemToDelete, setItemToDelete] = useState<RecurringExpense | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const data = await api.getRecurring();
      setItems(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load recurring expenses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setAmountStr('');
    setCategoryId(categories[0]?.id || 0);
    setFrequency('monthly');
    setStartDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('UPI');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        amount_paise: rupeesToPaise(val),
        category_id: categoryId,
        frequency,
        start_date: startDate,
        payment_method: paymentMethod,
        is_active: true
      };

      if (editingItem) {
        await api.updateRecurring(editingItem.id, payload);
        showToast('Recurring expense updated');
      } else {
        await api.createRecurring(payload);
        showToast(`Created recurring expense "${name}"`);
      }

      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Failed to save recurring expense', 'error');
    }
  };

  const handleProcessNow = async () => {
    try {
      setIsProcessing(true);
      const res = await api.processRecurring();
      showToast(res.message || 'Processed recurring expenses');
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Process failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteRecurring(itemToDelete.id);
      showToast('Recurring expense deleted');
      setItemToDelete(null);
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Recurring Expenses & Subscriptions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automate routine expenses like mobile recharges, hostel mess, and subscriptions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleProcessNow}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Process Due</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recurring</span>
          </button>
        </div>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring expenses configured"
          description="Set up repeating costs like mobile data pack, Spotify, or college canteen coupon."
          actionLabel="Add Recurring Expense"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const IconComp = getCategoryIconComponent(item.category?.icon || 'tag');
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${item.category?.color || '#6366f1'}18`,
                        color: item.category?.color || '#6366f1'
                      }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</h3>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {item.frequency} • {item.payment_method}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatPaise(item.amount_paise)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Next Due: <strong className="text-slate-700 dark:text-slate-300">{item.next_due_date}</strong></span>
                  </div>

                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Add Recurring Expense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jio 5G Recharge, Spotify, Wi-Fi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full text-sm rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>
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
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Recurring Expense?"
        message={`Are you sure you want to stop recurring expense "${itemToDelete?.name}"?`}
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
};

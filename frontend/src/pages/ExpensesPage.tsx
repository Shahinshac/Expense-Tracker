import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Plus, Calendar, ArrowUpDown, MoreVertical,
  Edit2, Copy, Trash2, Tag, Paperclip, ChevronDown, Check
} from 'lucide-react';
import { Expense, Category, Account } from '../types';
import { formatPaise, formatDateRelative, getCategoryIconComponent } from '../utils/formatters';
import { api, getAttachmentUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EditExpenseModal } from '../components/expenses/EditExpenseModal';

interface ExpensesPageProps {
  categories: Category[];
  accounts: Account[];
  onOpenQuickAdd: () => void;
  selectedExpenseForEdit: Expense | null;
  onClearSelectedExpense: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  categories,
  accounts,
  onOpenQuickAdd,
  selectedExpenseForEdit,
  onClearSelectedExpense
}) => {
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Modals
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedExpenseForEdit) {
      setEditingExpense(selectedExpenseForEdit);
      onClearSelectedExpense();
    }
  }, [selectedExpenseForEdit]);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {
        sort_by: sortBy,
        limit: 200
      };

      if (selectedCategoryId) params.category_id = selectedCategoryId;
      if (selectedPaymentMethod) params.payment_method = selectedPaymentMethod;
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (dateFilter === 'today') {
        params.date_from = todayStr;
        params.date_to = todayStr;
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        params.date_from = startOfWeek.toISOString().split('T')[0];
        params.date_to = todayStr;
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        params.date_from = startOfMonth.toISOString().split('T')[0];
        params.date_to = todayStr;
      } else if (dateFilter === 'custom') {
        if (customStartDate) params.date_from = customStartDate;
        if (customEndDate) params.date_to = customEndDate;
      }

      const data = await api.getExpenses(params);
      setExpenses(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load expenses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExpenses();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategoryId, selectedPaymentMethod, dateFilter, customStartDate, customEndDate, sortBy]);

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateExpense(id);
      showToast('Expense duplicated!');
      fetchExpenses();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate expense', 'error');
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await api.deleteExpense(expenseToDelete.id);
      showToast('Expense deleted');
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  // Group expenses by Date
  const groupedExpenses = useMemo(() => {
    const groups: { date: string; displayDate: string; totalPaise: number; items: Expense[] }[] = [];
    
    expenses.forEach((expense) => {
      let group = groups.find((g) => g.date === expense.date);
      if (!group) {
        group = {
          date: expense.date,
          displayDate: formatDateRelative(expense.date),
          totalPaise: 0,
          items: []
        };
        groups.push(group);
      }
      group.items.push(expense);
      group.totalPaise += expense.amount_paise;
    });

    return groups;
  }, [expenses]);

  const totalFilteredPaise = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount_paise, 0);
  }, [expenses]);

  return (
    <div className="space-y-5">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Expense History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing {expenses.length} records • Total: <span className="font-bold text-slate-800 dark:text-slate-200">{formatPaise(totalFilteredPaise)}</span>
          </p>
        </div>

        <button
          onClick={onOpenQuickAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Search by description, note, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm rounded-xl pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer border border-transparent focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer border border-transparent focus:border-indigo-500"
          >
            <option value="">All Payment Methods</option>
            {['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer border border-transparent focus:border-indigo-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer border border-transparent focus:border-indigo-500 ml-auto"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-xs rounded-xl px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
            <span className="text-xs text-slate-400">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-xs rounded-xl px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>
        )}
      </div>

      {/* EXPENSES LIST */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No expenses found"
          description={
            searchQuery || selectedCategoryId || selectedPaymentMethod || dateFilter !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Start logging your daily expenses with one click!'
          }
          actionLabel="Add Expense"
          onAction={onOpenQuickAdd}
        />
      ) : (
        <div className="space-y-6">
          {groupedExpenses.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Date Group Header with Day Total */}
              <div className="flex items-center justify-between px-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {group.displayDate}
                </span>
                <span className="font-semibold text-slate-400">
                  Subtotal: {formatPaise(group.totalPaise)}
                </span>
              </div>

              {/* Transactions in this date */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {group.items.map((expense) => {
                  const IconComp = getCategoryIconComponent(expense.category?.icon || 'tag');
                  return (
                    <div
                      key={expense.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${expense.category?.color || '#6366f1'}18`,
                            color: expense.category?.color || '#6366f1'
                          }}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                            <span>{expense.description || expense.category?.name}</span>
                            {expense.attachment_url && (
                              <button
                                onClick={() => setViewingReceiptUrl(expense.attachment_url || null)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-0.5"
                                title="View Receipt"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {expense.category?.name}
                            </span>
                            <span>•</span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400">
                              {expense.payment_method}
                            </span>
                            {expense.time && (
                              <>
                                <span>•</span>
                                <span>{expense.time}</span>
                              </>
                            )}
                            {expense.note && (
                              <>
                                <span>•</span>
                                <span className="italic truncate max-w-xs">{expense.note}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {formatPaise(expense.amount_paise)}
                          </div>
                        </div>

                        {/* Row Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(expense.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        categories={categories}
        accounts={accounts}
        onExpenseUpdated={fetchExpenses}
        onDeleteExpense={(id) => {
          const exp = expenses.find((e) => e.id === id);
          if (exp) {
            setEditingExpense(null);
            setExpenseToDelete(exp);
          }
        }}
      />

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Expense?"
        message={`Are you sure you want to delete this expense of ${expenseToDelete ? formatPaise(expenseToDelete.amount_paise) : ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        isDanger={true}
      />

      {/* RECEIPT VIEWER MODAL */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Receipt / Bill Attachment</h3>
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
              <img
                src={getAttachmentUrl(viewingReceiptUrl)}
                alt="Receipt"
                className="max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Upload, Loader2, Receipt } from 'lucide-react';
import { Category, Account } from '../../types';
import { rupeesToPaise, getCategoryIconComponent } from '../../utils/formatters';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  onExpenseAdded: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onExpenseAdded
}) => {
  const { showToast } = useToast();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);

  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [timeStr, setTimeStr] = useState(new Date().toTimeString().slice(0, 5));
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Synchronize categories from props
  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
      if (!selectedCategoryId) {
        const foodCat = categories.find((c) => c.name.toLowerCase() === 'food');
        setSelectedCategoryId(foodCat ? foodCat.id : categories[0].id);
      }
    }
  }, [categories]);

  // Ensure categories are loaded when modal is opened (fallback to API if parent categories are empty)
  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setDescription('');
      setNote('');
      setAttachmentUrl(null);
      setShowMoreDetails(false);
      setDateStr(new Date().toISOString().split('T')[0]);
      setTimeStr(new Date().toTimeString().slice(0, 5));

      if (!localCategories || localCategories.length === 0) {
        setIsLoadingCategories(true);
        api.getCategories()
          .then((cats) => {
            if (cats && Array.isArray(cats)) {
              setLocalCategories(cats);
              if (cats.length > 0 && !selectedCategoryId) {
                const foodCat = cats.find((c) => c.name.toLowerCase() === 'food');
                setSelectedCategoryId(foodCat ? foodCat.id : cats[0].id);
              }
            }
          })
          .catch((err) => {
            console.error('Failed to load categories in modal:', err);
          })
          .finally(() => {
            setIsLoadingCategories(false);
          });
      }

      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + val).toString());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await api.uploadReceipt(file);
      setAttachmentUrl(res.file_path || res.file_url);
      showToast('Receipt attached successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload receipt', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amountStr);
    if (!amountVal || amountVal <= 0) {
      showToast('Please enter a valid amount', 'error');
      amountInputRef.current?.focus();
      return;
    }

    if (!selectedCategoryId) {
      showToast('Please select a category', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const paise = rupeesToPaise(amountVal);

      // Auto-populate description if empty based on category
      const activeCat = localCategories.find((c) => c.id === selectedCategoryId);
      const desc = description.trim() || activeCat?.name || 'Expense';

      await api.createExpense({
        amount_paise: paise,
        category_id: selectedCategoryId,
        account_id: selectedAccountId || undefined,
        payment_method: paymentMethod,
        date: dateStr,
        time: timeStr,
        description: desc,
        note: note.trim() || undefined,
        attachment_url: attachmentUrl || undefined
      });

      showToast(`Added ₹${amountVal} for ${desc}!`);
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to add expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategory = localCategories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Add Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* AMOUNT INPUT */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <div className="relative flex items-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 border-2 border-transparent focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all p-2">
              <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 pl-3 select-none">
                ₹
              </span>
              <input
                ref={amountInputRef}
                type="number"
                step="any"
                min="0.01"
                placeholder="Enter amount"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white bg-transparent px-2 py-1 outline-none tracking-tight placeholder:text-slate-400 placeholder:text-lg sm:placeholder:text-2xl placeholder:font-normal"
                required
              />
            </div>

            {/* Quick chips */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAddQuickAmount(q)}
                  className="text-xs font-semibold py-1 px-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 transition-colors shrink-0 active:scale-95 cursor-pointer"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* CATEGORIES SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Category
              </label>
              {activeCategory && (
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {activeCategory.name}
                </span>
              )}
            </div>

            {isLoadingCategories ? (
              <div className="flex items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs text-slate-400 font-medium">Loading categories...</span>
              </div>
            ) : localCategories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                No categories available
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                {localCategories.map((cat) => {
                  const IconComponent = getCategoryIconComponent(cat.icon);
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.03] ring-2 ring-indigo-500'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/50 dark:border-slate-700/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                          isSelected ? 'bg-white/20' : ''
                        }`}
                        style={{ color: isSelected ? 'white' : cat.color }}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold leading-tight truncate w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAYMENT METHOD */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank'].map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border-2 border-indigo-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <input
              type="text"
              placeholder="Enter a description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* TOGGLE MORE DETAILS (Date, Account, Attachment, Note) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showMoreDetails ? 'Hide extra details' : '+ Add date, bill photo, or note'}</span>
            </button>
          </div>

          {showMoreDetails && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Wallet / Account Selection */}
              {accounts.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Deduct From Account (Optional)
                  </label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">None (Just record expense)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (₹{(acc.balance_paise / 100).toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter notes (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Receipt Attachment */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Receipt / Bill Photo
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-indigo-600" />
                    )}
                    <span>{attachmentUrl ? 'Change Receipt' : 'Upload Bill Photo'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  {attachmentUrl && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Attached
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Save Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

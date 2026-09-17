import React, { useState } from 'react';
import { Plus, Wallet, Edit2, Trash2, Smartphone, Banknote, Building } from 'lucide-react';
import { Account } from '../types';
import { formatPaise, rupeesToPaise, paiseToRupees } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface AccountsPageProps {
  accounts: Account[];
  onRefreshAccounts: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ accounts, onRefreshAccounts }) => {
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('upi');
  const [balanceStr, setBalanceStr] = useState('0');
  const [color, setColor] = useState('#10b981');
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('upi');
    setBalanceStr('0');
    setColor('#10b981');
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalanceStr(paiseToRupees(acc.balance_paise).toString());
    setColor(acc.color);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(balanceStr) || 0;

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        type,
        balance_paise: rupeesToPaise(bal),
        color,
        icon: type === 'cash' ? 'banknote' : type === 'upi' ? 'smartphone' : 'building'
      };

      if (editingAccount) {
        await api.updateAccount(editingAccount.id, payload);
        showToast('Wallet updated successfully');
      } else {
        await api.createAccount(payload);
        showToast(`Wallet "${name}" added!`);
      }

      setIsModalOpen(false);
      onRefreshAccounts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    try {
      await api.deleteAccount(accountToDelete.id);
      showToast('Account deleted');
      setAccountToDelete(null);
      onRefreshAccounts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
    }
  };

  const totalBalancePaise = accounts.reduce((acc, curr) => acc + curr.balance_paise, 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Wallets & Payment Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track where your money is kept (Cash in pocket, Google Pay, Bank balance)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* TOTAL BALANCE CARD */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400">Total Liquid Balance</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {formatPaise(totalBalancePaise)}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Wallet className="w-6 h-6" />
        </div>
      </div>

      {/* ACCOUNTS LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${acc.color}18`, color: acc.color }}
                >
                  {acc.type === 'cash' ? (
                    <Banknote className="w-5 h-5" />
                  ) : acc.type === 'upi' ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Building className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{acc.name}</h3>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    {acc.type}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(acc)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAccountToDelete(acc)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Available Balance</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {formatPaise(acc.balance_paise)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingAccount ? 'Edit Wallet / Account' : 'Add Wallet / Account'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Pay, Cash in Wallet, SBI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm rounded-xl px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="upi">UPI App (GPay/PhonePe)</option>
                    <option value="cash">Cash in Pocket</option>
                    <option value="bank">Bank Account</option>
                    <option value="savings">Savings Pocket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Current Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={balanceStr}
                    onChange={(e) => setBalanceStr(e.target.value)}
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
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Wallet / Account?"
        message={`Are you sure you want to delete ${accountToDelete?.name}?`}
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
};

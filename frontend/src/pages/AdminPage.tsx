import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, XCircle, Ban, Trash2,
  RefreshCw, Search, ShieldCheck, ShieldAlert,
  AlertTriangle, Clock, ChevronRight, UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { AdminUser, AdminStats } from '../types';

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'reject' | 'disable' | 'delete' | null;
    targetUser: AdminUser | null;
  }>({
    isOpen: false,
    action: null,
    targetUser: null,
  });

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(activeFilter)
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load administrator data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [activeFilter]);

  const handleApprove = async (user: AdminUser) => {
    setActionLoadingId(user.id);
    try {
      await api.approveUser(user.id);
      showToast(`Account approved for ${user.email}`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve user', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEnable = async (user: AdminUser) => {
    setActionLoadingId(user.id);
    try {
      await api.enableUser(user.id);
      showToast(`Account re-enabled for ${user.email}`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to enable user', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const executeConfirmedAction = async () => {
    const { action, targetUser } = confirmModal;
    if (!action || !targetUser) return;

    setActionLoadingId(targetUser.id);
    setConfirmModal({ isOpen: false, action: null, targetUser: null });

    try {
      if (action === 'reject') {
        await api.rejectUser(targetUser.id);
        showToast(`Registration rejected for ${targetUser.email}`, 'info');
      } else if (action === 'disable') {
        await api.disableUser(targetUser.id);
        showToast(`Account disabled for ${targetUser.email}`, 'info');
      } else if (action === 'delete') {
        await api.deleteUser(targetUser.id);
        showToast(`User ${targetUser.email} permanently deleted`, 'info');
      }
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || `Failed to ${action} user`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // If user is not an admin, display access denied safely
  if (!currentUser?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Administrator privileges are required to view this page.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      (u.full_name && u.full_name.toLowerCase().includes(query))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Ban className="w-3 h-3" />
            Disabled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Approvals & Management
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <ShieldCheck className="w-3 h-3" />
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review registration requests, approve new accounts, and control system access.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats?.total_users ?? '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.pending_users ?? '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Approved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats?.approved_users ?? '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Disabled</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-2">
            {stats?.disabled_users ?? '—'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DISABLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              {tab === 'PENDING' && (stats?.pending_users ?? 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
                  {stats?.pending_users}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Users List: Desktop Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No users found</div>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try matching a different email or name' : `No users with status "${activeFilter}"`}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Registered</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isActionLoading = actionLoadingId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {u.full_name || 'No Name Provided'}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          {u.college_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{u.college_name}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Student</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(u.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isSelf ? (
                            <span className="text-[11px] text-slate-400 italic">Your Account</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Pending Actions */}
                              {u.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(u)}
                                    disabled={isActionLoading}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setConfirmModal({ isOpen: true, action: 'reject', targetUser: u })}
                                    disabled={isActionLoading}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* Approved Actions */}
                              {u.status === 'APPROVED' && (
                                <button
                                  onClick={() => setConfirmModal({ isOpen: true, action: 'disable', targetUser: u })}
                                  disabled={isActionLoading}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/80 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Disable
                                </button>
                              )}

                              {/* Rejected Actions */}
                              {u.status === 'REJECTED' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(u)}
                                    disabled={isActionLoading}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setConfirmModal({ isOpen: true, action: 'delete', targetUser: u })}
                                    disabled={isActionLoading}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {/* Disabled Actions */}
                              {u.status === 'DISABLED' && (
                                <>
                                  <button
                                    onClick={() => handleEnable(u)}
                                    disabled={isActionLoading}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    Enable
                                  </button>
                                  <button
                                    onClick={() => setConfirmModal({ isOpen: true, action: 'delete', targetUser: u })}
                                    disabled={isActionLoading}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Layout */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isActionLoading = actionLoadingId === u.id;

                return (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                          {u.full_name || 'No Name'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</div>
                        {u.college_name && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{u.college_name}</div>
                        )}
                      </div>
                      <div>{getStatusBadge(u.status)}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-800/60">
                      <span>
                        Reg: {new Date(u.created_at).toLocaleDateString()}
                      </span>
                      <span>{u.is_admin ? 'Role: Administrator' : 'Role: Student'}</span>
                    </div>

                    {/* Actions on Mobile */}
                    {!isSelf && (
                      <div className="flex items-center gap-2 pt-1">
                        {u.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(u)}
                              disabled={isActionLoading}
                              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-center transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, action: 'reject', targetUser: u })}
                              disabled={isActionLoading}
                              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-center transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {u.status === 'APPROVED' && (
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, action: 'disable', targetUser: u })}
                            disabled={isActionLoading}
                            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-center transition-colors"
                          >
                            Disable Account
                          </button>
                        )}

                        {u.status === 'REJECTED' && (
                          <>
                            <button
                              onClick={() => handleApprove(u)}
                              disabled={isActionLoading}
                              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-center transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, action: 'delete', targetUser: u })}
                              disabled={isActionLoading}
                              className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-center transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}

                        {u.status === 'DISABLED' && (
                          <>
                            <button
                              onClick={() => handleEnable(u)}
                              disabled={isActionLoading}
                              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-center transition-colors"
                            >
                              Enable Account
                            </button>
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, action: 'delete', targetUser: u })}
                              disabled={isActionLoading}
                              className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-center transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && confirmModal.targetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {confirmModal.action === 'reject' && 'Reject Registration Request'}
                {confirmModal.action === 'disable' && 'Disable User Account'}
                {confirmModal.action === 'delete' && 'Permanently Delete User'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {confirmModal.action === 'reject' && (
                  <>Are you sure you want to reject registration for <strong className="text-slate-700 dark:text-slate-300">{confirmModal.targetUser.email}</strong>? They will not be permitted to log in.</>
                )}
                {confirmModal.action === 'disable' && (
                  <>Are you sure you want to disable <strong className="text-slate-700 dark:text-slate-300">{confirmModal.targetUser.email}</strong>? Their active sessions and login will be suspended immediately.</>
                )}
                {confirmModal.action === 'delete' && (
                  <>Are you sure you want to permanently delete <strong className="text-slate-700 dark:text-slate-300">{confirmModal.targetUser.email}</strong>? All associated records will be removed. This action cannot be undone.</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, action: null, targetUser: null })}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer ${
                  confirmModal.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.action === 'disable'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.action === 'reject' && 'Confirm Reject'}
                {confirmModal.action === 'disable' && 'Confirm Disable'}
                {confirmModal.action === 'delete' && 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

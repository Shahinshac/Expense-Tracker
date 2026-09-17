import type { AdminUser, AdminStats, RegisterResponse } from '../types';

let cleanApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
if (cleanApiUrl.endsWith('/api/v1')) {
  cleanApiUrl = cleanApiUrl.replace(/\/api\/v1$/, '');
}
const RAW_API_URL = cleanApiUrl;
const API_BASE = RAW_API_URL ? `${RAW_API_URL}/api/v1` : '/api/v1';

export function getAttachmentUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return RAW_API_URL ? `${RAW_API_URL}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        'Unable to connect to the backend server. If the server is on Render free-tier, it may be waking up from cold sleep (takes ~45s). Please wait a moment and try again.'
      );
    }
    throw err;
  }

  if (response.status === 401) {
    let errorDetail = 'Incorrect email or password.';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // response was not JSON
    }

    // Only dispatch auth:unauthorized and clear token if on an authenticated endpoint, not during login
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/admin/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(errorDetail);
  }

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // response wasn't json
    }
    throw new Error(errorDetail);
  }

  // If response is empty (e.g. 204 or void response)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  adminLogin: (data: { username: string; password: string }) =>
    request<any>('/auth/admin/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (data: any) => request<any>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (params?: Record<string, any>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v.toString());
      });
    }
    const qStr = query.toString();
    return request<any[]>(`/expenses/${qStr ? '?' + qStr : ''}`);
  },
  createExpense: (data: any) => request<any>('/expenses/', { method: 'POST', body: JSON.stringify(data) }),
  getExpense: (id: number) => request<any>(`/expenses/${id}`),
  updateExpense: (id: number, data: any) => request<any>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: number) => request<any>(`/expenses/${id}`, { method: 'DELETE' }),
  duplicateExpense: (id: number) => request<any>(`/expenses/${id}/duplicate`, { method: 'POST' }),

  // Categories
  getCategories: () => request<any[]>('/categories/'),
  createCategory: (data: any) => request<any>('/categories/', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number, reassignTo?: number) => {
    const q = reassignTo ? `?reassign_to_category_id=${reassignTo}` : '';
    return request<any>(`/categories/${id}${q}`, { method: 'DELETE' });
  },

  // Accounts
  getAccounts: () => request<any[]>('/accounts/'),
  createAccount: (data: any) => request<any>('/accounts/', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: any) => request<any>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: number) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),

  // Budgets
  getCurrentBudget: () => request<any>('/budgets/current'),
  getBudgetByMonth: (month: string) => request<any>(`/budgets/${month}`),
  setBudget: (data: any) => request<any>('/budgets/', { method: 'POST', body: JSON.stringify(data) }),

  // Income
  getIncomes: () => request<any[]>('/income/'),
  createIncome: (data: any) => request<any>('/income/', { method: 'POST', body: JSON.stringify(data) }),
  updateIncome: (id: number, data: any) => request<any>(`/income/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIncome: (id: number) => request<any>(`/income/${id}`, { method: 'DELETE' }),

  // Recurring
  getRecurring: () => request<any[]>('/recurring/'),
  createRecurring: (data: any) => request<any>('/recurring/', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurring: (id: number, data: any) => request<any>(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecurring: (id: number) => request<any>(`/recurring/${id}`, { method: 'DELETE' }),
  processRecurring: () => request<any>('/recurring/process', { method: 'POST' }),

  // Savings Goals
  getSavingsGoals: () => request<any[]>('/savings/'),
  createSavingsGoal: (data: any) => request<any>('/savings/', { method: 'POST', body: JSON.stringify(data) }),
  updateSavingsGoal: (id: number, data: any) => request<any>(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  depositToGoal: (id: number, amount_paise: number) => request<any>(`/savings/${id}/deposit`, { method: 'POST', body: JSON.stringify({ amount_paise }) }),
  deleteSavingsGoal: (id: number) => request<any>(`/savings/${id}`, { method: 'DELETE' }),

  // Reports & Analytics
  getDashboard: () => request<any>('/reports/dashboard'),
  getAnalytics: (params?: { period?: string; start_date?: string; end_date?: string }) => {
    const q = new URLSearchParams();
    if (params?.period) q.append('period', params.period);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    return request<any>(`/reports/analytics?${q.toString()}`);
  },
  getCalendar: (month: string) => request<any>(`/reports/calendar?month=${month}`),

  // Backup & Restore
  exportBackup: () => request<any>('/backup/export'),
  restoreBackup: (data: any, mode: 'replace' | 'merge') => request<any>('/backup/restore', {
    method: 'POST',
    body: JSON.stringify({ mode, data })
  }),

  // File Upload & Receipts
  uploadReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/uploads/`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return response.json() as Promise<{
      id: number;
      file_name: string;
      file_path: string;
      file_url: string;
      signed_url?: string;
      expires_in?: number;
      file_size: number;
      mime_type: string;
    }>;
  },

  getReceiptSignedUrl: (pathOrId: string | number) => {
    if (typeof pathOrId === 'number' || /^\d+$/.test(String(pathOrId).trim())) {
      return request<{ signed_url: string; expires_in: number; file_path: string; attachment_id?: number }>(
        `/uploads/${pathOrId}/signed-url`
      );
    }
    const q = new URLSearchParams({ path: String(pathOrId).trim() });
    return request<{ signed_url: string; expires_in: number; file_path: string; attachment_id?: number }>(
      `/uploads/signed-url?${q.toString()}`
    );
  },

  deleteReceipt: (id: number) => request<{ message: string; id: number }>(`/uploads/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminStats: () => request<AdminStats>('/admin/stats'),
  getAdminUsers: (status?: string) => {
    const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return request<AdminUser[]>(`/admin/users${q}`);
  },
  getAdminUser: (id: number) => request<AdminUser>(`/admin/users/${id}`),
  approveUser: (id: number) => request<AdminUser>(`/admin/users/${id}/approve`, { method: 'POST' }),
  rejectUser: (id: number) => request<AdminUser>(`/admin/users/${id}/reject`, { method: 'POST' }),
  disableUser: (id: number) => request<AdminUser>(`/admin/users/${id}/disable`, { method: 'POST' }),
  enableUser: (id: number) => request<AdminUser>(`/admin/users/${id}/enable`, { method: 'POST' }),
  deleteUser: (id: number) => request<{ message: string; id: number }>(`/admin/users/${id}`, { method: 'DELETE' })
};


import API_BASE from '../lib/apiConfig'
import api from './axios'

interface LoginPayload {
  email: string
  password: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

interface Expense {
  id: string
  amount: number
  expense_date: string
  remarks: string | null
  created_at: string
  expense_category_name: string
  file_number: string
  created_by_name: string
}

interface ExpenseCreatePayload {
  amount: number
  expense_date: string
  remarks?: string | null
  expense_category_id: string
  file_id?: string | null
  created_by: string
}

interface ExpenseUpdatePayload {
  amount?: number
  expense_date?: string
  remarks?: string | null
  expense_category_id?: string
  file_id?: string | null
  created_by?: string
}

interface ExpenseActionResponse {
  message: string
  id?: string
}

const expensesBaseUrl = `${API_BASE}/api/expenses`

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const requestJson = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Request failed')
  }

  return response.json() as Promise<T>
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/login/', payload)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return data
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
  },

  me: async () => {
    const { data } = await api.get('/auth/me/')
    return data
  },
}

export const dashboardApi = {
  getStats: async () => {
    const { data } = await api.get('/dashboard/stats/')
    return data
  },
}

export const customersApi = {
  list: async (page = 1, limit = 20, search = '') => {
    const { data } = await api.get('/customers/', {
      params: { page, limit, search },
    })
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get(`/customers/${id}/`)
    return data
  },

  create: async (payload: any) => {
    const { data } = await api.post('/customers/', payload)
    return data
  },
}

export const brokersApi = {
  list: async (search = '') => {
    const { data } = await api.get('/brokers', {
      params: { search: search || undefined },
    })
    return data
  },

  create: async (payload: { broker_name: string; area?: string; district?: string; phone?: string }) => {
    const { data } = await api.post('/brokers', payload)
    return data
  },

  update: async (id: string, payload: { broker_name?: string; area?: string; district?: string; phone?: string }) => {
    const { data } = await api.put(`/brokers/${id}`, payload)
    return data
  },

  remove: async (id: string) => {
    await api.delete(`/brokers/${id}`)
  },
}

export const dealersApi = {
  list: async (search = '') => {
    const { data } = await api.get('/dealers', {
      params: { search: search || undefined },
    })
    return data
  },

  create: async (payload: { name: string; city?: string; phone?: string; email?: string }) => {
    const { data } = await api.post('/dealers', payload)
    return data
  },

  update: async (id: string, payload: { name?: string; city?: string; phone?: string; email?: string }) => {
    const { data } = await api.put(`/dealers/${id}`, payload)
    return data
  },

  remove: async (id: string) => {
    await api.delete(`/dealers/${id}`)
  },
}

export const filesApi = {
  list: async (page = 1, limit = 20, status?: string, file_type?: string) => {
    const { data } = await api.get('/files/', {
      params: { page, limit, status, file_type },
    })
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get(`/files/${id}/`)
    return data
  },

  create: async (payload: any) => {
    const { data } = await api.post('/files/', payload)
    return data
  }
}

export const paymentsInApi = {
  list: async (params: any) => {
    const { data } = await api.get('/payments/in/', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/payments/in/', payload)
    return data
  },
}

export const paymentsOutApi = {
  list: async (params: any) => {
    const { data } = await api.get('/payments/out/', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/payments/out/', payload)
    return data
  },
}

export const commissionsInApi = {
  list: async (params: any) => {
    const { data } = await api.get('/commissions/in/', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/commissions/in/', payload)
    return data
  },
}

export const commissionsOutApi = {
  list: async (params: any) => {
    const { data } = await api.get('/commissions/out/', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/commissions/out/', payload)
    return data
  },
}

export const loansApi = {
  list: async (status?: string, search?: string) => {
    const { data } = await api.get('/loans/', {
      params: { status, search },
    })
    return data
  },

  getStats: async () => {
    const { data } = await api.get('/loans/stats/')
    return data
  },

  update: async (
    file_number: string,
    payload: { remarks?: string; status?: string }
  ) => {
    const { data } = await api.patch(`/loans/${file_number}/`, payload)
    return data
  },

  softDelete: async (file_number: string) => {
    const { data } = await api.delete(`/loans/${file_number}/`)
    return data
  },
}

export const rtoPaymentsApi = {
  list: async (params: any) => {
    const { data } = await api.get('/rto-payments', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/rto-payments', payload)
    return data
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/rto-payments/${id}`)
    return data
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.patch(`/rto-payments/${id}`, payload)
    return data
  },
}

export const insurancePaymentsApi = {
  list: async () => {
    const { data } = await api.get('/insurance-payments/');
    return data;
  },
  create: async (payload: any) => {
    const { data } = await api.post('/insurance-payments/', payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.patch(`/insurance-payments/${id}/delete`);
    return data;
  },
};

// ── Settings APIs ────────────────────────────────────────────────────────────

export const companySettingsApi = {
  get: async () => {
    const { data } = await api.get('/settings/company')
    return data
  },
  create: async (payload: Record<string, any>) => {
    const { data } = await api.post('/settings/company', payload)
    return data
  },
    update: async (id: string, payload: Record<string, any>) => {
    const { data } = await api.put(`/settings/company/${id}`, payload)
    return data
  },
}

export const expensesApi = {
  list: async (): Promise<Expense[]> => {
    return requestJson<Expense[]>(expensesBaseUrl)
  },

  create: async (payload: ExpenseCreatePayload): Promise<ExpenseActionResponse> => {
    return requestJson<ExpenseActionResponse>(expensesBaseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update: async (id: string, payload: ExpenseUpdatePayload): Promise<ExpenseActionResponse> => {
    return requestJson<ExpenseActionResponse>(`${expensesBaseUrl}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  delete: async (id: string): Promise<ExpenseActionResponse> => {
    return requestJson<ExpenseActionResponse>(`${expensesBaseUrl}/${id}`, {
      method: 'DELETE',
    })
  },
}


export const bankAccountsApi = {
  list: async (page = 1, limit = 50) => {
    const { data } = await api.get('/settings/banks', { params: { page, limit } })
    return data
  },
  create: async (payload: { bank_name: string; account_number: string; ifsc_code: string; area?: string }) => {
    const { data } = await api.post('/settings/banks', payload)
    return data
  },
  update: async (id: string, payload: Record<string, any>) => {
    const { data } = await api.put(`/settings/banks/${id}`, payload)
    return data
  },
  remove: async (id: string) => {
    await api.delete(`/settings/banks/${id}`)
  },
}

export const rolesApi = {
  list: async () => {
    const { data } = await api.get('/settings/roles')
    return data
  },
}

export const usersSettingsApi = {
  list: async (page = 1, limit = 50, search = '') => {
    const { data } = await api.get('/settings/users', { params: { page, limit, search: search || undefined } })
    return data
  },
  create: async (payload: Record<string, any>) => {
    const { data } = await api.post('/settings/users', payload)
    return data
  },
  update: async (id: string, payload: Record<string, any>) => {
    const { data } = await api.put(`/settings/users/${id}/`, payload)
    return data
  },
  toggleActive: async (id: string) => {
    const { data } = await api.patch(`/settings/users/${id}//toggle-active`)
    return data
  },
}

export const financeBanksApi = {
  list: async (page = 1, limit = 20, search = '') => {
    const { data } = await api.get('/finance-banks', { params: { page, limit, search: search || undefined } })
    return data
  },
  listAll: async () => {
    const { data } = await api.get('/finance-banks/all')
    return data
  },
  create: async (payload: { bank_name: string; area?: string; contact_no?: string }) => {
    const { data } = await api.post('/finance-banks', payload)
    return data
  },
  update: async (id: string, payload: Record<string, any>) => {
    const { data } = await api.put(`/finance-banks/${id}`, payload)
    return data
  },
  remove: async (id: string) => {
    await api.delete(`/finance-banks/${id}`)
  },
}

export const insuranceCompaniesApi = {
  list: async (search = '') => {
    const { data } = await api.get('/masters/insurance-companies', {
      params: { search: search || undefined },
    })
    return data
  },
  create: async (payload: {
    company_name: string
    contact_person?: string | null
    mobile_no?: string | null
    phone_no?: string | null
  }) => {
    const { data } = await api.post('/masters/insurance-companies', payload)
    return data
  },
  update: async (id: string, payload: Record<string, any>) => {
    const { data } = await api.put(`/masters/insurance-companies/${id}`, payload)
    return data
  },
  remove: async (id: string) => {
    await api.delete(`/masters/insurance-companies/${id}`)
  },
}

export const insuranceTypesApi = {
  list: async () => {
    const { data } = await api.get('/masters/insurance-types')
    return data
  },
  create: async (payload: { insurance_type_name: string }) => {
    const { data } = await api.post('/masters/insurance-types', payload)
    return data
  },
  update: async (id: string, payload: { insurance_type_name: string }) => {
    const { data } = await api.put(`/masters/insurance-types/${id}`, payload)
    return data
  },
  remove: async (id: string) => {
    await api.delete(`/masters/insurance-types/${id}`)
  },
}

export const advancesApi = {
  list: async (search = '') => {
    const { data } = await api.get('/advances', {
      params: { search: search || undefined },
    })
    return data
  },

  create: async (payload: {
    dealer_id?: string | null
    broker_id?: string | null
    advance_date: string
    amount: number
    mode: string
    utr_cheque_number?: string
    purpose?: string
    remarks?: string
  }) => {
    const { data } = await api.post('/advances/', payload, {
      headers: { 'X-Skip-Auth-Redirect': 'true' },
    })
    return data
  },

  update: async (
    id: string,
    payload: { amount_recovered: number; remarks?: string }
  ) => {
    const { data } = await api.patch(`/advances/${id}`, payload)
    return data
  },

  remove: async (id: string) => {
    await api.delete(`/advances/${id}`)
  },
}

export const expenseCategoriesApi = {
  list: async (search = '') => {
    const { data } = await api.get('/expense-categories', {
      params: { search: search || undefined },
    })
    return data
  },

  create: async (payload: { name: string }) => {
    const { data } = await api.post('/expense-categories', payload)
    return data
  },

  update: async (id: string, payload: { name: string }) => {
    const { data } = await api.put(`/expense-categories/${id}`, payload)
    return data
  },

  remove: async (id: string) => {
    await api.delete(`/expense-categories/${id}`)
  },
}
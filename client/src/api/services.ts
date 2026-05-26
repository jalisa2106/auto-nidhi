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
    const { data } = await api.patch(`/loans/${file_number}/delete/`)
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


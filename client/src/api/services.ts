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
    const { data } = await api.post<TokenResponse>('/auth/login', payload)
    // Store tokens
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
    const { data } = await api.get('/auth/me')
    return data
  },
}

export const dashboardApi = {
  getStats: async () => {
    const { data } = await api.get('/dashboard/stats')
    return data
  },
}

export const customersApi = {
  list: async (page = 1, limit = 20, search = '') => {
    const { data } = await api.get('/customers', {
      params: { page, limit, search },
    })
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get(`/customers/${id}`)
    return data
  },

  create: async (payload: { full_name: string; mobile_1: string; email?: string; city?: string }) => {
    const { data } = await api.post('/customers', payload)
    return data
  },
}

export const filesApi = {
  list: async (page = 1, limit = 20, status?: string, file_type?: string) => {
    const { data } = await api.get('/files', {
      params: { page, limit, status, file_type },
    })
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get(`/files/${id}`)
    return data
  },
}

export const paymentsInApi = {
  list: async (params: any) => {
    const { data } = await api.get('/payments/in', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/payments/in', payload)
    return data
  },
}

export const paymentsOutApi = {
  list: async (params: any) => {
    const { data } = await api.get('/payments/out', { params })
    return data
  },
  create: async (payload: any) => {
    const { data } = await api.post('/payments/out', payload)
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
}
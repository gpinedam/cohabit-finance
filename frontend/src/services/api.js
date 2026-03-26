import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// --- Auth ---
export const loginWithPassword = (email, password) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

export const loginWithPin = (email, pin) =>
  api.post('/auth/pin-login', { email, pin })

// --- Users ---
export const getMe = () => api.get('/users/me')
export const updateMe = (data) => api.put('/users/me', data)
export const getPinStatus = () => api.get('/users/me/pin-status')
export const setPin = (pin) => api.put('/users/me/pin', { pin })
export const deletePin = () => api.delete('/users/me/pin')

// --- Expenses ---
export const createExpense = (data) => api.post('/expenses/', data)
export const listExpenses = (coupleId, skip = 0, limit = 50) =>
  api.get('/expenses/', { params: { couple_id: coupleId, skip, limit } })
export const getExpense = (id) => api.get(`/expenses/${id}`)

// --- Reports ---
export const getBalance = (coupleId) =>
  api.get('/reports/balance', { params: { couple_id: coupleId } })
export const getMonthly = (coupleId, year, month) =>
  api.get('/reports/monthly', { params: { couple_id: coupleId, year, month } })
export const getHistory = (coupleId) =>
  api.get('/reports/history', { params: { couple_id: coupleId } })

export default api

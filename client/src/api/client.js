import axios from 'axios'

// Shared axios instance. Requests to /api are proxied to the Express server by Vite.
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export default api

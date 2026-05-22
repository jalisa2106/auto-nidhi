// Central API base URL
// On Vercel: VITE_API_URL will be set to your Render backend URL
// On local:  falls back to http://localhost:8000
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default API_BASE

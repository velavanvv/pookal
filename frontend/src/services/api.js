import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pookal_auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Send active branch code so the backend routes to the correct branch DB.
  // Branch users have their branch baked into their account (branch_id),
  // so they don't need this header — but it doesn't hurt either.
  const branchCode = localStorage.getItem('pookal_branch_code');
  if (branchCode) config.headers['X-Pookal-Branch-Code'] = branchCode;

  return config;
});

export default api;

import { createContext, useContext, useEffect, useState } from 'react';
import api from '../../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'pookal_auth_token';
const USER_KEY = 'pookal_auth_user';
const BRANCH_KEY = 'pookal_branch';
const BRANCH_CODE_KEY = 'pookal_branch_code';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    api
      .get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => {
        setBooting(false);
      });
  }, [token]);

  const clearBranch = () => {
    localStorage.removeItem(BRANCH_KEY);
    localStorage.removeItem(BRANCH_CODE_KEY);
  };

  const persistAuth = ({ token: nextToken, user: nextUser }) => {
    clearBranch(); // reset branch context when a new session starts
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearBranch();
  };

  const register = async () => {
    throw new Error('Shops are created by a platform admin, not by public registration.');
  };

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    persistAuth(data);
    return data;
  };

  const logout = async () => {
    if (token) {
      try {
        await api.post(
          '/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      } catch {
        // Ignore logout transport errors and clear local state anyway.
      }
    }

    clearAuth();
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return null;
    }
  };

  const hasCapability = (cap) => {
    if (!cap) return true;
    if (user?.role === 'superadmin') return true;

    const aliases = { suppliers: 'vendor', vendor: 'suppliers' };
    const altCap = aliases[cap];

    // Check shop profile capabilities
    const profileCaps = user?.shop_profile?.capabilities || [];
    if (profileCaps.includes(cap) || (altCap && profileCaps.includes(altCap))) {
      return true;
    }

    // Check subscription plan modules
    const modules = user?.subscription?.modules || [];
    if (modules.includes(cap) || (altCap && modules.includes(altCap))) {
      return true;
    }

    // Standard core modules are enabled by default
    const coreModules = ['dashboard', 'pos', 'products', 'inventory', 'orders', 'crm', 'reports', 'settings'];
    return coreModules.includes(cap);
  };

  const businessType = user?.shop_profile?.business_type || 'retail';
  const posMode = user?.shop_profile?.pos_mode || 'retail';

  const value = {
    token,
    user,
    booting,
    businessType,
    posMode,
    hasCapability,
    refreshUser,
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

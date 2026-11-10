
import React, {
  createContext,
  useContext,
  useMemo,
  useState
} from 'react';

const AuthContext = createContext(null);

const SESSION_KEY = 'proxispeak_session';
const TOKEN_KEY = 'proxispeak_token';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function readToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);
  const [token, setToken] = useState(readToken);

  const saveSession = (userData, jwtToken) => {
    if (!jwtToken) {
      throw new Error('Authentication token was not received from server.');
    }

    const session = {
      id: userData._id || userData.id || '',
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'user'
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_KEY, jwtToken);

    setUser(session);
    setToken(jwtToken);
  };

  const register = async ({ name, email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || data.error || 'Registration failed.'
        );
      }

      const userData = data.user || data.data?.user;
      const jwtToken = data.token || data.data?.token;

      if (!userData || !jwtToken) {
        throw new Error(
          'Registration response did not contain user and token.'
        );
      }

      saveSession(userData, jwtToken);

      return userData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const login = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || data.error || 'Email or password is incorrect.'
        );
      }

      const userData = data.user || data.data?.user;
      const jwtToken = data.token || data.data?.token;

      if (!userData || !jwtToken) {
        throw new Error(
          'Login response did not contain user and token.'
        );
      }

      saveSession(userData, jwtToken);

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);

    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      register,
      login,
      logout
    }),
    [user, token]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

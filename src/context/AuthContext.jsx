import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const USERS_KEY = 'proxispeak_users';
const SESSION_KEY = 'proxispeak_session';

function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  });
  const register = ({ name, email, password }) => {
    const users = readUsers();
    if (users.some((item) => item.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists. Please sign in.');
    const newUser = { name: name.trim(), email: email.trim().toLowerCase(), password };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    const session = { name: newUser.name, email: newUser.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session)); setUser(session);
  };
  const login = ({ email, password }) => {
    const match = readUsers().find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password);
    if (!match) throw new Error('Email or password is incorrect.');
    const session = { name: match.name, email: match.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session)); setUser(session);
  };
  const logout = () => { localStorage.removeItem(SESSION_KEY); setUser(null); };
  const value = useMemo(() => ({ user, register, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }

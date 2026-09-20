import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const AuthContext = createContext(null);

/**
 * Holds authentication state (current user + token) for the whole app,
 * and exposes login()/logout() functions.
 *
 * The token and a copy of the user are persisted to localStorage so
 * that a page refresh does not immediately log the user out. This is
 * a simple approach appropriate for Day 1; note that the backend is
 * still the real source of truth - every protected API request is
 * independently verified there via the JWT.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const navigate = useNavigate();

  /**
   * Shared by login() and register() - both endpoints return the same
   * { token, user } shape and both should result in the same
   * "now logged in" state, so this avoids repeating the same four
   * lines twice.
   */
  const setSession = (newToken, loggedInUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    setSession(response.data.token, response.data.user);
    navigate("/dashboard");
  };

  const register = async (name, email, password, role) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
    });
    setSession(response.data.token, response.data.user);
    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Convenience hook so components can call useAuth() instead of
 * useContext(AuthContext) directly.
 */
export const useAuth = () => useContext(AuthContext);
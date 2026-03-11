import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || "");
  const [user, setUserState] = useState(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  function setToken(value) {
    if (value) {
      localStorage.setItem("token", value);
      setTokenState(value);
    } else {
      localStorage.removeItem("token");
      setTokenState("");
    }
  }

  function setUser(value) {
    if (value) {
      localStorage.setItem("user", JSON.stringify(value));
      setUserState(value);
    } else {
      localStorage.removeItem("user");
      setUserState(null);
    }
  }

  function login(authToken, authUser) {
    setToken(authToken);
    setUser(authUser);
  }

  function logout() {
    setToken("");
    setUser(null);
  }

  async function loginWithCredentials(email, password) {
    const response = await fetch(buildApiUrl("/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Login gagal");
    }

    const authToken = result.data?.token || result.token || "";
    const authUser = result.data?.user || result.user || null;

    if (!authToken || !authUser) {
      throw new Error("Response login tidak lengkap");
    }

    login(authToken, authUser);
    return authUser;
  }

  async function register(payload) {
    const response = await fetch(buildApiUrl("/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Registrasi gagal");
    }

    return result.data;
  }

  async function refreshProfile() {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/auth/me"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        logout();
        return;
      }

      if (result.data) {
        setUser(result.data);
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProfile();
  }, []);

  const value = useMemo(() => {
    return {
      token,
      user,
      loading,
      loadingAuth: loading,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === "ADMIN",
      login,
      loginWithCredentials,
      register,
      logout,
      setToken,
      setUser,
      refreshProfile,
    };
  }, [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
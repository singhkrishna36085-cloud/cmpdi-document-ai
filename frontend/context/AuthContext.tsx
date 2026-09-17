"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, UserRole, AuthContextType, LoginResponse } from "@/types/auth";
import { getStoredToken, setStoredToken, removeStoredToken } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on application startup
  useEffect(() => {
    async function restoreSession() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetchWithAuth("/api/auth/me");

        if (res.ok) {
          const userData: UserProfile = await res.json();
          setUser(userData);
          setToken(storedToken);
        } else {
          // Token expired or rejected by backend
          removeStoredToken();
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error("Session restoration error:", error);
        removeStoredToken();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (
    usernameOrEmail: string,
    password: string,
    selectedRole: UserRole
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetchWithAuth("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: usernameOrEmail.trim(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.detail || "Authentication failed. Please check your credentials.",
        };
      }

      const loginData: LoginResponse = data;
      const backendUser = loginData.user;

      // ── Role Verification Check ─────────────────────────────────────────
      // Ensure backend user role matches user's selected role
      if (selectedRole && backendUser.role !== selectedRole) {
        return {
          success: false,
          message: `Role mismatch: Your account is registered as ${
            backendUser.role === "HOD" ? "Head of Department (HOD)" : "Normal User"
          }. Please select your correct role to log in.`,
        };
      }

      // Store JWT token securely
      setStoredToken(loginData.access_token);
      setToken(loginData.access_token);
      setUser(backendUser);

      return { success: true };
    } catch (error) {
      console.error("Login request error:", error);
      return {
        success: false,
        message: "Unable to connect to backend server. Please verify network or backend availability.",
      };
    }
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async (): Promise<UserProfile | null> => {
    const currentToken = token || getStoredToken();
    if (!currentToken) return null;

    try {
      const res = await fetchWithAuth("/api/auth/me");

      if (res.ok) {
        const userData: UserProfile = await res.json();
        setUser(userData);
        return userData;
      } else {
        logout();
        return null;
      }
    } catch (error) {
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

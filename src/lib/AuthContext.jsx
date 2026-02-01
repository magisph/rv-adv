/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from "react";
import { authService } from "@/services/authService";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Compatibility states for migration safety
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ id: 'migrated-app', public_settings: {} });
  const [isLoadingPublicSettings] = useState(false);

  useEffect(() => {
    checkUserAuth();

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(authService._mapUser(session.user));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
      } else {
          setUser(null);
          setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("User auth check failed:", error);
      setIsAuthenticated(false);
    } finally {
        setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await authService.logout();
    if (shouldRedirect) {
       window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };
  
  const checkAppState = async () => {
      // No-op or re-check auth in new architecture
      await checkUserAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings, 
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

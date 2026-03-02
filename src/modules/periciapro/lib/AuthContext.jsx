import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/modules/periciapro/services/supabaseClient';

const AuthContext = createContext();

/**
 * AuthProvider — replaces the Base44-coupled AuthContext.
 * Uses Supabase Auth for session management.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkSession();

    // Listen for auth state changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setIsLoadingAuth(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check failed:', error);
        setAuthError({ type: 'auth_required', message: error.message });
        setIsLoadingAuth(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Unexpected auth error:', error);
      setAuthError({ type: 'unknown', message: error.message });
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  const navigateToLogin = () => {
    // Redirect to Supabase Auth UI or custom login page
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false, // No longer needed (Base44 concept)
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        checkAppState: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

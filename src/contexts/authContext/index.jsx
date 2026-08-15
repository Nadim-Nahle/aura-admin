import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import React, { useContext, useEffect, useState } from "react";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, initializeUser);
    return unsubscribe;
  }, []);

  async function initializeUser(user, forceRefresh = false) {
    let admin = false;
    if (user) {
      try {
        const token = await user.getIdTokenResult(forceRefresh);
        admin = token.claims.role === "admin";
        setCurrentUser(user);
        setIsAdmin(admin);
      } catch {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    } else {
      setCurrentUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
    return admin;
  }

  const refreshSession = () => initializeUser(auth.currentUser, true);

  const value = {
    currentUser,
    userLoggedIn: Boolean(currentUser && isAdmin),
    isAdmin,
    refreshSession,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="auth-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Verifying your session…
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

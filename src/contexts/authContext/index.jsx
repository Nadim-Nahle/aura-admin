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
    if (user) {
      try {
        const token = await user.getIdTokenResult(forceRefresh);
        setCurrentUser(user);
        setIsAdmin(token.claims.role === "admin");
      } catch {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    } else {
      setCurrentUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
  }

  const refreshSession = async () => {
    const user = auth.currentUser;
    await initializeUser(user, true);
    if (!user) return false;
    const token = await user.getIdTokenResult();
    return token.claims.role === "admin";
  };

  const value = {
    currentUser,
    userLoggedIn: Boolean(currentUser && isAdmin),
    isAdmin,
    refreshSession,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

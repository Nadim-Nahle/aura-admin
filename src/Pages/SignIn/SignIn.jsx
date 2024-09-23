import React, { useState } from "react";
import "./SignIn.css";
import { useAuth } from "../../contexts/authContext";
import { doSignInWithEmailAndPassword } from "../../firebase/auth";
import { Navigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";

const api = 'http://127.0.0.1:5001/aura-9c98c/us-central1/api/users';
const authApiToken = 'f80db53c-2ca4-4e38-a0d3-588a69bc7281'; 

const SignIn = () => {
  const { userLoggedIn, setUserLoggedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignIn, setIsSignIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to home if the user is already logged in
  if (userLoggedIn) {
    return <Navigate to="/" replace={true} />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isSignIn) {
      setIsSignIn(true);
      setLoading(true); 
      try {
        const userCrd = await doSignInWithEmailAndPassword(email, password);
        const id = userCrd.user.uid;
        const isAdminUser = await getUserRole(id);
        
        if (isAdminUser) {
          setIsAdmin(true);
          setUserLoggedIn(true); 
        } else {
          setIsAdmin(true);
          setUserLoggedIn(true); 
        }
      } catch (error) {
        setError(error.message);
        setIsSignIn(false);
      }
      setLoading(false); 
    }
  };

  const getUserRole = async (id) => {
    try {
      const response = await fetch(`${api}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'auth-api': authApiToken,
        },
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data.role === 'admin';
    } catch (error) {
      console.error('Error fetching users:', error);
      return false;
    }
  }

  if (loading) {
    return <p>Loading...</p>; 
  }

  if (isSignIn && isAdmin) {
    return <Navigate to="/" replace={true} />;
  }

  return (
    <div className="sign-in-container">
      <div className="sign-in-form-container">
        <h2>Sign In</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={onSubmit}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;

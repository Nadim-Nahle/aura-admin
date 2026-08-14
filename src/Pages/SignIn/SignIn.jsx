import React, { useState } from "react";
import "./SignIn.css";
import { useAuth } from "../../contexts/authContext";
import { doSignInWithEmailAndPassword } from "../../firebase/auth";
import { Navigate } from "react-router-dom";
import { doSignOut } from "../../firebase/auth";

const SignIn = () => {
  const { userLoggedIn, refreshSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to home if the user is already logged in
  if (userLoggedIn) {
    return <Navigate to="/" replace={true} />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await doSignInWithEmailAndPassword(email.trim(), password);
      const isAdminUser = await refreshSession();
      if (!isAdminUser) {
        await doSignOut();
        setError("This account does not have administrator access.");
      }
    } catch (error) {
      const messages = {
        "auth/invalid-credential": "The email or password is incorrect.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed":
          "Unable to connect. Check your internet connection.",
      };
      setError(messages[error?.code] || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
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

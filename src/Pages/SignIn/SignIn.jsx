import React, { useState } from "react";
import "./SignIn.css";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import {
  doSignInWithEmailAndPassword,
  doSignOut,
} from "../../firebase/auth";

const loginErrors = {
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-login-credentials": "The email or password is incorrect.",
  "auth/wrong-password": "The email or password is incorrect.",
  "auth/user-not-found": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/network-request-failed":
    "Unable to connect. Check your internet connection.",
};

const SignIn = () => {
  const { userLoggedIn, refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (userLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await doSignInWithEmailAndPassword(normalizedEmail, password);
      const isAdminUser = await refreshSession();
      if (!isAdminUser) {
        await doSignOut();
        setError("This account does not have administrator access.");
      }
    } catch (signInError) {
      setError(
        loginErrors[signInError?.code] ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    if (error) setError("");
  };

  return (
    <main className="signin-page">
      <section className="signin-brand" aria-label="GrowFitness">
        <div className="brand-lockup">
          <img src="/grow-logo.png" alt="" />
          <span className="brand-name">
            GrowFitness
            <small className="brand-mode">Admin portal</small>
          </span>
        </div>

        <div className="signin-brand__copy">
          <p>Built for stronger operations</p>
          <h1>Run the gym with clarity.</h1>
          <p>
            One secure place to manage members, packages, classes, and the
            numbers that keep GrowFitness moving.
          </p>
        </div>

        <div className="signin-brand__footer">
          © {new Date().getFullYear()} GrowFitness
        </div>
      </section>

      <section className="signin-form-side">
        <div className="signin-card">
          <div className="brand-lockup signin-card__mobile-brand">
            <img src="/grow-logo.png" alt="" />
            <span className="brand-name">
              GrowFitness
              <small className="brand-mode">Admin portal</small>
            </span>
          </div>

          <h2>Welcome back</h2>
          <p>Sign in with an authorized administrator account.</p>

          {error && (
            <div className="alert alert--error" role="alert" aria-live="polite">
              <span>{error}</span>
            </div>
          )}

          <form className="signin-form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearError();
                }}
                autoComplete="email"
                autoCapitalize="none"
                placeholder="admin@growfitness.com"
                disabled={loading}
                required
              />
            </div>

            <div className="field password-field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError();
                }}
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary signin-submit"
              disabled={loading}
            >
              {loading && <span className="button-spinner" aria-hidden="true" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="signin-note">
            Access is restricted to accounts with the GrowFitness administrator
            role. Authentication is protected by Firebase ID tokens.
          </div>
        </div>
      </section>
    </main>
  );
};

export default SignIn;

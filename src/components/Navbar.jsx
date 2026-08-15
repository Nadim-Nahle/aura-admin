import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { doSignOut } from "../firebase/auth";
import { useAuth } from "../contexts/authContext";

const navigation = [
  { to: "/", label: "Overview", end: true },
  { to: "/dashboard", label: "Members" },
  { to: "/packages", label: "Packages" },
  { to: "/classes", label: "Classes" },
  { to: "/report", label: "Reports" },
];

const initialsFor = (value = "Admin") =>
  value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const Navbar = ({ title }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    setSigningOut(true);
    setLogoutError("");
    try {
      await doSignOut();
      navigate("/signin", { replace: true });
    } catch {
      setLogoutError("Unable to sign out. Check your connection and retry.");
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="app-header">
        <Link className="app-brand" to="/" aria-label="GrowFitness admin home">
          <img src="/grow-logo.png" alt="" />
          <span>
            GrowFitness
            <small>Admin</small>
          </span>
        </Link>

        <div className="app-header__title" aria-current="page">
          {title}
        </div>

        <nav className="app-nav" aria-label="Admin navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-nav__link${isActive ? " app-nav__link--active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-account">
          <div className="app-account__avatar" aria-hidden="true">
            {initialsFor(currentUser?.email)}
          </div>
          <div className="app-account__copy">
            <strong>Administrator</strong>
            <span>{currentUser?.email || "Authenticated"}</span>
          </div>
          <button
            type="button"
            className="app-logout"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      {logoutError && (
        <div className="navbar-alert" role="alert">
          {logoutError}
        </div>
      )}
    </>
  );
};

export default Navbar;

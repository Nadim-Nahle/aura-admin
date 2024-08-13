import React from 'react';
import './Home.css'; // Assuming you have a CSS file for styling

const Home = () => {
  return (
    <div className="admin-homepage-container">
      <header className="admin-homepage-header">
        <div className="logo-placeholder">
          {/* Logo placeholder, replace with an actual logo */}
          <h1>Admin Panel</h1>
        </div>
        <nav className="navbar">
          <a href="#dashboard">Dashboard</a>
          <a href="#user-management">User Management</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
          <a href="#logout">Logout</a>
        </nav>
      </header>

      <main className="admin-homepage-main">
        <section className="welcome-section">
          <h2>Welcome, Admin</h2>
          <p>
            Manage members, monitor activity, and access reports. Use the navigation to manage the gym’s user database effectively.
          </p>
          <a href="dashboard" className="cta-button">Go to Dashboard</a>
        </section>
      </main>

      <footer className="admin-homepage-footer">
        <p>© 2024 [Your Gym Name]. Admin Panel.</p>
        <nav className="footer-nav">
          <a href="#support">Support</a>
          <a href="#privacy">Privacy Policy</a>
        </nav>
      </footer>
    </div>
  );
};

export default Home;
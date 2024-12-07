import React from 'react';
import './Home.css'; // Assuming you have a CSS file for styling
import Navbar from '../../components/Navbar';

const Home = () => {
  return (
    <div className="admin-homepage-container">
      <Navbar title="Admin Panel" />

      <main className="admin-homepage-main">
        <section className="welcome-section">
          <h2>Welcome, Admin</h2>
          <p>
            Manage members, monitor activity, and access reports. Use the navigation to manage the gym’s user database effectively.
          </p>
          <a href="dashboard" className="cta-button">Go to Users</a>
        </section>
      </main>

      <footer className="admin-homepage-footer">
        <p>© 2024 GrowFitness. Admin Panel.</p>
        <nav className="footer-nav">
          <a href="#support">Support</a>
          <a href="#privacy">Privacy Policy</a>
        </nav>
      </footer>
    </div>
  );
};

export default Home;
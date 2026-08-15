import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/authContext";

const destinations = [
  {
    to: "/dashboard",
    index: "01",
    title: "Members",
    description: "Manage profiles, memberships, access codes, and account roles.",
  },
  {
    to: "/packages",
    index: "02",
    title: "Packages",
    description: "Create and maintain the membership packages offered by the gym.",
  },
  {
    to: "/classes",
    index: "03",
    title: "Classes",
    description: "Maintain the class catalog and pricing available to members.",
  },
  {
    to: "/report",
    index: "04",
    title: "Reports",
    description: "Review estimated revenue, expenses, and operating performance.",
  },
];

const Home = () => {
  const { currentUser } = useAuth();
  const adminName = currentUser?.email?.split("@")[0] || "admin";

  return (
    <>
      <Navbar title="Overview" />
      <main className="page-shell">
        <section className="home-hero">
          <img className="home-hero__mark" src="/grow-logo.png" alt="" />
          <p className="page-eyebrow">Admin workspace</p>
          <h1>Good to see you, {adminName}.</h1>
          <p>
            Keep the GrowFitness operation moving from one focused workspace.
            Manage members, update the catalog, and track business performance.
          </p>
          <Link className="btn btn-primary" to="/dashboard">
            Manage members
          </Link>
        </section>

        <section className="quick-grid" aria-label="Admin tools">
          {destinations.map((destination) => (
            <Link className="quick-card" to={destination.to} key={destination.to}>
              <span className="quick-card__index">{destination.index}</span>
              <div>
                <h2>{destination.title}</h2>
                <p>{destination.description}</p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
};

export default Home;

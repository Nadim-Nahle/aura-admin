import React, { useState, useEffect } from "react";
import "./ClassPage.css"; // Updated CSS filename
import Navbar from "../../components/Navbar";

const ClassPage = () => {
  const [packages, setPackages] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const authApiToken = "f80db53c-2ca4-4e38-a0d3-588a69bc7281"; // Replace with your actual token
  const api = "https://us-central1-aura-9c98c.cloudfunctions.net/api/classes";

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        const response = await fetch(api, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-api": authApiToken,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch packages");

        const data = await response.json();
        setPackages(data);
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [api, authApiToken]);

  const handleAddPackage = async () => {
    if (!name || !price) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-api": authApiToken,
        },
        body: JSON.stringify({ name, price }),
      });

      if (!response.ok) throw new Error("Failed to add the class");

      const newPackage = await response.json();
      setPackages([...packages, newPackage]);
      setShowAddModal(false);
      setName("");
      setPrice("");
    } catch (error) {
      console.error("Error adding class:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await fetch(`https://us-central1-aura-9c98c.cloudfunctions.net/api/classes/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "auth-api": authApiToken,
        },
      });

      if (!response.ok) throw new Error("Failed to delete the class");

      // Update the packages list by filtering out the deleted package
      setPackages(packages.filter((pkg) => pkg.id !== id));
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete the class. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="Class Management" />
      <div className="custom-package-page">
        <button
          className="custom-add-button"
          onClick={() => setShowAddModal(true)}
        >
          Add Class
        </button>
        {loading && (
          <div className="custom-overlay">
            <div className="custom-spinner"></div>
          </div>
        )}
        <table className="custom-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td>{pkg.name}</td>
                <td>{pkg.price}</td>
                <td>
                <button onClick={() => handleDelete(pkg.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showAddModal && (
          <div className="custom-modal">
            <div className="custom-modal-content">
              <h2>Add New class</h2>
              <div className="custom-input-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="custom-input-group">
              </div>
              <div className="custom-input-group">
                <label>Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="modalbuttons">
                <button className="add_package" onClick={handleAddPackage}>Add Class</button>
                <button onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ClassPage;

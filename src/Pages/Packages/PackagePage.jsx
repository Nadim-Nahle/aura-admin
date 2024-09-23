import React, { useState, useEffect } from "react";
import "./PackagePage.css"; // Adjust the path as needed
import Navbar from "../../components/Navbar";

const PackagePage = () => {
  const [packages, setPackages] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletePackageId, setDeletePackageId] = useState(null); // State to track package being deleted

  const authApiToken = "f80db53c-2ca4-4e38-a0d3-588a69bc7281"; // Replace this with your actual auth token
  const api = "http://127.0.0.1:5001/aura-9c98c/us-central1/api/packages";

  // Fetch packages on component mount
  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true); // Show loading UI
      try {
        const response = await fetch(api, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-api": authApiToken,
          },
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setPackages(data);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false); // Hide loading UI
      }
    };

    fetchPackages();
  }, [api, authApiToken]);

  const handleAddPackage = async () => {
    if (!name || !description || !price) {
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
        body: JSON.stringify({ name, description, price }),
      });

      if (!response.ok) {
        throw new Error("Failed to add the package");
      }

      const newPackage = await response.json();
      setPackages([...packages, newPackage]);
      setShowAddModal(false);
      setName("");
      setDescription("");
      setPrice("");
    } catch (error) {
      console.error("Error adding package:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${api}/${deletePackageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "auth-api": authApiToken,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete the package");
      }

      // Remove the deleted package from the state
      setPackages(packages.filter((pkg) => pkg.id !== deletePackageId));
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting package:", error);
    } finally {
      setLoading(false);
      setDeletePackageId(null);
    }
  };

  const openDeleteModal = (packageId) => {
    setDeletePackageId(packageId);
    setShowDeleteModal(true);
  };

  return (
    <>
      <Navbar title="Package Management" />

      <div className="package-page">
        <button className="add-button" onClick={() => setShowAddModal(true)}>
          Add Package
        </button>
        {loading && (
          <div className="overlay">
            <div className="spinner"></div>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td>{pkg.name}</td>
                <td>{pkg.description}</td>
                <td>{pkg.price}</td>
                <td>
                  <button onClick={() => console.log(`Edit package ${pkg.id}`)}>
                    Edit
                  </button>
                  <button onClick={() => openDeleteModal(pkg.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Package Modal */}
        {showAddModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>Add New Package</h2>
              <div className="input-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <button onClick={handleAddPackage} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Add Package"}
              </button>
              <button onClick={() => setShowAddModal(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>Confirm Delete</h2>
              <p>Are you sure you want to delete this package?</p>
              <button onClick={handleDeletePackage} disabled={loading}>
                {loading ? <span className="spinner"></span> : "Delete"}
              </button>
              <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PackagePage;

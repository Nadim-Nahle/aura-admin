import React, { useEffect, useState } from "react";
import "./PackagePage.css";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";

const PackagePage = () => {
  const [packages, setPackages] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        setPackages(await apiRequest("/packages"));
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Unable to load packages"));
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handleAddPackage = async () => {
    if (!name.trim() || !description.trim() || !price) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const newPackage = await jsonRequest("/packages", "POST", {
        name,
        description,
        price: Number(price),
      });
      setPackages((previous) => [...previous, newPackage]);
      setShowAddModal(false);
      setName("");
      setDescription("");
      setPrice("");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to add package"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await apiRequest(`/packages/${id}`, { method: "DELETE" });
      setPackages((previous) => previous.filter((item) => item.id !== id));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete package"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="Package Management" />
      <div className="custom-package-page">
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <button
          className="custom-add-button"
          onClick={() => setShowAddModal(true)}
        >
          Add Package
        </button>
        {loading && (
          <div className="custom-overlay">
            <div className="custom-spinner" />
          </div>
        )}
        <table className="custom-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td>{item.price}</td>
                <td>
                  <button onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showAddModal && (
          <div className="custom-modal">
            <div className="custom-modal-content">
              <h2>Add New Package</h2>
              <div className="custom-input-group">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="custom-input-group">
                <label>Description</label>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="custom-input-group">
                <label>Price</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
              <div className="modalbuttons">
                <button className="add_package" onClick={handleAddPackage}>
                  Add Package
                </button>
                <button onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PackagePage;

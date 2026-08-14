import React, { useEffect, useState } from "react";
import "./ClassPage.css";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";

const ClassPage = () => {
  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        setClasses(await apiRequest("/classes"));
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Unable to load classes"));
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const handleAddClass = async () => {
    if (!name.trim() || !price) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const newClass = await jsonRequest("/classes", "POST", { name, price });
      setClasses((previous) => [...previous, newClass]);
      setShowAddModal(false);
      setName("");
      setPrice("");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to add class"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await apiRequest(`/classes/${id}`, { method: "DELETE" });
      setClasses((previous) => previous.filter((item) => item.id !== id));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete class"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="Class Management" />
      <div className="custom-package-page">
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <button
          className="custom-add-button"
          onClick={() => setShowAddModal(true)}
        >
          Add Class
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
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
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
              <h2>Add New Class</h2>
              <div className="custom-input-group">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                <button className="add_package" onClick={handleAddClass}>
                  Add Class
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

export default ClassPage;

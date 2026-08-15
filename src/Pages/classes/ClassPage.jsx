import React, { useEffect, useState } from "react";
import "./ClassPage.css";
import Navbar from "../../components/Navbar";
import Modal from "../../components/Modal";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const ClassPage = () => {
  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        setClasses(await apiRequest("/classes"));
      } catch (error) {
        setFeedback({
          type: "error",
          text: getErrorMessage(error, "Unable to load classes"),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const handleAddClass = async () => {
    const parsedPrice = Number(price);
    if (!name.trim()) {
      setModalError("Enter a class name.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setModalError("Enter a price greater than zero.");
      return;
    }

    setLoading(true);
    setModalError("");
    try {
      const newClass = await jsonRequest("/classes", "POST", {
        name: name.trim(),
        price: parsedPrice,
      });
      setClasses((previous) => [...previous, newClass]);
      setShowAddModal(false);
      setName("");
      setPrice("");
      setFeedback({ type: "success", text: `${newClass.name} was added.` });
    } catch (error) {
      setModalError(getErrorMessage(error, "Unable to add this class"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!classToDelete) return;
    setLoading(true);
    try {
      await apiRequest(`/classes/${classToDelete.id}`, { method: "DELETE" });
      setClasses((previous) =>
        previous.filter((item) => item.id !== classToDelete.id),
      );
      setFeedback({ type: "success", text: `${classToDelete.name} was deleted.` });
      setClassToDelete(null);
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to delete this class"),
      });
    } finally {
      setLoading(false);
      setClassToDelete(null);
    }
  };

  return (
    <>
      <Navbar title="Classes" />
      <main className="page-shell">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">Training catalog</p>
            <h1 className="page-title">Classes</h1>
            <p className="page-subtitle">
              Keep the class catalog clear and current for staff and members.
            </p>
          </div>
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setModalError("");
                setShowAddModal(true);
              }}
            >
              + Add class
            </button>
          </div>
        </header>

        {feedback && (
          <div className={`alert alert--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <span>{feedback.text}</span>
            <button className="alert__dismiss" type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">×</button>
          </div>
        )}

        {classes.length > 0 ? (
          <section className="catalog-grid" aria-label="Classes">
            {classes.map((item) => (
              <article className="catalog-card class-card" key={item.id}>
                <div className="catalog-card__top">
                  <span className="badge badge--active">Active</span>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => setClassToDelete(item)}>
                    Delete
                  </button>
                </div>
                <p>Instructor-led GrowFitness class.</p>
                <div className="catalog-card__footer">
                  <h2>{item.name}</h2>
                  <span className="price">{currency.format(Number(item.price) || 0)}</span>
                </div>
              </article>
            ))}
          </section>
        ) : !loading ? (
          <section className="surface-card empty-state">
            <strong>No classes yet</strong>
            Add the first class to the GrowFitness catalog.
          </section>
        ) : null}

        <Modal
          isOpen={showAddModal}
          onClose={() => !loading && setShowAddModal(false)}
          onConfirm={handleAddClass}
          title="Add class"
          confirmText="Add class"
          busy={loading}
        >
          {modalError && <div className="alert alert--error" role="alert">{modalError}</div>}
          <div className="field-grid">
            <div className="field field--full">
              <label htmlFor="class-name">Name</label>
              <input id="class-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Strength circuit" />
            </div>
            <div className="field field--full">
              <label htmlFor="class-price">Price (USD)</label>
              <input id="class-price" type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="10.00" />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(classToDelete)}
          onClose={() => setClassToDelete(null)}
          onConfirm={handleDelete}
          title="Delete class"
          confirmText="Delete class"
          destructive
          busy={loading}
        >
          <p>Delete <strong>{classToDelete?.name}</strong> from the class catalog? This cannot be undone.</p>
        </Modal>

        {loading && (
          <div className="loading-overlay" role="status" aria-live="polite">
            <div className="loading-panel"><span className="spinner" aria-hidden="true" />Working…</div>
          </div>
        )}
      </main>
    </>
  );
};

export default ClassPage;

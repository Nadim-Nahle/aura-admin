import React, { useEffect, useState } from "react";
import "./PackagePage.css";
import Navbar from "../../components/Navbar";
import Modal from "../../components/Modal";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const PackagePage = () => {
  const [packages, setPackages] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        setPackages(await apiRequest("/packages"));
      } catch (error) {
        setFeedback({
          type: "error",
          text: getErrorMessage(error, "Unable to load packages"),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const closeAddModal = () => {
    if (loading) return;
    setShowAddModal(false);
    setModalError("");
  };

  const handleAddPackage = async () => {
    const parsedPrice = Number(price);
    if (!name.trim()) {
      setModalError("Enter a package name.");
      return;
    }
    if (!description.trim()) {
      setModalError("Enter a short package description.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setModalError("Enter a price greater than zero.");
      return;
    }

    setLoading(true);
    setModalError("");
    try {
      const newPackage = await jsonRequest("/packages", "POST", {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
      });
      setPackages((previous) => [...previous, newPackage]);
      setShowAddModal(false);
      setName("");
      setDescription("");
      setPrice("");
      setFeedback({ type: "success", text: `${newPackage.name} was added.` });
    } catch (error) {
      setModalError(getErrorMessage(error, "Unable to add this package"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!packageToDelete) return;
    setLoading(true);
    try {
      await apiRequest(`/packages/${packageToDelete.id}`, { method: "DELETE" });
      setPackages((previous) =>
        previous.filter((item) => item.id !== packageToDelete.id),
      );
      setFeedback({
        type: "success",
        text: `${packageToDelete.name} was deleted.`,
      });
      setPackageToDelete(null);
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to delete this package"),
      });
    } finally {
      setLoading(false);
      setPackageToDelete(null);
    }
  };

  return (
    <>
      <Navbar title="Packages" />
      <main className="page-shell">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">Product catalog</p>
            <h1 className="page-title">Membership packages</h1>
            <p className="page-subtitle">
              Maintain the offers your team can use when onboarding and renewing members.
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
              + Add package
            </button>
          </div>
        </header>

        {feedback && (
          <div className={`alert alert--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <span>{feedback.text}</span>
            <button className="alert__dismiss" type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">×</button>
          </div>
        )}

        {packages.length > 0 ? (
          <section className="catalog-grid" aria-label="Membership packages">
            {packages.map((item) => (
              <article className="catalog-card" key={item.id}>
                <div className="catalog-card__top">
                  <span className="badge badge--active">Available</span>
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={() => setPackageToDelete(item)}
                  >
                    Delete
                  </button>
                </div>
                <p>{item.description}</p>
                <div className="catalog-card__footer">
                  <h2>{item.name}</h2>
                  <span className="price">{currency.format(Number(item.price) || 0)}</span>
                </div>
              </article>
            ))}
          </section>
        ) : !loading ? (
          <section className="surface-card empty-state">
            <strong>No packages yet</strong>
            Add the first package offered by GrowFitness.
          </section>
        ) : null}

        <Modal
          isOpen={showAddModal}
          onClose={closeAddModal}
          onConfirm={handleAddPackage}
          title="Add package"
          confirmText="Add package"
          busy={loading}
        >
          {modalError && <div className="alert alert--error" role="alert">{modalError}</div>}
          <div className="field-grid">
            <div className="field field--full">
              <label htmlFor="package-name">Name</label>
              <input id="package-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Regular monthly" />
            </div>
            <div className="field field--full">
              <label htmlFor="package-description">Description</label>
              <textarea id="package-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is included in this package?" />
            </div>
            <div className="field field--full">
              <label htmlFor="package-price">Price (USD)</label>
              <input id="package-price" type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="50.00" />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(packageToDelete)}
          onClose={() => setPackageToDelete(null)}
          onConfirm={handleDelete}
          title="Delete package"
          confirmText="Delete package"
          destructive
          busy={loading}
        >
          <p>Delete <strong>{packageToDelete?.name}</strong>? Existing member records will not be changed.</p>
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

export default PackagePage;

import React, { useEffect, useMemo, useState } from "react";
import "./ReportPage.css";
import Navbar from "../../components/Navbar";
import Modal from "../../components/Modal";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";

const membershipRates = { student: 35, regular: 50 };
const privateSessionRates = { 1: 10, 12: 100, 16: 130, 20: 160 };
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const calculateRevenue = (membership, privateSessions) =>
  (membershipRates[membership] || 0) +
  (privateSessionRates[privateSessions] || 0);

const ReportPage = () => {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [expenseName, setExpenseName] = useState("");
  const [expensePrice, setExpensePrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const [userData, expenseData] = await Promise.all([
          apiRequest("/admin/users"),
          apiRequest("/expenses"),
        ]);
        setMembers(userData);
        setExpenses(expenseData);
      } catch (error) {
        setFeedback({
          type: "error",
          text: getErrorMessage(error, "Unable to load the report"),
        });
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, []);

  const totals = useMemo(() => {
    const revenue = members.reduce(
      (total, member) =>
        total + calculateRevenue(member.membership, member.privateSessions),
      0,
    );
    const expensesTotal = expenses.reduce(
      (total, expense) => total + (Number(expense.price) || 0),
      0,
    );
    const activeMembers = members.filter(
      (member) => member.membership && member.membership !== "none",
    ).length;
    return {
      revenue,
      expensesTotal,
      net: revenue - expensesTotal,
      activeMembers,
    };
  }, [members, expenses]);

  const handleAddExpense = async (event) => {
    event.preventDefault();
    const price = Number(expensePrice);
    if (!expenseName.trim() || !Number.isFinite(price) || price <= 0) {
      setFeedback({
        type: "error",
        text: "Enter a valid expense name and a price greater than zero.",
      });
      return;
    }

    setLoading(true);
    try {
      const expense = await jsonRequest("/expenses", "POST", {
        name: expenseName.trim(),
        price,
      });
      setExpenses((previous) => [expense, ...previous]);
      setExpenseName("");
      setExpensePrice("");
      setFeedback({ type: "success", text: `${expense.name} was added.` });
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to add this expense"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setLoading(true);
    try {
      await apiRequest(`/expenses/${expenseToDelete.id}`, { method: "DELETE" });
      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== expenseToDelete.id),
      );
      setFeedback({
        type: "success",
        text: `${expenseToDelete.name} was deleted.`,
      });
      setExpenseToDelete(null);
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to delete this expense"),
      });
    } finally {
      setLoading(false);
      setExpenseToDelete(null);
    }
  };

  return (
    <>
      <Navbar title="Reports" />
      <main className="page-shell">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">Financial overview</p>
            <h1 className="page-title">Revenue & expenses</h1>
            <p className="page-subtitle">
              A live operating estimate based on current membership and private-session rates.
            </p>
          </div>
        </header>

        {feedback && (
          <div className={`alert alert--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <span>{feedback.text}</span>
            <button className="alert__dismiss" type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">×</button>
          </div>
        )}

        <section className="stat-grid" aria-label="Financial summary">
          <article className="stat-card stat-card--accent">
            <p className="stat-label">Estimated revenue</p>
            <p className="stat-value">{currency.format(totals.revenue)}</p>
            <p className="stat-detail">Current member selections</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Expenses</p>
            <p className="stat-value">{currency.format(totals.expensesTotal)}</p>
            <p className="stat-detail">Recorded operating costs</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Estimated net</p>
            <p className={`stat-value ${totals.net < 0 ? "stat-value--negative" : "stat-value--positive"}`}>
              {currency.format(totals.net)}
            </p>
            <p className="stat-detail">Revenue minus expenses</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Paying members</p>
            <p className="stat-value">{totals.activeMembers}</p>
            <p className="stat-detail">With a selected membership</p>
          </article>
        </section>

        <div className="section-stack">
          <section className="surface-card">
            <div className="surface-card__header">
              <div>
                <h2>Revenue breakdown</h2>
                <p>Estimated from membership and private-session selections.</p>
              </div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Membership</th>
                    <th>Private sessions</th>
                    <th>Estimated revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="table-primary">
                          {member.displayName || member.name || "Unnamed member"}
                        </div>
                        <div className="table-secondary">{member.email}</div>
                      </td>
                      <td><span className="badge">{member.membership || "none"}</span></td>
                      <td>{member.privateSessions === "none" || member.privateSessions === "0" ? "None" : member.privateSessions}</td>
                      <td className="table-primary">{currency.format(calculateRevenue(member.membership, member.privateSessions))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && members.length === 0 && (
                <div className="empty-state"><strong>No member revenue yet</strong>Member revenue will appear here.</div>
              )}
            </div>
          </section>

          <section className="surface-card">
            <div className="surface-card__header">
              <div>
                <h2>Expenses</h2>
                <p>Add operating costs and keep the estimate current.</p>
              </div>
            </div>

            <form className="expense-form" onSubmit={handleAddExpense}>
              <div className="field">
                <label htmlFor="expense-name">Expense name</label>
                <input id="expense-name" value={expenseName} onChange={(event) => setExpenseName(event.target.value)} placeholder="Utilities" />
              </div>
              <div className="field">
                <label htmlFor="expense-price">Price (USD)</label>
                <input id="expense-price" type="number" min="0.01" step="0.01" inputMode="decimal" value={expensePrice} onChange={(event) => setExpensePrice(event.target.value)} placeholder="0.00" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>Add expense</button>
            </form>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="table-primary">{expense.name}</td>
                      <td>{currency.format(Number(expense.price) || 0)}</td>
                      <td>
                        <button type="button" className="btn btn-danger btn-small" onClick={() => setExpenseToDelete(expense)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && expenses.length === 0 && (
                <div className="empty-state"><strong>No expenses recorded</strong>Add an operating expense above.</div>
              )}
            </div>
          </section>
        </div>

        <Modal
          isOpen={Boolean(expenseToDelete)}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={handleDeleteExpense}
          title="Delete expense"
          confirmText="Delete expense"
          destructive
          busy={loading}
        >
          <p>Delete <strong>{expenseToDelete?.name}</strong> for {currency.format(Number(expenseToDelete?.price) || 0)}?</p>
        </Modal>

        {loading && (
          <div className="loading-overlay" role="status" aria-live="polite">
            <div className="loading-panel"><span className="spinner" aria-hidden="true" />Updating report…</div>
          </div>
        )}
      </main>
    </>
  );
};

export default ReportPage;

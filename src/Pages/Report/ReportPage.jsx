import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";

const calculateRevenue = (membership, privateSessions) => {
  const memberships = { student: 35, regular: 50 };
  const sessions = { 1: 10, 12: 100, 16: 130, 20: 160 };
  return (memberships[membership] || 0) + (sessions[privateSessions] || 0);
};

const ReportPage = () => {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseName, setExpenseName] = useState("");
  const [expensePrice, setExpensePrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        setErrorMessage(getErrorMessage(error, "Unable to load the report"));
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
      (total, expense) => total + Number(expense.price),
      0,
    );
    return { revenue, expensesTotal, net: revenue - expensesTotal };
  }, [members, expenses]);

  const handleAddExpense = async () => {
    const price = Number(expensePrice);
    if (!expenseName.trim() || !Number.isFinite(price) || price <= 0) {
      setErrorMessage("Enter a valid expense name and price.");
      return;
    }

    setLoading(true);
    try {
      const expense = await jsonRequest("/expenses", "POST", {
        name: expenseName,
        price,
      });
      setExpenses((previous) => [expense, ...previous]);
      setExpenseName("");
      setExpensePrice("");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to add expense"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    setLoading(true);
    try {
      await apiRequest(`/expenses/${id}`, { method: "DELETE" });
      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== id),
      );
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete expense"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="Reports" />
      <div className="dashboard">
        {loading && <p>Loading...</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <h1>Revenue Report</h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Membership Type</th>
              <th>Private Sessions</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.displayName}</td>
                <td>{member.membership}</td>
                <td>{member.privateSessions}</td>
                <td>
                  ${calculateRevenue(member.membership, member.privateSessions)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Total Revenue Before Expenses: ${totals.revenue}</h2>
        <h3>Total Expenses: ${totals.expensesTotal}</h3>
        <h2>Total Revenue After Expenses: ${totals.net}</h2>

        <h3>Expenses</h3>
        <table>
          <thead>
            <tr>
              <th>Expense Name</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.name}</td>
                <td>${expense.price}</td>
                <td>
                  <button onClick={() => handleDeleteExpense(expense.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="expense-form">
          <h3>Add Expense</h3>
          <input
            placeholder="Expense Name"
            value={expenseName}
            onChange={(event) => setExpenseName(event.target.value)}
          />
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Expense Price"
            value={expensePrice}
            onChange={(event) => setExpensePrice(event.target.value)}
          />
          <button className="add-expense" onClick={handleAddExpense}>
            Add Expense
          </button>
        </div>
      </div>
    </>
  );
};

export default ReportPage;

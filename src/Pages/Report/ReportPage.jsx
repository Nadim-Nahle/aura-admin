import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../../components/Navbar';

const ReportPage = () => {
  const [membersData, setMembersData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [expenseName, setExpenseName] = useState('');
  const [expensePrice, setExpensePrice] = useState(0);

  const api = "https://us-central1-aura-9c98c.cloudfunctions.net/api/users/admin/topSecret";
  const expensesApi = "https://us-central1-aura-9c98c.cloudfunctions.net/api/expenses"; // Your expense API
  const authApiToken = "f80db53c-2ca4-4e38-a0d3-588a69bc7281";

  // Fetch members data from the API
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await axios.get(api, {
          headers: { "auth-api": authApiToken }
        });
        setMembersData(response.data);
      } catch (error) {
        console.error('Error fetching members data:', error);
      }
    };

    fetchMembers();
  }, []);

  // Fetch expenses and update the expenses state
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await axios.get(expensesApi, {
          headers: { "auth-api": authApiToken }
        });
        setExpenses(response.data);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };

    fetchExpenses();
  }, [expenses]);

  // Revenue calculation function for memberships and private sessions
  const calculateRevenue = (membership, privateSessions) => {
    let membershipRevenue = 0;
    let privateSessionRevenue = 0;

    // Calculate membership revenue
    if (membership === 'student') {
      membershipRevenue = 35;
    } else if (membership === 'regular') {
      membershipRevenue = 50;
    }

    // Calculate private session revenue
    if (privateSessions == 1) {
      privateSessionRevenue = 10;
    } else if (privateSessions == 12) {
      privateSessionRevenue = 100;
    } else if (privateSessions == 16) {
      privateSessionRevenue = 130;
    } else if (privateSessions == 20) {
      privateSessionRevenue = 160;
    }

    return membershipRevenue + privateSessionRevenue;
  };

  // Calculate total revenue for all members
  useEffect(() => {
    const total = membersData.reduce((acc, member) => {
      return acc + calculateRevenue(member.membership, member.privateSessions);
    }, 0);

    // Deduct expenses from the total revenue
    const revenueAfterExpenses = total - expenses.reduce((acc, expense) => acc + expense.price, 0);

    setTotalRevenue(revenueAfterExpenses);
  }, [membersData, expenses]);

  // Handle adding an expense
  const handleAddExpense = async () => {
    if (!expenseName || expensePrice <= 0) {
      alert("Please provide a valid name and price for the expense.");
      return;
    }

    try {
      await axios.post(expensesApi, {
        name: expenseName,
        price: expensePrice,
      }, {
        headers: { "auth-api": authApiToken }
      });

      // Clear input fields after the expense is added
      setExpenseName('');
      setExpensePrice(0);

      // Trigger the fetchExpenses function to update the expenses
      setExpenses(prev => [...prev, { name: expenseName, price: expensePrice }]);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  return (
    <>
      <Navbar title="Reports" />
      <div>
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
            {membersData.map((member) => {
              const revenue = calculateRevenue(member.membership, member.privateSessions);
              return (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.membership}</td>
                  <td>{member.privateSessions}</td>
                  <td>${revenue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2>Total Revenue Before Expenses: ${membersData.reduce((acc, member) => acc + calculateRevenue(member.membership, member.privateSessions), 0)}</h2>
        <h3>Total Expenses: ${expenses.reduce((acc, expense) => acc + expense.price, 0)}</h3>
        <h2>Total Revenue After Expenses: ${totalRevenue}</h2>

        {/* Table to display expenses */}
        <h3>Expenses</h3>
        <table>
          <thead>
            <tr>
              <th>Expense Name</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense, index) => (
              <tr key={index}>
                <td>{expense.name}</td>
                <td>${expense.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Form to add new expenses */}
        <div className='expense-form'> 
          <h3>Add Expense</h3>
          <input 
            type="text" 
            placeholder="Expense Name" 
            value={expenseName} 
            onChange={(e) => setExpenseName(e.target.value)} 
          />
          <input 
            type="number" 
            placeholder="Expense Price" 
            value={expensePrice} 
            onChange={(e) => setExpensePrice(Number(e.target.value))} 
          />
          <button className="add-expense" onClick={handleAddExpense}>Add Expense</button>
        </div>
      </div>
    </>
  );
};

export default ReportPage;

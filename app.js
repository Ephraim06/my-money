document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const incomeForm = document.getElementById('income-form');
  const transactionForm = document.getElementById('transaction-form');
  const transactionsList = document.getElementById('transactions-list');
  const monthlyIncomeDisplay = document.getElementById('monthly-income');
  const currentBalanceDisplay = document.getElementById('current-balance');
  const totalExpensesDisplay = document.getElementById('total-expenses');
  const remainingBudgetDisplay = document.getElementById('remaining-budget');
  const dailyAverageDisplay = document.getElementById('daily-average');

  // Chart
  let categoryChart = null;

  // Initialize app
  initApp();

  // Event Listeners
  incomeForm.addEventListener('submit', handleSetIncome);
  transactionForm.addEventListener('submit', handleAddTransaction);

  // Initialize the app
  function initApp() {
    // Set today's date as default in the form
    document.getElementById('transaction-date').valueAsDate = new Date();

    // Load data from localStorage
    loadData();

    // Update UI
    updateUI();
  }

  // Handle setting monthly income
  function handleSetIncome(e) {
    e.preventDefault();

    const incomeAmount = parseFloat(
      document.getElementById('income-amount').value
    );

    if (isNaN(incomeAmount) || incomeAmount <= 0) {
      alert('Please enter a valid income amount');
      return;
    }

    // Save to localStorage
    localStorage.setItem('monthlyIncome', incomeAmount.toString());

    // Update UI
    updateUI();

    // Reset form
    incomeForm.reset();
  }

  // Handle adding a new transaction
  function handleAddTransaction(e) {
    e.preventDefault();

    const type = document.getElementById('transaction-type').value;
    const amount = parseFloat(
      document.getElementById('transaction-amount').value
    );
    const description = document
      .getElementById('transaction-description')
      .value.trim();
    const category = document.getElementById('transaction-category').value;
    const date = document.getElementById('transaction-date').value;

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!description) {
      alert('Please enter a description');
      return;
    }

    if (!date) {
      alert('Please select a date');
      return;
    }

    // Create transaction object
    const transaction = {
      id: Date.now(),
      type,
      amount: type === 'expense' ? -amount : amount,
      description,
      category,
      date,
    };

    // Get existing transactions
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // Add new transaction
    transactions.push(transaction);

    // Save to localStorage
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // Update UI
    updateUI();

    // Reset form
    transactionForm.reset();
    document.getElementById('transaction-date').valueAsDate = new Date();
  }

  // Load data from localStorage
  function loadData() {
    // Check if monthly income is set
    const income = parseFloat(localStorage.getItem('monthlyIncome')) || 0;
    if (income > 0) {
      document.getElementById('income-amount').value = income;
    }
  }

  // Update the UI with current data
  function updateUI() {
    const monthlyIncome =
      parseFloat(localStorage.getItem('monthlyIncome')) || 0;
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // Calculate totals
    const totalExpenses = Math.abs(
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const totalAdditionalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance =
      monthlyIncome + totalAdditionalIncome - totalExpenses;

    // Update displays
    monthlyIncomeDisplay.textContent = formatCurrency(monthlyIncome);
    totalExpensesDisplay.textContent = formatCurrency(totalExpenses);
    currentBalanceDisplay.textContent = formatCurrency(currentBalance);

    // Calculate remaining budget and daily average
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();
    const daysRemaining = daysInMonth - currentDay + 1;

    const remainingBudget = currentBalance;
    const dailyAverage = remainingBudget / daysRemaining;

    remainingBudgetDisplay.textContent = formatCurrency(remainingBudget);
    dailyAverageDisplay.textContent = formatCurrency(dailyAverage);

    // Update transactions list
    renderTransactions(transactions);

    // Update chart
    updateChart(transactions);
  }

  // Render transactions list
  function renderTransactions(transactions) {
    // Clear existing transactions
    transactionsList.innerHTML = '';

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (transactions.length === 0) {
      transactionsList.innerHTML =
        '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No transactions yet</td></tr>';
      return;
    }

    // Add each transaction to the table
    transactions.forEach((transaction) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';
      row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(
                  transaction.date
                )}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                  transaction.description
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${getCategoryColor(transaction.category)}">
                        ${transaction.category}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm 
                    ${
                      transaction.type === 'expense'
                        ? 'text-red-600'
                        : 'text-green-600'
                    }">
                    ${
                      transaction.type === 'expense' ? '-' : '+'
                    }${formatCurrency(Math.abs(transaction.amount))}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${
                      transaction.id
                    }" class="text-indigo-600 hover:text-indigo-900 delete-btn">Delete</button>
                </td>
            `;
      transactionsList.appendChild(row);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', handleDeleteTransaction);
    });
  }

  // Handle deleting a transaction
  function handleDeleteTransaction(e) {
    const id = parseInt(e.target.getAttribute('data-id'));

    // Get existing transactions
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // Filter out the transaction to delete
    transactions = transactions.filter((t) => t.id !== id);

    // Save to localStorage
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // Update UI
    updateUI();
  }

  // Update the category chart
  function updateChart(transactions) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    // Group expenses by category
    const expensesByCategory = {};

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (!expensesByCategory[t.category]) {
          expensesByCategory[t.category] = 0;
        }
        expensesByCategory[t.category] += Math.abs(t.amount);
      });

    const categories = Object.keys(expensesByCategory);
    const amounts = Object.values(expensesByCategory);

    // Colors for categories
    const backgroundColors = categories.map((cat) => {
      switch (cat) {
        case 'shopping':
          return 'rgba(255, 99, 132, 0.7)';
        case 'food':
          return 'rgba(54, 162, 235, 0.7)';
        case 'transport':
          return 'rgba(255, 206, 86, 0.7)';
        case 'bills':
          return 'rgba(75, 192, 192, 0.7)';
        case 'entertainment':
          return 'rgba(153, 102, 255, 0.7)';
        default:
          return 'rgba(201, 203, 207, 0.7)';
      }
    });

    // Destroy previous chart if it exists
    if (categoryChart) {
      categoryChart.destroy();
    }

    // Create new chart
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [
          {
            data: amounts,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.label}: ${formatCurrency(context.raw)}`;
              },
            },
          },
        },
      },
    });
  }

  // Helper function to format currency (ZAR)
  function formatCurrency(amount) {
    return 'R' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  // Helper function to format date
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Helper function to get category color
  function getCategoryColor(category) {
    switch (category) {
      case 'shopping':
        return 'bg-red-100 text-red-800';
      case 'food':
        return 'bg-blue-100 text-blue-800';
      case 'transport':
        return 'bg-yellow-100 text-yellow-800';
      case 'bills':
        return 'bg-green-100 text-green-800';
      case 'entertainment':
        return 'bg-purple-100 text-purple-800';
      case 'freelance':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
});

document.addEventListener('DOMContentLoaded', function () {
  if (window.lucide) lucide.createIcons();

  // =============================
  // STATE
  // =============================
  let monthlyIncome = parseFloat(localStorage.getItem('monthlyIncome')) || 0;
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

  let categoryChart = null;
  let monthlyChart = null;
  let filteredTransactions = [];

  // =============================
  // LOADER FUNCTIONS
  // =============================
  window.showLoader = function () {
    document.getElementById('loader-overlay').classList.add('active');
  };

  window.hideLoader = function () {
    document.getElementById('loader-overlay').classList.remove('active');
  };

  // =============================
  // SNACKBAR FUNCTIONS
  // =============================
  window.showSnackbar = function (message, type = 'info') {
    const snackbar = document.getElementById('snackbar');
    const messageEl = document.getElementById('snackbar-message');

    snackbar.className = 'snackbar ' + type;
    messageEl.textContent = message;
    snackbar.classList.add('show');

    setTimeout(() => {
      hideSnackbar();
    }, 3000);
  };

  window.hideSnackbar = function () {
    document.getElementById('snackbar').classList.remove('show');
  };

  // =============================
  // HELPERS
  // =============================
  function formatCurrency(amount) {
    return 'R' + Math.abs(amount).toFixed(2);
  }

  function todayString() {
    return new Date().toISOString().split('T')[0];
  }

  function saveToStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('monthlyIncome', monthlyIncome.toString());
  }

  function calculateStats() {
    const totalExpenses = Math.abs(
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    );

    const totalIncomeExtra = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = monthlyIncome + totalIncomeExtra - totalExpenses;

    const today = todayString();

    const todayIncome = transactions
      .filter((t) => t.type === 'income' && t.date === today)
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpenses = Math.abs(
      transactions
        .filter((t) => t.type === 'expense' && t.date === today)
        .reduce((sum, t) => sum + t.amount, 0),
    );

    const percentage =
      monthlyIncome > 0
        ? Math.min((totalExpenses / monthlyIncome) * 100, 100)
        : 0;

    return {
      totalExpenses,
      balance,
      todayIncome,
      todayExpenses,
      percentage,
    };
  }

  // =============================
  // UPDATE UI
  // =============================
  function updateUI() {
    const stats = calculateStats();

    document.getElementById('mobile-monthly-income').textContent =
      formatCurrency(monthlyIncome);

    document.getElementById('mobile-total-expenses').textContent =
      formatCurrency(stats.totalExpenses);

    document.getElementById('mobile-current-balance').textContent =
      formatCurrency(stats.balance);

    document.getElementById('mobile-spent-amount').textContent = formatCurrency(
      stats.totalExpenses,
    );

    document.getElementById('mobile-left-amount').textContent = formatCurrency(
      stats.balance,
    );

    document.getElementById('budget-percentage').textContent =
      stats.percentage.toFixed(0) + '%';

    document.getElementById('mobile-budget-progress').style.width =
      stats.percentage + '%';

    document.getElementById('today-income').textContent = formatCurrency(
      stats.todayIncome,
    );

    document.getElementById('today-expenses').textContent = formatCurrency(
      stats.todayExpenses,
    );

    updateTransactionsList();
    updateAllTransactionsList();
    updateCategoryChart();
    updateMonthlyChart();
    updateStatsPage();
    updateCategoryBreakdown();

    saveToStorage();
  }

  // =============================
  // CATEGORY BREAKDOWN
  // =============================
  function updateCategoryBreakdown() {
    const breakdown = document.getElementById('category-breakdown');
    if (!breakdown) return;

    const expenseTransactions = transactions.filter(
      (t) => t.type === 'expense',
    );
    const totalExpenses = Math.abs(
      expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
    );

    const grouped = {};
    expenseTransactions.forEach((t) => {
      const amount = Math.abs(t.amount);
      grouped[t.category] = (grouped[t.category] || 0) + amount;
    });

    let html = '';
    Object.entries(grouped).forEach(([category, amount]) => {
      const percentage =
        totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
      html += `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="category-pill ${category}">${category}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">${formatCurrency(amount)}</span>
            <span class="text-xs text-slate-400">${percentage}%</span>
          </div>
        </div>
      `;
    });

    breakdown.innerHTML =
      html || '<p class="text-slate-400 text-sm">No expenses yet</p>';
  }

  // =============================
  // STATS PAGE
  // =============================
  function updateStatsPage() {
    const expenseTransactions = transactions.filter(
      (t) => t.type === 'expense',
    );

    // Average daily expense
    const dates = [...new Set(expenseTransactions.map((t) => t.date))];
    const totalExpenses = Math.abs(
      expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
    );
    const avgDaily = dates.length > 0 ? totalExpenses / dates.length : 0;
    document.getElementById('avg-daily-expense').textContent =
      formatCurrency(avgDaily);

    // Highest expense
    const highest = expenseTransactions.reduce(
      (max, t) => (Math.abs(t.amount) > Math.abs(max?.amount || 0) ? t : max),
      null,
    );
    document.getElementById('highest-expense').textContent = highest
      ? formatCurrency(Math.abs(highest.amount))
      : 'R0.00';

    // Total transactions
    document.getElementById('total-transactions').textContent =
      transactions.length;

    // Top categories
    updateTopCategories();
  }

  function updateTopCategories() {
    const list = document.getElementById('top-categories-list');
    if (!list) return;

    const expenseTransactions = transactions.filter(
      (t) => t.type === 'expense',
    );
    const grouped = {};

    expenseTransactions.forEach((t) => {
      const amount = Math.abs(t.amount);
      grouped[t.category] = (grouped[t.category] || 0) + amount;
    });

    const sorted = Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    let html = '';
    sorted.forEach(([category, amount]) => {
      html += `
        <div class="flex items-center justify-between">
          <span class="category-pill ${category}">${category}</span>
          <span class="font-medium">${formatCurrency(amount)}</span>
        </div>
      `;
    });

    list.innerHTML = html || '<p class="text-slate-400">No data yet</p>';
  }

  // =============================
  // MONTHLY CHART
  // =============================
  function updateMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    const monthlyData = {};
    const today = new Date();
    const sixMonthsAgo = new Date(today.setMonth(today.getMonth() - 5));

    transactions.forEach((t) => {
      const date = new Date(t.date);
      if (date >= sixMonthsAgo) {
        const monthYear = date.toLocaleString('default', {
          month: 'short',
          year: '2-digit',
        });
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { income: 0, expenses: 0 };
        }
        if (t.type === 'income') {
          monthlyData[monthYear].income += t.amount;
        } else {
          monthlyData[monthYear].expenses += Math.abs(t.amount);
        }
      }
    });

    const labels = Object.keys(monthlyData).sort();
    const incomeData = labels.map((l) => monthlyData[l].income);
    const expensesData = labels.map((l) => monthlyData[l].expenses);

    if (monthlyChart) {
      monthlyChart.destroy();
    }

    monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#22c55e',
          },
          {
            label: 'Expenses',
            data: expensesData,
            backgroundColor: '#ef4444',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    });
  }

  // =============================
  // TRANSACTIONS LIST (Home)
  // =============================
  function updateTransactionsList() {
    const list = document.getElementById('mobile-transactions-list');
    list.innerHTML = '';

    if (transactions.length === 0) {
      list.innerHTML =
        "<div class='text-center text-slate-400 text-sm py-6'>No transactions yet</div>";
      return;
    }

    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    sorted.slice(0, 10).forEach((t) => {
      addTransactionToList(list, t);
    });
  }

  function addTransactionToList(list, t) {
    const div = document.createElement('div');
    div.className =
      'bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-100 transaction-item';
    div.setAttribute('data-id', t.id);
    div.onclick = () => openEditSheet(t.id);

    div.innerHTML = `
      <div>
        <p class="font-medium text-sm">${t.description}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="category-pill ${t.category}">
            ${t.category}
          </span>
          <span class="text-xs text-slate-400">${t.date}</span>
        </div>
      </div>
      <p class="font-semibold text-sm ${
        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
      }">
        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
      </p>
    `;

    list.appendChild(div);
  }

  // =============================
  // ALL TRANSACTIONS LIST (History)
  // =============================
  function updateAllTransactionsList() {
    const list = document.getElementById('all-transactions-list');
    if (!list) return;

    list.innerHTML = '';

    if (transactions.length === 0) {
      list.innerHTML =
        "<div class='text-center text-slate-400 text-sm py-6'>No transactions yet</div>";
      return;
    }

    const sorted = [
      ...(filteredTransactions.length ? filteredTransactions : transactions),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((t) => {
      const div = document.createElement('div');
      div.className =
        'bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-100 transaction-item';
      div.setAttribute('data-id', t.id);
      div.onclick = () => openEditSheet(t.id);

      div.innerHTML = `
        <div>
          <p class="font-medium text-sm">${t.description}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="category-pill ${t.category}">
              ${t.category}
            </span>
            <span class="text-xs text-slate-400">${t.date}</span>
          </div>
        </div>
        <p class="font-semibold text-sm ${
          t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
        }">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </p>
      `;

      list.appendChild(div);
    });
  }

  // =============================
  // FILTER TRANSACTIONS
  // =============================
  window.filterTransactions = function () {
    const searchTerm =
      document.getElementById('search-transactions')?.value.toLowerCase() || '';
    const category = document.getElementById('filter-category')?.value || 'all';

    filteredTransactions = transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm);
      const matchesCategory = category === 'all' || t.category === category;
      return matchesSearch && matchesCategory;
    });

    updateAllTransactionsList();
  };

  // =============================
  // EXPORT/IMPORT
  // =============================
  window.exportData = function () {
    const data = {
      monthlyIncome,
      transactions,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-money-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showSnackbar('Data exported successfully!', 'success');
  };

  window.importData = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function (e) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const data = JSON.parse(e.target.result);

          if (
            data.monthlyIncome !== undefined &&
            data.transactions !== undefined
          ) {
            monthlyIncome = data.monthlyIncome;
            transactions = data.transactions;
            saveToStorage();
            updateUI();
            showSnackbar('Data imported successfully!', 'success');
          } else {
            showSnackbar('Invalid file format', 'error');
          }
        } catch (error) {
          showSnackbar('Error importing file', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // =============================
  // CATEGORY CHART
  // =============================
  function updateCategoryChart() {
    const ctx = document.getElementById('mobileCategoryChart');
    if (!ctx) return;

    const expenseTransactions = transactions.filter(
      (t) => t.type === 'expense',
    );

    const grouped = {};

    expenseTransactions.forEach((t) => {
      const amount = Math.abs(t.amount);
      grouped[t.category] = (grouped[t.category] || 0) + amount;
    });

    const labels = Object.keys(grouped);
    const data = Object.values(grouped);

    if (categoryChart) {
      categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              '#6366f1',
              '#ef4444',
              '#22c55e',
              '#f59e0b',
              '#a855f7',
              '#0ea5e9',
              '#ec4899',
            ],
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
        },
        maintainAspectRatio: false,
      },
    });
  }

  // =============================
  // FORMS
  // =============================
  document
    .getElementById('mobile-income-form')
    .addEventListener('submit', function (e) {
      e.preventDefault();

      const amount =
        parseFloat(document.getElementById('mobile-income-amount').value) || 0;

      monthlyIncome = amount;
      closeIncomeSheet();
      updateUI();
      showSnackbar('Monthly income updated!', 'success');
    });

  document
    .getElementById('mobile-transaction-form')
    .addEventListener('submit', function (e) {
      e.preventDefault();

      const type = document.getElementById('transaction-type').value;

      const amount =
        parseFloat(
          document.getElementById('mobile-transaction-amount').value,
        ) || 0;

      const description = document.getElementById(
        'mobile-transaction-description',
      ).value;

      const category = document.getElementById(
        'mobile-transaction-category',
      ).value;

      const date = document.getElementById('mobile-transaction-date').value;

      if (!amount || !description || !date) {
        showSnackbar('Please fill all fields', 'error');
        return;
      }

      const newTransaction = {
        id: Date.now(),
        type,
        amount: type === 'expense' ? -amount : amount,
        description,
        category,
        date,
      };

      transactions.push(newTransaction);

      this.reset();
      document.getElementById('mobile-transaction-date').value = todayString();
      setTransactionType('expense');

      closeAddSheet();
      updateUI();
      showSnackbar('Transaction added!', 'success');
    });

  // Edit form
  document
    .getElementById('edit-transaction-form')
    .addEventListener('submit', function (e) {
      e.preventDefault();

      const id = parseInt(document.getElementById('edit-transaction-id').value);
      const type = document.getElementById('edit-transaction-type').value;
      const amount = parseFloat(
        document.getElementById('edit-transaction-amount').value,
      );
      const description = document.getElementById(
        'edit-transaction-description',
      ).value;
      const category = document.getElementById(
        'edit-transaction-category',
      ).value;
      const date = document.getElementById('edit-transaction-date').value;

      const index = transactions.findIndex((t) => t.id === id);
      if (index !== -1) {
        transactions[index] = {
          ...transactions[index],
          type,
          amount: type === 'expense' ? -amount : amount,
          description,
          category,
          date,
        };

        updateUI();
        closeEditSheet();
        showSnackbar('Transaction updated!', 'success');
      }
    });

  // =============================
  // DELETE TRANSACTION
  // =============================
  window.deleteTransaction = function () {
    const id = parseInt(document.getElementById('edit-transaction-id').value);

    if (confirm('Are you sure you want to delete this transaction?')) {
      transactions = transactions.filter((t) => t.id !== id);
      updateUI();
      closeEditSheet();
      showSnackbar('Transaction deleted!', 'info');
    }
  };

  // =============================
  // BOTTOM SHEETS
  // =============================
  window.openIncomeSheet = function () {
    document.getElementById('mobile-income-amount').value = monthlyIncome;
    document.getElementById('income-sheet').classList.add('open');
  };

  window.closeIncomeSheet = function () {
    document.getElementById('income-sheet').classList.remove('open');
  };

  window.openAddSheet = function () {
    document.getElementById('add-sheet').classList.add('open');
  };

  window.closeAddSheet = function () {
    document.getElementById('add-sheet').classList.remove('open');
  };

  window.openEditSheet = function (id) {
    const transaction = transactions.find((t) => t.id === id);
    if (!transaction) return;

    document.getElementById('edit-transaction-id').value = transaction.id;
    document.getElementById('edit-transaction-amount').value = Math.abs(
      transaction.amount,
    );
    document.getElementById('edit-transaction-description').value =
      transaction.description;
    document.getElementById('edit-transaction-category').value =
      transaction.category;
    document.getElementById('edit-transaction-date').value = transaction.date;

    setEditTransactionType(transaction.type);
    document.getElementById('edit-sheet').classList.add('open');
  };

  window.closeEditSheet = function () {
    document.getElementById('edit-sheet').classList.remove('open');
  };

  // =============================
  // TOGGLE TRANSACTION TYPE
  // =============================
  window.setTransactionType = function (type) {
    document.getElementById('transaction-type').value = type;

    const expenseBtn = document.getElementById('expense-toggle');
    const incomeBtn = document.getElementById('income-toggle');

    expenseBtn.classList.remove('bg-white', 'shadow-sm');
    incomeBtn.classList.remove('bg-white', 'shadow-sm');

    if (type === 'expense') {
      expenseBtn.classList.add('bg-white', 'shadow-sm');
    } else {
      incomeBtn.classList.add('bg-white', 'shadow-sm');
    }
  };

  window.setEditTransactionType = function (type) {
    document.getElementById('edit-transaction-type').value = type;

    const expenseBtn = document.getElementById('edit-expense-toggle');
    const incomeBtn = document.getElementById('edit-income-toggle');

    expenseBtn.classList.remove('bg-white', 'shadow-sm');
    incomeBtn.classList.remove('bg-white', 'shadow-sm');

    if (type === 'expense') {
      expenseBtn.classList.add('bg-white', 'shadow-sm');
    } else {
      incomeBtn.classList.add('bg-white', 'shadow-sm');
    }
  };

  // =============================
  // TAB SWITCHING
  // =============================
  window.switchTab = function (tab) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Update pages
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('stats-page').style.display = 'none';
    document.getElementById('transactions-page').style.display = 'none';

    document.getElementById(tab + '-page').style.display = 'block';

    // Update title
    const titles = {
      home: 'My Money',
      stats: 'Statistics',
      transactions: 'History',
    };
    document.getElementById('app-title').textContent = titles[tab];

    // Refresh icons
    if (window.lucide) lucide.createIcons();
  };

  // =============================
  // REFRESH DATA
  // =============================
  window.refreshData = function () {
    showLoader();

    // Simulate refresh delay
    setTimeout(() => {
      updateUI();
      hideLoader();
      showSnackbar('Data refreshed!', 'success');
    }, 800);
  };

  // =============================
  // PULL TO REFRESH
  // =============================
  let touchstartY = 0;
  let touchendY = 0;

  document.addEventListener(
    'touchstart',
    (e) => {
      touchstartY = e.changedTouches[0].screenY;
    },
    false,
  );

  document.addEventListener(
    'touchend',
    (e) => {
      touchendY = e.changedTouches[0].screenY;
      const ptrElement = document.getElementById('ptr-element');

      if (window.scrollY === 0 && touchendY > touchstartY + 50) {
        ptrElement.classList.add('visible');
        refreshData();

        setTimeout(() => {
          ptrElement.classList.remove('visible');
        }, 1000);
      }
    },
    false,
  );

  // =============================
  // CLOSE SHEETS ON BACKDROP CLICK
  // =============================
  document.querySelectorAll('.mobile-bottom-sheet').forEach((sheet) => {
    sheet.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('open');
      }
    });
  });

  // =============================
  // INIT
  // =============================
  document.getElementById('mobile-transaction-date').value = todayString();

  // Show welcome message if first time
  if (transactions.length === 0 && monthlyIncome === 0) {
    setTimeout(() => {
      showSnackbar('Welcome to My Money! 👋', 'info');
    }, 500);
  }

  updateUI();

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/my-money/sw.js')
      .then((reg) => console.log('Service Worker registered'))
      .catch((err) => console.log('Service Worker registration failed'));
  }
});


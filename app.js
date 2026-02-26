document.addEventListener('DOMContentLoaded', function () {
  if (window.lucide) lucide.createIcons();

  // =============================
  // STATE
  // =============================
  let monthlyIncome = parseFloat(localStorage.getItem('monthlyIncome')) || 0;
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

  let categoryChart = null;

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
    updateCategoryChart();

    saveToStorage();
  }

  // =============================
  // TRANSACTIONS LIST
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
      const div = document.createElement('div');
      div.className =
        'bg-white rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-100';

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

      if (!amount || !description || !date) return;

      transactions.push({
        id: Date.now(),
        type,
        amount: type === 'expense' ? -amount : amount,
        description,
        category,
        date,
      });

      this.reset();
      document.getElementById('mobile-transaction-date').value = todayString();

      closeAddSheet();
      updateUI();
    });

  // =============================
  // BOTTOM SHEETS
  // =============================
  window.openIncomeSheet = function () {
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

  // =============================
  // INIT
  // =============================
  document.getElementById('mobile-transaction-date').value = todayString();

  updateUI();
});

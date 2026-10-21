const { createApp, ref, computed, watch } = Vue;

const cfg = window.TrackerConfig;
const STORAGE_KEY = 'expense-tracker:transactions';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 6. Load saved transactions, keeping only well-formed entries
function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((t) =>
        t && typeof t.id === 'string' && typeof t.text === 'string' &&
        typeof t.amount === 'number' && isFinite(t.amount) && t.amount > 0 &&
        (t.type === 'income' || t.type === 'expense') &&
        typeof t.category === 'string' && DATE_RE.test(t.date))
      .map((t) => ({ id: t.id, text: t.text, amount: t.amount, type: t.type, category: t.category, date: t.date }));
  } catch (e) {
    return [];
  }
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round2 = (n) => Math.round(n * 100) / 100;

// "2026-03" -> "March 2026"
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

createApp({
  components: { TransactionForm, TransactionItem, SpendingChart },

  setup() {
    // 1. A transaction is { id, text, amount, type: 'income' | 'expense', category, date: 'YYYY-MM-DD' }
    const transactions = ref(loadTransactions());
    const categoryFilter = ref('all');
    const monthFilter = ref('all');

    // 6. Persist on every change
    watch(transactions, () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.value)); } catch (e) {}
    }, { deep: true });

    // 5. Filter options come from the data itself
    const categoryOptions = computed(() =>
      [...new Set(transactions.value.map((t) => t.category))].sort()
    );
    const monthOptions = computed(() =>
      [...new Set(transactions.value.map((t) => t.date.slice(0, 7)))]
        .sort().reverse()
        .map((value) => ({ value, label: monthLabel(value) }))
    );

    // If the selected category or month disappears (after deleting), go back to "all"
    watch(categoryOptions, (opts) => {
      if (categoryFilter.value !== 'all' && !opts.includes(categoryFilter.value)) categoryFilter.value = 'all';
    });
    watch(monthOptions, (opts) => {
      if (monthFilter.value !== 'all' && !opts.some((m) => m.value === monthFilter.value)) monthFilter.value = 'all';
    });

    const matchesFilters = (t) =>
      (categoryFilter.value === 'all' || t.category === categoryFilter.value) &&
      (monthFilter.value === 'all' || t.date.slice(0, 7) === monthFilter.value);

    const filtered = computed(() => transactions.value.filter(matchesFilters));
    const hasFilters = computed(() => categoryFilter.value !== 'all' || monthFilter.value !== 'all');

    // Newest date first; among the same date, the most recently added first
    const listItems = computed(() =>
      [...filtered.value].reverse().sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    );

    // 3. Totals with reduce(). They follow the filters, so a month filter shows that month's totals.
    const income = computed(() =>
      round2(filtered.value.reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum), 0))
    );
    const expenses = computed(() =>
      round2(filtered.value.reduce((sum, t) => (t.type === 'expense' ? sum + t.amount : sum), 0))
    );
    const balance = computed(() => round2(income.value - expenses.value));

    const scopeLabel = computed(() => {
      if (!hasFilters.value) return 'Showing all transactions';
      const parts = [];
      if (categoryFilter.value !== 'all') parts.push(categoryFilter.value);
      if (monthFilter.value !== 'all') parts.push(monthLabel(monthFilter.value));
      return 'Showing ' + parts.join(' · ');
    });

    // Challenge: spending (expenses only) grouped by category, biggest first
    const spending = computed(() => {
      const totals = filtered.value
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
      return Object.entries(totals)
        .map(([category, total]) => ({ category, total: round2(total), color: cfg.colorFor(category) }))
        .sort((a, b) => b.total - a.total);
    });

    // 2 and 4. Add and delete
    function addTransaction(data) {
      const tx = { id: newId(), ...data };
      transactions.value.push(tx);
      // If a filter would hide the new transaction, clear the filters so it is visible
      if (!matchesFilters(tx)) clearFilters();
    }

    function removeTransaction(id) {
      transactions.value = transactions.value.filter((t) => t.id !== id);
    }

    function clearFilters() {
      categoryFilter.value = 'all';
      monthFilter.value = 'all';
    }

    // A handful of example transactions so the chart and filters have something to show
    function addSamples() {
      const ago = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return cfg.toISO(d); };
      const rows = [
        ['Monthly salary', 3200, 'income', 'Salary', 34],
        ['Freelance project', 450, 'income', 'Freelance', 12],
        ['Rent', 1100, 'expense', 'Housing', 31],
        ['Groceries', 86.4, 'expense', 'Food', 6],
        ['Lunch with friends', 32.5, 'expense', 'Food', 2],
        ['Bus pass', 40, 'expense', 'Transport', 20],
        ['Electricity bill', 72.15, 'expense', 'Bills', 15],
        ['Movie night', 24, 'expense', 'Entertainment', 9],
        ['Pharmacy', 18.9, 'expense', 'Health', 4],
        ['Sneakers', 64.99, 'expense', 'Shopping', 1]
      ];
      rows.forEach(([text, amount, type, category, days]) =>
        transactions.value.push({ id: newId(), text, amount, type, category, date: ago(days) })
      );
    }

    return {
      transactions, categoryFilter, monthFilter, categoryOptions, monthOptions,
      listItems, hasFilters, income, expenses, balance, scopeLabel, spending,
      addTransaction, removeTransaction, clearFilters, addSamples,
      money: cfg.money
    };
  }
}).mount('#app');

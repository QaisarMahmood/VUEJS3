// Shared settings and helpers used by app.js and the components.
// Change `currency` here (for example 'EUR', 'GBP' or 'PKR') to change how every amount is shown.
window.TrackerConfig = (function () {
  const currency = 'USD';
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });

  const categories = {
    expense: ['Food', 'Transport', 'Housing', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'],
    income: ['Salary', 'Freelance', 'Gift', 'Other']
  };

  // One color per category, used by the chart and the dots in the list
  const colors = {
    Food: '#f59e0b', Transport: '#2563eb', Housing: '#8b5cf6', Bills: '#06b6d4',
    Shopping: '#ec4899', Health: '#ef4444', Entertainment: '#84cc16', Other: '#64748b',
    Salary: '#10b981', Freelance: '#14b8a6', Gift: '#f97316'
  };

  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    currency,
    categories,
    colorFor: (category) => colors[category] || '#64748b',
    money: (n) => formatter.format(n),          // 1234.5 -> "$1,234.50"
    toISO,
    today: () => toISO(new Date())
  };
})();

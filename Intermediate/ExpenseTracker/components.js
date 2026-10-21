// Three child components. Data comes in through props, actions go out through emits.
// (Wrapped in a function so the variable names don't clash with app.js.)
(function () {
  const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;
  const cfg = window.TrackerConfig;

  // ------------------------------------------------------------------
  // TransactionForm: the add form. Validates, then emits 'add' with the new data.
  // ------------------------------------------------------------------
  window.TransactionForm = {
    emits: ['add'],

    setup(props, { emit }) {
      const type = ref('expense');
      const text = ref('');
      const amount = ref('');
      const category = ref(cfg.categories.expense[0]);
      const date = ref(cfg.today());
      const submitted = ref(false);          // errors only show after the first submit

      // The category list depends on the type, and resets when the type changes
      const categories = computed(() => cfg.categories[type.value]);
      watch(type, () => { category.value = categories.value[0]; });

      const errors = computed(() => {
        const e = {};
        if (!text.value.trim()) e.text = 'Enter a description.';
        if (typeof amount.value !== 'number' || !isFinite(amount.value) || amount.value <= 0) {
          e.amount = 'Enter an amount greater than 0.';
        } else if (amount.value > 1e9) {
          e.amount = 'That amount is too large.';
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) e.date = 'Pick a date.';
        return e;
      });

      function submit() {
        submitted.value = true;
        if (Object.keys(errors.value).length) return;
        emit('add', {
          text: text.value.trim(),
          amount: Math.round(amount.value * 100) / 100,     // keep 2 decimal places
          type: type.value,
          category: category.value,
          date: date.value
        });
        text.value = '';                                    // keep the type and date for quick entry
        amount.value = '';
        submitted.value = false;
      }

      return { type, text, amount, category, date, categories, errors, submitted, submit };
    },

    template: `
      <form class="card form" @submit.prevent="submit" novalidate>
        <h2>Add transaction</h2>

        <div class="seg" role="group" aria-label="Transaction type">
          <button type="button" class="seg-btn expense" :aria-pressed="type === 'expense'" @click="type = 'expense'">Expense</button>
          <button type="button" class="seg-btn income" :aria-pressed="type === 'income'" @click="type = 'income'">Income</button>
        </div>

        <div class="field">
          <label for="f-text">Description</label>
          <input id="f-text" type="text" maxlength="80" autocomplete="off" placeholder="e.g. Groceries" v-model="text"
                 :class="{ bad: submitted && errors.text }" :aria-invalid="!!(submitted && errors.text)"
                 :aria-describedby="submitted && errors.text ? 'e-text' : null">
          <p class="err" id="e-text" v-if="submitted && errors.text">{{ errors.text }}</p>
        </div>

        <div class="row2">
          <div class="field">
            <label for="f-amount">Amount</label>
            <input id="f-amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" v-model.number="amount"
                   :class="{ bad: submitted && errors.amount }" :aria-invalid="!!(submitted && errors.amount)"
                   :aria-describedby="submitted && errors.amount ? 'e-amount' : null">
            <p class="err" id="e-amount" v-if="submitted && errors.amount">{{ errors.amount }}</p>
          </div>
          <div class="field">
            <label for="f-category">Category</label>
            <select id="f-category" v-model="category">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="f-date">Date</label>
          <input id="f-date" type="date" v-model="date"
                 :class="{ bad: submitted && errors.date }" :aria-invalid="!!(submitted && errors.date)"
                 :aria-describedby="submitted && errors.date ? 'e-date' : null">
          <p class="err" id="e-date" v-if="submitted && errors.date">{{ errors.date }}</p>
        </div>

        <button type="submit" class="primary" :class="type">Add {{ type }}</button>
      </form>
    `
  };

  // ------------------------------------------------------------------
  // TransactionItem: one row. Emits 'remove' with the transaction id.
  // ------------------------------------------------------------------
  window.TransactionItem = {
    props: {
      tx: { type: Object, required: true }       // { id, text, amount, type, category, date }
    },
    emits: ['remove'],

    setup(props) {
      const color = computed(() => cfg.colorFor(props.tx.category));
      const sign = computed(() => (props.tx.type === 'income' ? '+' : '−'));
      const amountLabel = computed(() => cfg.money(props.tx.amount));
      const dateLabel = computed(() => {
        const [y, m, d] = props.tx.date.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      });
      return { color, sign, amountLabel, dateLabel };
    },

    template: `
      <li class="tx">
        <span class="dot" :style="{ backgroundColor: color }" aria-hidden="true"></span>
        <div class="tx-main">
          <span class="tx-text">{{ tx.text }}</span>
          <span class="tx-meta">{{ tx.category }} · {{ dateLabel }}</span>
        </div>
        <span class="tx-amount" :class="tx.type">{{ sign }}{{ amountLabel }}</span>
        <button type="button" class="icon del" :aria-label="'Delete ' + tx.text" title="Delete" @click="$emit('remove', tx.id)">×</button>
      </li>
    `
  };

  // ------------------------------------------------------------------
  // SpendingChart: Chart.js doughnut of spending by category.
  // Props: items = [{ category, total, color }]. The legend list below is the text version.
  // ------------------------------------------------------------------
  window.SpendingChart = {
    props: {
      items: { type: Array, required: true }
    },

    setup(props) {
      const canvas = ref(null);
      let chart = null;

      const total = computed(() => props.items.reduce((sum, i) => sum + i.total, 0));
      const rows = computed(() =>
        props.items.map((i) => ({ ...i, pct: total.value ? Math.round((i.total / total.value) * 100) : 0 }))
      );

      // Draw the chart the first time, then just update its data
      function render() {
        if (!canvas.value || !window.Chart) return;       // Chart.js missing: the legend list still works
        const gap = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#ffffff';
        const labels = props.items.map((i) => i.category);
        const data = props.items.map((i) => i.total);
        const colors = props.items.map((i) => i.color);

        if (!chart) {
          chart = new Chart(canvas.value, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: gap, borderWidth: 3 }] },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '66%',
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${cfg.money(ctx.parsed)}` } }
              }
            }
          });
        } else {
          chart.data.labels = labels;
          chart.data.datasets[0].data = data;
          chart.data.datasets[0].backgroundColor = colors;
          chart.data.datasets[0].borderColor = gap;
          chart.update();
        }
      }

      watch(() => props.items, render, { deep: true });

      // Redraw when the system switches between light and dark mode
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      onMounted(() => { render(); mq.addEventListener('change', render); });
      onBeforeUnmount(() => {
        mq.removeEventListener('change', render);
        if (chart) chart.destroy();
      });

      return { canvas, total, rows, money: cfg.money };
    },

    template: `
      <section class="card chart-card">
        <h2>Spending by category</h2>

        <div class="chart-wrap" v-show="items.length">
          <canvas ref="canvas" role="img" aria-label="Doughnut chart of spending by category"></canvas>
          <div class="center">
            <span class="k">Spent</span>
            <b>{{ money(total) }}</b>
          </div>
        </div>

        <ul class="legend" v-if="rows.length">
          <li v-for="r in rows" :key="r.category">
            <span class="dot" :style="{ backgroundColor: r.color }" aria-hidden="true"></span>
            <span class="lname">{{ r.category }}</span>
            <span class="lamt">{{ money(r.total) }}</span>
            <span class="lpct">{{ r.pct === 0 ? '<1' : r.pct }}%</span>
          </li>
        </ul>
        <p class="empty" v-else>No expenses to chart yet.</p>
      </section>
    `
  };
})();

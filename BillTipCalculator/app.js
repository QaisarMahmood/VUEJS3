const { createApp, ref, computed, watch } = Vue;

createApp({
  setup() {
    const STORAGE_KEY = 'tip-calc:last-tip';
    const presets = [5, 10, 15];

    // Load the last used tip (safe if storage is blocked or the data is bad)
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch (e) { return {}; }
    })();

    // State
    const bill = ref('');
    const tipPct = ref(typeof saved.tipPct === 'number' ? saved.tipPct : 15);
    const custom = ref(typeof saved.custom === 'number' ? saved.custom : '');
    const people = ref(1);
    const roundUp = ref(false);

    // Save the tip whenever it changes
    watch([tipPct, custom], () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ tipPct: tipPct.value, custom: custom.value }));
      } catch (e) {}
    });

    // Derived values
    const num = (v) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);
    const activePct = computed(() => (custom.value !== '' ? num(custom.value) : tipPct.value));
    const tipAmount = computed(() => num(bill.value) * activePct.value / 100);
    const total = computed(() => num(bill.value) + tipAmount.value);
    const perPersonRaw = computed(() => total.value / Math.max(1, people.value));
    const perPerson = computed(() =>
      roundUp.value ? Math.ceil(Math.round(perPersonRaw.value * 100) / 100) : perPersonRaw.value
    );

    // Helpers
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const money = (n) => fmt.format(n);

    function pick(p) { tipPct.value = p; custom.value = ''; }
    function reset() {
      bill.value = '';
      tipPct.value = 15;
      custom.value = '';
      people.value = 1;
      roundUp.value = false;
    }

    return {
      presets, bill, tipPct, custom, people, roundUp,
      tipAmount, total, perPerson, perPersonRaw,
      money, pick, reset
    };
  }
}).mount('#app');

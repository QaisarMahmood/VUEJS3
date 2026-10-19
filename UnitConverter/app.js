const { createApp, ref, computed, watch } = Vue;

// Length and weight: each unit stores how many base units it equals
// (base = meter for length, kilogram for weight).
// Temperature: each unit has a pair of functions to/from Celsius.
const CATEGORIES = {
  length: {
    label: 'Length',
    units: [
      { id: 'm',  name: 'Meters',      sym: 'm',  f: 1 },
      { id: 'km', name: 'Kilometers',  sym: 'km', f: 1000 },
      { id: 'cm', name: 'Centimeters', sym: 'cm', f: 0.01 },
      { id: 'mi', name: 'Miles',       sym: 'mi', f: 1609.344 },
      { id: 'ft', name: 'Feet',        sym: 'ft', f: 0.3048 }
    ]
  },
  weight: {
    label: 'Weight',
    units: [
      { id: 'kg', name: 'Kilograms', sym: 'kg', f: 1 },
      { id: 'g',  name: 'Grams',     sym: 'g',  f: 0.001 },
      { id: 'lb', name: 'Pounds',    sym: 'lb', f: 0.45359237 },
      { id: 'oz', name: 'Ounces',    sym: 'oz', f: 0.028349523125 }
    ]
  },
  temperature: {
    label: 'Temperature',
    units: [
      { id: 'C', name: 'Celsius',    sym: '°C', toC: (v) => v,                 fromC: (c) => c },
      { id: 'F', name: 'Fahrenheit', sym: '°F', toC: (v) => (v - 32) * 5 / 9,   fromC: (c) => c * 9 / 5 + 32 },
      { id: 'K', name: 'Kelvin',     sym: 'K',  toC: (v) => v - 273.15,         fromC: (c) => c + 273.15 }
    ]
  }
};

const MESSAGES = {
  empty: 'Enter a value to convert.',
  invalid: 'That isn’t a valid number. Try something like 12.5 or -3.',
  abszero: 'That’s below absolute zero (−273.15 °C), so it can’t exist.'
};

// Tidy up floating-point noise and very large or small numbers
function formatNumber(n) {
  if (n === 0) return '0';
  const clean = parseFloat(n.toPrecision(10));
  const abs = Math.abs(clean);
  if (abs >= 1e12 || abs < 1e-6) return clean.toExponential(4);
  return clean.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

createApp({
  setup() {
    const category = ref('length');
    const value = ref('1');
    const from = ref('m');
    const to = ref('km');

    const units = computed(() => CATEGORIES[category.value].units);
    const fromUnit = computed(() => units.value.find((u) => u.id === from.value));
    const toUnit = computed(() => units.value.find((u) => u.id === to.value));

    // Changing category resets the dropdowns to that category's first two units,
    // unless the current units already belong to it (e.g. restoring a history entry)
    watch(category, (key) => {
      const list = CATEGORIES[key].units;
      const ids = list.map((u) => u.id);
      if (!ids.includes(from.value) || !ids.includes(to.value)) {
        from.value = list[0].id;
        to.value = list[1].id;
      }
    });

    // Validate the typed text: empty, invalid, or a real number
    const parsed = computed(() => {
      const s = value.value.trim();
      if (s === '') return { state: 'empty' };
      if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return { state: 'invalid' };
      return { state: 'ok', n: Number(s) };
    });

    const result = computed(() => {
      if (parsed.value.state !== 'ok') return { state: parsed.value.state };
      const n = parsed.value.n;
      const a = fromUnit.value;
      const b = toUnit.value;

      let out;
      if (category.value === 'temperature') {
        const celsius = a.toC(n);
        if (celsius < -273.15 - 1e-9) return { state: 'abszero' };
        out = b.fromC(celsius);
      } else {
        out = n * a.f / b.f;
      }
      return { state: 'ok', text: formatNumber(out) };
    });

    function swap() {
      [from.value, to.value] = [to.value, from.value];
    }

    // History of the last 5 conversions (newest first)
    const history = ref([]);
    let timer;

    function addHistory() {
      if (result.value.state !== 'ok') return;
      const input = value.value.trim();
      const text = `${input} ${fromUnit.value.sym} = ${result.value.text} ${toUnit.value.sym}`;
      const entry = {
        id: Date.now(), text, input,
        category: category.value, from: from.value, to: to.value
      };
      // Remove any older copy of the same conversion, put this one first, keep 5
      history.value = [entry, ...history.value.filter((h) => h.text !== text)].slice(0, 5);
    }

    // Wait until the user stops typing for 0.8s, so "1", "12", "125" don't all get saved
    watch([() => result.value.text, from, to], () => {
      clearTimeout(timer);
      if (result.value.state !== 'ok') return;
      timer = setTimeout(addHistory, 800);
    });

    function restore(h) {
      category.value = h.category;
      value.value = h.input;
      from.value = h.from;
      to.value = h.to;
    }

    function clearHistory() { history.value = []; }

    return {
      categories: CATEGORIES, messages: MESSAGES,
      category, value, from, to,
      units, fromUnit, toUnit, result, swap,
      history, restore, clearHistory
    };
  }
}).mount('#app');

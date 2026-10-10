const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

Vue.createApp({
  data() {
    return {
      current: '0',        // number being typed or the result
      previous: '',        // first number, saved when an operator is chosen
      operator: null,      // '+', '-', '*', '/' or null
      overwrite: false,    // true = next digit starts a new number
      lastExpression: ''   // shown after pressing =, e.g. "2 + 3 ="
    };
  },

  computed: {
    // Small line above the main number
    previousText() {
      if (this.operator) {
        return this.previous + ' ' + symbols[this.operator];
      }
      return this.lastExpression;
    }
  },

  methods: {
    appendNumber(digit) {
      if (this.overwrite) {
        this.current = digit === '.' ? '0.' : digit;
        this.overwrite = false;
        return;
      }
      if (digit === '.' && this.current.includes('.')) return;
      if (this.current.length >= 12) return;

      if (this.current === '0' && digit !== '.') {
        this.current = digit;
      } else {
        this.current += digit;
      }
    },

    chooseOperator(op) {
      if (this.current === 'Error') return;

      if (this.operator !== null && !this.overwrite) {
        // Chain: 2 + 3 + ... calculates 2 + 3 first
        const result = this.calculate();
        if (result === null) return this.showError();
        this.previous = this.format(result);
      } else if (this.operator === null) {
        this.previous = this.current;
      }

      this.operator = op;
      this.current = this.previous;
      this.lastExpression = '';
      this.overwrite = true;
    },

    equals() {
      if (this.operator === null || this.overwrite) return;

      const result = this.calculate();
      if (result === null) return this.showError();

      this.lastExpression =
        this.previous + ' ' + symbols[this.operator] + ' ' + this.current + ' =';
      this.current = this.format(result);
      this.previous = '';
      this.operator = null;
      this.overwrite = true;
    },

    calculate() {
      const a = parseFloat(this.previous);
      const b = parseFloat(this.current);

      switch (this.operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? null : a / b;
        default: return null;
      }
    },

    format(number) {
      // Removes floating point noise: 0.1 + 0.2 -> 0.3
      return String(parseFloat(number.toFixed(10)));
    },

    deleteLast() {
      if (this.overwrite) return;
      const next = this.current.slice(0, -1);
      this.current = next === '' || next === '-' ? '0' : next;
    },

    clear() {
      this.current = '0';
      this.previous = '';
      this.operator = null;
      this.overwrite = false;
      this.lastExpression = '';
    },

    showError() {
      this.clear();
      this.current = 'Error';
      this.overwrite = true;
    },

    // Optional: use the computer keyboard
    handleKey(event) {
      const key = event.key;
      if (/^[0-9.]$/.test(key)) this.appendNumber(key);
      else if (['+', '-', '*', '/'].includes(key)) this.chooseOperator(key);
      else if (key === 'Enter' || key === '=') this.equals();
      else if (key === 'Backspace') this.deleteLast();
      else if (key === 'Escape') this.clear();
    }
  },

  mounted() {
    window.addEventListener('keydown', this.handleKey);
  },

  unmounted() {
    window.removeEventListener('keydown', this.handleKey);
  }
}).mount('#app');

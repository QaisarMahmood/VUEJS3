Vue.createApp({
  data() {
    return {
      lists: [],
      enteredValue: ''
    };
  },
  methods: {
    addList() {
      this.lists.push(this.enteredValue);
      this.enteredValue = '';
    }
  }
}).mount('#app');

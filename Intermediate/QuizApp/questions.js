// The question bank. To add your own questions, copy one object and edit it.
// `answer` is the position of the correct option in `options`, counting from 0.
const QUESTIONS = [
  {
    question: 'Which function creates a reactive value in the Composition API?',
    options: ['computed()', 'ref()', 'watch()', 'mount()'],
    answer: 1,
    explain: 'ref() wraps a value so Vue can track changes to it.'
  },
  {
    question: 'What is the shorthand for v-bind?',
    options: [':', '@', '#', '&'],
    answer: 0,
    explain: ':src="url" is the same as v-bind:src="url".'
  },
  {
    question: 'Which directive repeats an element for each item in an array?',
    options: ['v-each', 'v-loop', 'v-for', 'v-repeat'],
    answer: 2,
    explain: 'v-for="item in items" renders one element per item.'
  },
  {
    question: 'In JavaScript code, how do you read the value of a ref called count?',
    options: ['count', 'count.value', 'count.get()', '$count'],
    answer: 1,
    explain: 'In JavaScript you use .value. Templates unwrap refs for you.'
  },
  {
    question: 'Which function is best for a value calculated from other reactive values?',
    options: ['computed()', 'ref()', 'onMounted()', 'provide()'],
    answer: 0,
    explain: 'computed() recalculates automatically and caches its result.'
  },
  {
    question: 'Which directive removes an element from the DOM when its condition is false?',
    options: ['v-show', 'v-bind', 'v-text', 'v-if'],
    answer: 3,
    explain: 'v-show only hides the element with CSS. v-if really removes it.'
  },
  {
    question: 'What is @click shorthand for?',
    options: ['v-bind:click', 'v-model:click', 'v-on:click', 'v-click'],
    answer: 2,
    explain: '@ is the shorthand for v-on, which listens for events.'
  },
  {
    question: 'Why do you add :key to items rendered with v-for?',
    options: [
      'To style each item',
      'To help Vue track and update items efficiently',
      'To make items clickable',
      'To sort the list'
    ],
    answer: 1,
    explain: 'A unique key lets Vue match each item to its element when the list changes.'
  },
  {
    question: 'Which lifecycle hook runs after a component has been added to the page?',
    options: ['onUnmounted()', 'onBeforeUnmount()', 'onUpdated()', 'onMounted()'],
    answer: 3,
    explain: 'onMounted() is the place for setup that needs the DOM, like starting a timer.'
  },
  {
    question: 'Which directive gives you two-way binding on a form input?',
    options: ['v-model', 'v-bind', 'v-on', 'v-slot'],
    answer: 0,
    explain: 'v-model keeps the input and your data in sync in both directions.'
  }
];

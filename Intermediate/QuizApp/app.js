const { createApp, ref, computed, nextTick, onMounted, onBeforeUnmount } = Vue;

const TIME_PER_QUESTION = 15;   // seconds
const LETTERS = ['A', 'B', 'C', 'D'];

// Challenge: Fisher-Yates shuffle. Returns a new array and leaves the original alone.
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

createApp({
  setup() {
    // ---- State ----
    const screen = ref('start');            // 'start' | 'quiz' | 'result'
    const questions = ref([]);              // the shuffled copy used in the current run
    const index = ref(0);                   // 2. which question we are on
    const score = ref(0);
    const selected = ref(null);             // the option the player picked, or null
    const timedOut = ref(false);
    const results = ref([]);                // one entry per answered question, for the result screen
    const msLeft = ref(TIME_PER_QUESTION * 1000);

    const total = QUESTIONS.length;
    const qTitle = ref(null);               // template refs, used to move keyboard focus
    const nextBtn = ref(null);

    // ---- Derived values ----
    const current = computed(() => questions.value[index.value]);
    const answered = computed(() => selected.value !== null || timedOut.value);
    const isLast = computed(() => index.value === total - 1);

    // Progress counts the current question once it has been answered
    const progressPct = computed(() => Math.round(((index.value + (answered.value ? 1 : 0)) / total) * 100));

    const secondsLeft = computed(() => Math.ceil(msLeft.value / 1000));
    const timePct = computed(() => (msLeft.value / (TIME_PER_QUESTION * 1000)) * 100);
    const urgent = computed(() => !answered.value && secondsLeft.value <= 5);

    // The message under the options after answering
    const feedback = computed(() => {
      if (!answered.value) return null;
      const q = current.value;
      const rightText = q.options[q.answer];
      if (timedOut.value) return { kind: 'time', title: 'Time’s up!', detail: `The answer is “${rightText}”. ${q.explain}` };
      if (selected.value === q.answer) return { kind: 'ok', title: 'Correct!', detail: q.explain };
      return { kind: 'bad', title: 'Not quite.', detail: `The answer is “${rightText}”. ${q.explain}` };
    });

    // ---- Timer: counts down from a deadline, so it never drifts ----
    let timerId = null;
    let deadline = 0;

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function startTimer() {
      stopTimer();
      deadline = Date.now() + TIME_PER_QUESTION * 1000;
      msLeft.value = TIME_PER_QUESTION * 1000;
      timerId = setInterval(() => {
        const left = deadline - Date.now();
        if (left <= 0) { msLeft.value = 0; timeUp(); }
        else msLeft.value = left;
      }, 100);
    }

    // ---- Answering ----
    function record() {
      const q = current.value;
      results.value.push({
        question: q.question,
        correct: selected.value === q.answer,
        chosen: selected.value === null ? null : q.options[selected.value],
        answerText: q.options[q.answer]
      });
    }

    // After answering, move focus to the Next button so keyboard users can just press Enter
    const focusNext = () => nextTick(() => nextBtn.value && nextBtn.value.focus());
    const focusQuestion = () => nextTick(() => qTitle.value && qTitle.value.focus());

    function choose(i) {
      if (screen.value !== 'quiz' || answered.value) return;
      selected.value = i;
      stopTimer();
      if (i === current.value.answer) score.value++;
      record();
      focusNext();
    }

    function timeUp() {
      if (answered.value) return;
      stopTimer();
      timedOut.value = true;
      record();
      focusNext();
    }

    // The CSS class for each option button (:class feedback)
    function optionClass(i) {
      const right = current.value.answer;
      return {
        correct: answered.value && i === right,
        wrong: selected.value === i && i !== right,
        dim: answered.value && i !== right && i !== selected.value
      };
    }

    // A text mark so right and wrong are not shown by color alone
    function markFor(i) {
      if (!answered.value) return '';
      if (i === current.value.answer) return '✓';
      return selected.value === i ? '✗' : '';
    }

    // ---- Moving through the quiz ----
    function next() {
      if (!answered.value) return;
      if (isLast.value) { screen.value = 'result'; return; }
      index.value++;
      selected.value = null;
      timedOut.value = false;
      startTimer();
      focusQuestion();
    }

    // 6. Start and restart are the same thing: reshuffle and reset everything
    function start() {
      questions.value = shuffle(QUESTIONS);
      index.value = 0;
      score.value = 0;
      selected.value = null;
      timedOut.value = false;
      results.value = [];
      screen.value = 'quiz';
      startTimer();
      focusQuestion();
    }

    // ---- Result screen ----
    const percent = computed(() => Math.round((score.value / total) * 100));
    const timedOutCount = computed(() => results.value.filter((r) => r.chosen === null).length);
    const wrongCount = computed(() => total - score.value - timedOutCount.value);
    const missed = computed(() => results.value.filter((r) => !r.correct));
    const verdict = computed(() => {
      if (percent.value === 100) return 'Perfect score!';
      if (percent.value >= 80) return 'Great job!';
      if (percent.value >= 50) return 'Good effort. Try again to beat it.';
      return 'Keep practicing. You will get there.';
    });

    // Keyboard shortcut: press 1 to 4 to answer
    function onKey(e) {
      if (screen.value !== 'quiz' || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) choose(n - 1);
    }
    onMounted(() => window.addEventListener('keydown', onKey));
    onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); stopTimer(); });

    return {
      screen, index, score, selected, total, letters: LETTERS, seconds: TIME_PER_QUESTION,
      current, answered, isLast, progressPct, secondsLeft, timePct, urgent, feedback,
      qTitle, nextBtn,
      choose, optionClass, markFor, next, start,
      percent, timedOutCount, wrongCount, missed, verdict
    };
  }
}).mount('#app');

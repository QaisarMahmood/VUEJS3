const { createApp, ref, computed, watch } = Vue;

const STORAGE_KEY = 'todo-list:tasks';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['active', 'progress', 'done'];

const validDate = (s) => (typeof s === 'string' && DATE_RE.test(s) ? s : '');

// Load saved tasks on start. Older saves used a `done` flag, so convert them to a status.
function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((t) => t && typeof t.id === 'string' && (typeof t.title === 'string' || typeof t.text === 'string'))
      .map((t) => {
        const status = STATUSES.includes(t.status) ? t.status : (t.done ? 'done' : 'active');
        return {
          id: t.id,
          title: typeof t.title === 'string' ? t.title : t.text,   // older saves called it `text`
          description: typeof t.description === 'string' ? t.description : '',
          status,
          due: validDate(t.due),
          created: validDate(t.created),
          completed: status === 'done' ? validDate(t.completed) : ''
        };
      });
  } catch (e) {
    return [];
  }
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const todayNow = () => toISO(new Date());

createApp({
  components: { TodoItem },

  setup() {
    // ---- State ----
    const todos = ref(loadTodos());
    const title = ref('');
    const description = ref('');
    const newDue = ref('');
    const sortBy = ref('added');          // 'added' | 'due'
    const todayISO = todayNow();

    // Drag and drop state
    const dragging = ref(null);           // { id, from } while a card is being dragged
    const overCol = ref(null);            // the column the card is hovering over

    // Save to localStorage whenever anything in the array changes
    watch(todos, () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value)); } catch (e) {}
    }, { deep: true });

    // ---- Derived values ----
    const countOf = (status) => todos.value.filter((t) => t.status === status).length;
    const doneCount = computed(() => countOf('done'));
    const progressCount = computed(() => countOf('progress'));
    const leftCount = computed(() => todos.value.length - doneCount.value);

    const summary = computed(() => {
      if (!todos.value.length) return 'Add your first task to get started.';
      if (leftCount.value === 0) return 'All done. Nice work!';
      let s = `${leftCount.value} ${leftCount.value === 1 ? 'task' : 'tasks'} left`;
      if (progressCount.value) s += ` · ${progressCount.value} in progress`;
      return s;
    });

    // Soonest due date first, tasks without a date last (sort() is stable)
    const byDue = (a, b) => {
      if (a.due === b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due < b.due ? -1 : 1;
    };
    const sorted = (list) => (sortBy.value === 'due' ? [...list].sort(byDue) : list);
    const withStatus = (status) => sorted(todos.value.filter((t) => t.status === status));

    // The four columns. `status` is what a card gets when it is dropped there (null = not a drop target).
    const columns = computed(() => [
      {
        key: 'all', title: 'All', status: null,
        caption: 'Every task in one place',
        empty: 'No tasks yet. Add one above.',
        tasks: sorted(todos.value)
      },
      {
        key: 'active', title: 'Active', status: 'active',
        caption: 'Planned, not started yet',
        empty: 'Nothing waiting. Add a task or drag one here.',
        tasks: withStatus('active')
      },
      {
        key: 'progress', title: 'In progress', status: 'progress',
        caption: 'What you are working on now',
        empty: 'Press Start on a task, or drag one here.',
        tasks: withStatus('progress')
      },
      {
        key: 'completed', title: 'Completed', status: 'done',
        caption: 'Finished',
        empty: 'Nothing completed yet. Tick a task or drag one here.',
        tasks: withStatus('done')
      }
    ]);

    // ---- Changing a task ----
    // One place sets the status, so the completed date is always kept in sync.
    function setStatus(t, status) {
      if (t.status === status) return;
      t.status = status;
      t.completed = status === 'done' ? todayNow() : '';
    }

    function addTodo() {
      const t = title.value.trim();
      if (!t) return;                                   // a title is required
      todos.value.push({
        id: newId(), title: t, description: description.value.trim(), status: 'active',
        due: newDue.value, created: todayNow(), completed: ''
      });
      title.value = '';
      description.value = '';
      newDue.value = '';
    }

    function toggleTodo(id) {                 // checkbox: done <-> active
      const t = todos.value.find((x) => x.id === id);
      if (t) setStatus(t, t.status === 'done' ? 'active' : 'done');
    }

    function moveTodo({ id, status }) {       // Start / Pause buttons
      const t = todos.value.find((x) => x.id === id);
      if (t) setStatus(t, status);
    }

    function updateTodo({ id, title: newTitle, description: newDescription, due }) {
      const t = todos.value.find((x) => x.id === id);
      if (t) { t.title = newTitle; t.description = newDescription; t.due = due; }
    }

    function removeTodo(id) {
      todos.value = todos.value.filter((t) => t.id !== id);
    }

    function clearCompleted() {
      todos.value = todos.value.filter((t) => t.status !== 'done');
    }

    // ---- Drag and drop between columns ----
    function dragStart(e, t, from) {
      dragging.value = { id: t.id, from };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', t.id);   // Firefox needs data to start a drag
    }

    function dragEnd() {
      dragging.value = null;
      overCol.value = null;
    }

    function onDragOver(e, col) {
      if (!col.status || !dragging.value) return;   // "All" is not a drop target
      e.preventDefault();                           // required to allow a drop here
      e.dataTransfer.dropEffect = 'move';
      overCol.value = col.key;
    }

    function onDragLeave(e, col) {
      // dragleave also fires when moving over child elements, so only clear when truly leaving
      if (!e.currentTarget.contains(e.relatedTarget) && overCol.value === col.key) {
        overCol.value = null;
      }
    }

    function onDrop(col) {
      if (!col.status || !dragging.value) return;
      const t = todos.value.find((x) => x.id === dragging.value.id);
      if (t) setStatus(t, col.status);
      dragEnd();
    }

    return {
      todos, title, description, newDue, sortBy, todayISO,
      summary, columns, doneCount,
      dragging, overCol,
      addTodo, toggleTodo, moveTodo, updateTodo, removeTodo, clearCompleted,
      dragStart, dragEnd, onDragOver, onDragLeave, onDrop
    };
  }
}).mount('#app');

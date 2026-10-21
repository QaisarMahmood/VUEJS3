// TodoItem: one card on the board.
// Data comes in through props; user actions go out through emits.
// The card never changes the todo itself; the parent does that.
// (Wrapped in a function so its variable names don't clash with app.js.)
window.TodoItem = (function () {
  const { ref, computed } = Vue;

  const STATUS_LABELS = { active: 'Active', progress: 'In progress', done: 'Done' };

  // "2026-03-03" -> "Mar 3" (the year is added when it isn't the current year)
  function formatDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const opts = { month: 'short', day: 'numeric' };
    if (y !== new Date().getFullYear()) opts.year = 'numeric';
    return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
  }

  return {
    props: {
      todo: { type: Object, required: true },        // { id, title, description, status, due, created, completed }
      today: { type: String, required: true },       // "YYYY-MM-DD", used to spot overdue tasks
      showStatus: { type: Boolean, default: false }  // the "All" column shows a status pill
    },

    // Drag events are not declared on purpose: the parent's @dragstart and @dragend
    // fall through to this component's root <li> as normal DOM listeners.
    emits: ['toggle', 'remove', 'update', 'move'],

    directives: {
      focus: { mounted(el) { el.focus(); el.select(); } }
    },

    setup(props, { emit }) {
      // Local state: only this card cares about editing and about the expanded description
      const editing = ref(false);
      const editTitle = ref('');
      const editDescription = ref('');
      const editDue = ref('');
      const expanded = ref(false);

      function startEdit() {
        editTitle.value = props.todo.title;
        editDescription.value = props.todo.description;
        editDue.value = props.todo.due;
        editing.value = true;
      }

      function save() {
        const title = editTitle.value.trim();
        if (!title) return;                                   // a title is required
        emit('update', {
          id: props.todo.id,
          title,
          description: editDescription.value.trim(),
          due: editDue.value
        });
        editing.value = false;
      }

      function cancel() { editing.value = false; }

      // Long descriptions are cut to 3 lines with a "Show more" button
      const isLong = computed(() => {
        const d = props.todo.description;
        return d.length > 90 || d.split('\n').length > 2;
      });

      // 'overdue' | 'today' | 'upcoming' | 'done' | '' (ISO dates compare correctly as text)
      const dueState = computed(() => {
        const d = props.todo.due;
        if (!d) return '';
        if (props.todo.status === 'done') return 'done';
        if (d < props.today) return 'overdue';
        if (d === props.today) return 'today';
        return 'upcoming';
      });

      const dueLabel = computed(() => {
        const nice = formatDay(props.todo.due);
        if (dueState.value === 'overdue') return 'Overdue · ' + nice;
        if (dueState.value === 'today') return 'Due today';
        return 'Due ' + nice;
      });

      const createdLabel = computed(() => (props.todo.created ? formatDay(props.todo.created) : ''));
      const completedLabel = computed(() => (props.todo.completed ? formatDay(props.todo.completed) : ''));
      const statusLabel = computed(() => STATUS_LABELS[props.todo.status]);

      return {
        editing, editTitle, editDescription, editDue, expanded,
        startEdit, save, cancel, isLong,
        dueState, dueLabel, createdLabel, completedLabel, statusLabel
      };
    },

    template: `
      <li class="item" :class="['is-' + todo.status, { done: todo.status === 'done', editing }]" :draggable="!editing">
        <template v-if="!editing">
          <span class="grip" aria-hidden="true">⋮⋮</span>
          <input type="checkbox" class="check" :checked="todo.status === 'done'"
                 :aria-label="'Done: ' + todo.title" @change="$emit('toggle', todo.id)">

          <div class="body">
            <span class="title" @dblclick="startEdit">{{ todo.title }}</span>

            <template v-if="todo.description">
              <p class="desc" :class="{ clamp: isLong && !expanded }">{{ todo.description }}</p>
              <button v-if="isLong" type="button" class="more" :aria-expanded="expanded"
                      @click="expanded = !expanded">{{ expanded ? 'Show less' : 'Show more' }}</button>
            </template>

            <div class="meta">
              <span v-if="showStatus" class="pill" :class="todo.status">{{ statusLabel }}</span>
              <span v-if="createdLabel" class="when">Added {{ createdLabel }}</span>
              <span v-if="completedLabel" class="when">Completed {{ completedLabel }}</span>
              <span v-if="todo.due" class="due" :class="dueState">{{ dueLabel }}</span>
            </div>

            <div class="actions" v-if="todo.status !== 'done'">
              <button v-if="todo.status === 'active'" type="button" class="chip start"
                      @click="$emit('move', { id: todo.id, status: 'progress' })">▶ Start</button>
              <button v-else type="button" class="chip pause"
                      @click="$emit('move', { id: todo.id, status: 'active' })">⏸ Pause</button>
            </div>
          </div>

          <button type="button" class="icon" aria-label="Edit task" title="Edit" @click="startEdit">✎</button>
          <button type="button" class="icon del" aria-label="Delete task" title="Delete" @click="$emit('remove', todo.id)">×</button>
        </template>

        <form v-else class="editbox" @submit.prevent="save" @keydown.esc="cancel">
          <input type="text" v-model="editTitle" v-focus maxlength="100" placeholder="Title" aria-label="Task title">
          <textarea v-model="editDescription" rows="3" maxlength="500" placeholder="Description (optional)"
                    aria-label="Task description" @keydown.ctrl.enter.prevent="save" @keydown.meta.enter.prevent="save"></textarea>
          <div class="editrow">
            <input type="date" v-model="editDue" aria-label="Due date (optional)">
            <button type="submit" class="primary" :disabled="!editTitle.trim()">Save</button>
            <button type="button" class="link" @click="cancel">Cancel</button>
          </div>
        </form>
      </li>
    `
  };
})();

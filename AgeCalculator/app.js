const { createApp, ref, computed } = Vue;

// ---- Date helpers (all dates are local, at midnight) ----

// "2000-02-29" -> Date, or null if it isn't a real calendar date
function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const dt = new Date(y, mo, d);
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d ? dt : null;
}

function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

// Add whole months, clamping the day (Jan 31 + 1 month = Feb 28/29)
function addMonths(date, n) {
  const total = date.getMonth() + n;
  const y = date.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return new Date(y, m, Math.min(date.getDate(), daysInMonth(y, m)));
}

// Whole days between two dates (UTC math avoids daylight-saving surprises)
function daysBetween(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

createApp({
  setup() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayISO = toISO(today);

    // 1. Inputs (v-model on date inputs gives "YYYY-MM-DD" text, or "" when empty or incomplete)
    const birth = ref('');
    const target = ref('');   // challenge: age on this date (empty = today)

    const fail = (message, field) => ({ state: 'error', message, field });

    // 2-5. Everything about the result in one computed property
    const analysis = computed(() => {
      if (birth.value === '') return { state: 'empty' };

      const b = parseISO(birth.value);
      if (!b) return fail('That doesn’t look like a valid date.', 'birth');
      if (b.getFullYear() < 1900) return fail('Please enter a year from 1900 onward.', 'birth');
      if (b > today) return fail('The birth date can’t be in the future.', 'birth');

      let asOf = today;
      if (target.value !== '') {
        const t = parseISO(target.value);
        if (!t) return fail('The second date isn’t a valid date.', 'target');
        if (t < b) return fail('That date is before the birth date.', 'target');
        asOf = t;
      }

      // 3. Years, months, days: count whole months from the birth date,
      //    step back one if we overshot, and the rest are days
      let months = (asOf.getFullYear() - b.getFullYear()) * 12 + (asOf.getMonth() - b.getMonth());
      let anchor = addMonths(b, months);
      if (anchor > asOf) {
        months--;
        anchor = addMonths(b, months);
      }
      const years = Math.floor(months / 12);
      const days = daysBetween(anchor, asOf);

      // 2. Total days lived
      const totalDays = daysBetween(b, asOf);

      // 4. Next birthday after (or on) the "as of" date
      let turning = Math.max(1, asOf.getFullYear() - b.getFullYear());
      let next = addMonths(b, turning * 12);
      if (next < asOf) {
        turning++;
        next = addMonths(b, turning * 12);
      }

      return {
        state: 'ok',
        asOf,
        isToday: asOf.getTime() === today.getTime(),
        years, months: months % 12, days,
        totalDays,
        next, turning,
        daysUntil: daysBetween(asOf, next)
      };
    });

    function formatDate(d, withWeekday = false) {
      const opts = { year: 'numeric', month: 'long', day: 'numeric' };
      if (withWeekday) opts.weekday = 'long';
      return d.toLocaleDateString(undefined, opts);
    }

    const plural = (n, word) => (n === 1 ? word : word + 's');

    return { birth, target, todayISO, analysis, formatDate, plural };
  }
}).mount('#app');

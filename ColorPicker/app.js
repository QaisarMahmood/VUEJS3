const { createApp, ref, computed, watch } = Vue;

const STORAGE_KEY = 'color-mixer:palette';
const HEX_RE = /^#[0-9A-F]{6}$/;

// Load saved colors, keeping only valid hex strings
function loadPalette() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter((h) => typeof h === 'string' && HEX_RE.test(h)) : [];
  } catch (e) {
    return [];
  }
}

// Clipboard API first, with an older fallback for browsers or pages that block it
async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) { /* try the fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

createApp({
  setup() {
    // 1. The three channels
    const r = ref(59);
    const g = ref(130);
    const b = ref(246);

    // 3. Computed color strings
    const rgb = computed(() => `rgb(${r.value}, ${g.value}, ${b.value})`);
    const hex = computed(() =>
      '#' + [r.value, g.value, b.value].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    );

    // Dark or light text on top of the preview, based on how bright the color is
    const textColor = computed(() => {
      const brightness = 0.299 * r.value + 0.587 * g.value + 0.114 * b.value;
      return brightness > 150 ? '#151922' : '#ffffff';
    });

    // Each slider's track shows what the color would be at 0 and at 255 for that channel
    const trackR = computed(() => ({
      background: `linear-gradient(to right, rgb(0, ${g.value}, ${b.value}), rgb(255, ${g.value}, ${b.value}))`
    }));
    const trackG = computed(() => ({
      background: `linear-gradient(to right, rgb(${r.value}, 0, ${b.value}), rgb(${r.value}, 255, ${b.value}))`
    }));
    const trackB = computed(() => ({
      background: `linear-gradient(to right, rgb(${r.value}, ${g.value}, 0), rgb(${r.value}, ${g.value}, 255))`
    }));

    // 5. Copy to clipboard
    const copied = ref('');          // 'hex', 'rgb' or ''
    const copyFailed = ref(false);
    let copyTimer;

    async function copy(which) {
      const ok = await writeClipboard(which === 'hex' ? hex.value : rgb.value);
      copyFailed.value = !ok;
      copied.value = ok ? which : '';
      clearTimeout(copyTimer);
      if (ok) copyTimer = setTimeout(() => { copied.value = ''; }, 1500);
    }

    // 5. Random color
    function randomColor() {
      r.value = Math.floor(Math.random() * 256);
      g.value = Math.floor(Math.random() * 256);
      b.value = Math.floor(Math.random() * 256);
    }

    // Challenge: favorite colors palette (saved between visits)
    const palette = ref(loadPalette());
    const isSaved = computed(() => palette.value.includes(hex.value));

    watch(palette, () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(palette.value)); } catch (e) {}
    });

    function saveColor() {
      if (isSaved.value) return;
      palette.value = [hex.value, ...palette.value].slice(0, 12);   // newest first, max 12
    }

    function loadColor(h) {
      r.value = parseInt(h.slice(1, 3), 16);
      g.value = parseInt(h.slice(3, 5), 16);
      b.value = parseInt(h.slice(5, 7), 16);
    }

    function removeColor(h) {
      palette.value = palette.value.filter((x) => x !== h);
    }

    return {
      r, g, b, rgb, hex, textColor, trackR, trackG, trackB,
      copied, copyFailed, copy, randomColor,
      palette, isSaved, saveColor, loadColor, removeColor
    };
  }
}).mount('#app');

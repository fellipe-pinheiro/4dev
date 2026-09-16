const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ESCAPES[char]);
}

export function highlightJson(value) {
  const pretty = escapeHtml(JSON.stringify(value, null, 2));
  return pretty.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, string, colon, bool, number) => {
      if (string) {
        return colon
          ? `<span class="text-sky-300">${string}</span>${colon}`
          : `<span class="text-emerald-300">${string}</span>`;
      }
      if (bool) return `<span class="text-amber-300">${match}</span>`;
      if (number) return `<span class="text-violet-300">${match}</span>`;
      return `<span class="text-zinc-500">${match}</span>`;
    }
  );
}

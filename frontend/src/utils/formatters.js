export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleString('sv-SE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatDuration(secs) {
  if (!secs) return null;
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

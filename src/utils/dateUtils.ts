/** Parses "DD-MM-YYYY" (the format the mobile app writes) with a fallback
 * to native Date parsing for anything else (e.g. ISO strings). */
export const parseExpiryDate = (dateStr?: string | null): Date | null => {
  if (!dateStr || dateStr === 'Lifetime') return null;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

export const isExpired = (expiryDateStr?: string | null): boolean => {
  const d = parseExpiryDate(expiryDateStr);
  if (!d) return false;
  return d < new Date();
};

export const isExpiringSoon = (expiryDateStr?: string | null, days = 7): boolean => {
  const d = parseExpiryDate(expiryDateStr);
  if (!d) return false;
  const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays > 0;
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

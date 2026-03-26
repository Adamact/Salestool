export const STATUS_COLORS = {
  new: '#6b7280',
  no_answer: '#eab308',
  callback: '#3b82f6',
  interested: '#22c55e',
  not_interested: '#ef4444',
  booked_meeting: '#a855f7',
  already_customer: '#14b8a6',
  sent_email: '#f59e0b',
  sent_followup: '#d97706',
  wrong_number: '#9ca3af',
};

export const STATUS_LABELS = {
  new: 'Ny',
  no_answer: 'Inget svar',
  callback: 'Återring',
  interested: 'Intresserad',
  not_interested: 'Ej intresserad',
  booked_meeting: 'Bokat möte',
  already_customer: 'Redan kund',
  sent_email: 'Skickat mejl',
  sent_followup: 'Skickat uppföljningsmejl',
  wrong_number: 'Fel nummer',
};

// All possible lead statuses (for status selectors)
export const STATUS_OPTIONS = [
  { value: 'new', label: 'Ny' },
  { value: 'no_answer', label: 'Inget svar' },
  { value: 'callback', label: 'Återring' },
  { value: 'interested', label: 'Intresserad' },
  { value: 'not_interested', label: 'Ej intresserad' },
  { value: 'booked_meeting', label: 'Bokat möte' },
  { value: 'already_customer', label: 'Redan kund' },
  { value: 'wrong_number', label: 'Fel nummer' },
  { value: 'sent_email', label: 'Skickat mejl' },
  { value: 'sent_followup', label: 'Skickat uppföljningsmejl' },
];

// Call outcomes (excludes 'new' since it's not a call result)
export const CALL_OUTCOMES = [
  { value: 'no_answer', label: 'Inget svar' },
  { value: 'callback', label: 'Återring' },
  { value: 'interested', label: 'Intresserad' },
  { value: 'not_interested', label: 'Ej intresserad' },
  { value: 'booked_meeting', label: 'Bokat möte' },
  { value: 'already_customer', label: 'Redan kund' },
  { value: 'wrong_number', label: 'Fel nummer' },
  { value: 'sent_email', label: 'Skickat mejl' },
  { value: 'sent_followup', label: 'Skickat uppföljningsmejl' },
];

// Status filter options (includes 'alla' for filtering UI)
export const STATUS_FILTER_OPTIONS = [
  { value: 'alla', label: 'Alla' },
  ...STATUS_OPTIONS,
];

export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#6b7280';
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'Ny';
}

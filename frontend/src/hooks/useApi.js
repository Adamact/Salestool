import { useMemo } from 'react';

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return null;
}

// Plain functions - no hooks needed since they don't depend on any state
const api = {
  getLeads(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'alla') params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.search) params.set('search', filters.search);
    params.set('limit', '200');
    const qs = params.toString();
    return request(`/leads${qs ? '?' + qs : ''}`);
  },

  getLead(id) {
    return request(`/leads/${id}`);
  },

  updateLead(id, data) {
    return request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  createLead(data) {
    return request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteLead(id) {
    return request(`/leads/${id}`, { method: 'DELETE' });
  },

  importExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE}/leads/import`, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    });
  },

  getLeadNotes(id) {
    return request(`/leads/${id}/notes`);
  },

  addNote(id, text) {
    return request(`/leads/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  getCallHistory(id) {
    return request(`/leads/${id}/history`);
  },

  logCall(id, outcome, notes, extra = {}) {
    return request(`/leads/${id}/history`, {
      method: 'POST',
      body: JSON.stringify({ outcome, notes, ...extra }),
    });
  },

  getNextLead(activeListId) {
    const params = activeListId ? `?list_id=${activeListId}` : '';
    return request(`/leads/next${params}`);
  },

  getCallbacks() {
    return request('/leads/callbacks');
  },

  exportLeads({ status, listId } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (listId) params.set('list_id', listId);
    const qs = params.toString();
    // Trigger file download
    window.open(`${BASE}/leads/export${qs ? '?' + qs : ''}`, '_blank');
  },

  getAnalytics({ startDate, endDate } = {}) {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const qs = params.toString();
    return request(`/leads/analytics${qs ? '?' + qs : ''}`);
  },

  getContacts(leadId) {
    return request(`/leads/${leadId}/contacts`);
  },

  addContact(leadId, data) {
    return request(`/leads/${leadId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateContact(leadId, contactId, data) {
    return request(`/leads/${leadId}/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteContact(leadId, contactId) {
    return request(`/leads/${leadId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  },

  // Manuscript groups
  getManuscriptGroups() {
    return request('/manuscript/groups');
  },

  createManuscriptGroup(data) {
    return request('/manuscript/groups', { method: 'POST', body: JSON.stringify(data) });
  },

  updateManuscriptGroup(id, data) {
    return request(`/manuscript/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteManuscriptGroup(id) {
    return request(`/manuscript/groups/${id}`, { method: 'DELETE' });
  },

  duplicateManuscriptGroup(id) {
    return request(`/manuscript/groups/${id}/duplicate`, { method: 'POST' });
  },

  activateManuscriptGroup(id) {
    return request(`/manuscript/groups/${id}/activate`, { method: 'PUT' });
  },

  // Manuscript sections
  getManuscript(groupId) {
    const qs = groupId ? `?group=${groupId}` : '';
    return request(`/manuscript${qs}`);
  },

  createManuscript(data) {
    return request('/manuscript', { method: 'POST', body: JSON.stringify(data) });
  },

  updateManuscript(id, data) {
    return request(`/manuscript/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteManuscript(id) {
    return request(`/manuscript/${id}`, { method: 'DELETE' });
  },

  getStats() {
    return request('/leads/stats');
  },

  // Lists
  getLists() {
    return request('/lists');
  },

  createList(data) {
    return request('/lists', { method: 'POST', body: JSON.stringify(data) });
  },

  updateList(id, data) {
    return request(`/lists/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteList(id) {
    return request(`/lists/${id}`, { method: 'DELETE' });
  },

  getListLeads(listId) {
    return request(`/lists/${listId}/leads`);
  },

  addToList(listId, data) {
    return request(`/lists/${listId}/leads`, { method: 'POST', body: JSON.stringify(data) });
  },

  removeFromList(listId, leadId) {
    return request(`/lists/${listId}/leads/${leadId}`, { method: 'DELETE' });
  },

  getListsForLead(leadId) {
    return request(`/lists/for-lead/${leadId}`);
  },

  // Calendar
  getCalendarEvents(start, end) {
    const params = new URLSearchParams({ start, end });
    return request(`/calendar/events?${params}`);
  },

  createCalendarEvent(data) {
    return request('/calendar/events', { method: 'POST', body: JSON.stringify(data) });
  },

  updateCalendarEvent(id, data) {
    return request(`/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteCalendarEvent(id) {
    return request(`/calendar/events/${id}`, { method: 'DELETE' });
  },

  getGoogleCalendarStatus() {
    return request('/calendar/google/status');
  },

  getGoogleAuthUrl() {
    return request('/calendar/google/auth-url');
  },

  disconnectGoogleCalendar() {
    return request('/calendar/google/disconnect', { method: 'POST' });
  },

  syncGoogleCalendar() {
    return request('/calendar/google/sync', { method: 'POST' });
  },
};

export function useApi() {
  // Return a stable reference - never changes between renders
  return useMemo(() => api, []);
}

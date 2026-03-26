import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import EventForm from './EventForm';

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const MONTH_NAMES = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

const TYPE_COLORS = {
  calling_block: '#3b82f6',
  meeting: '#a855f7',
  followup: '#f97316',
  callback: '#eab308',
  other: '#6b7280',
};

const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay} - ${endDay} ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  if (monday.getFullYear() === sunday.getFullYear()) {
    return `${startDay} ${MONTH_NAMES[monday.getMonth()]} - ${endDay} ${MONTH_NAMES[sunday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${startDay} ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()} - ${endDay} ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

export default function CalendarView({ onClose }) {
  const api = useApi();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: null });
  const [syncing, setSyncing] = useState(false);
  const [googleError, setGoogleError] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      const start = currentWeekStart.toISOString();
      const end = new Date(
        currentWeekStart.getFullYear(),
        currentWeekStart.getMonth(),
        currentWeekStart.getDate() + 6,
        23, 59, 59
      ).toISOString();
      const data = await api.getCalendarEvents(start, end);
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    }
  }, [api, currentWeekStart]);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const status = await api.getGoogleCalendarStatus();
      setGoogleStatus(status || { connected: false, email: null });
    } catch {
      setGoogleStatus({ connected: false, email: null });
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const goToThisWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  const handleConnectGoogle = async () => {
    setGoogleError(null);
    try {
      const data = await api.getGoogleAuthUrl();
      if (data && data.url) {
        window.open(data.url, '_blank', 'width=500,height=600');
      } else {
        setGoogleError('Kunde inte h\u00e4mta Google-auth URL.');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('no_credentials') || msg.includes('not configured')) {
        setGoogleError('Google-credentials saknas. Skapa filen backend/data/google-credentials.json med dina Google OAuth-uppgifter.');
      } else {
        setGoogleError('Kunde inte ansluta till Google: ' + msg);
      }
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await api.disconnectGoogleCalendar();
      setGoogleStatus({ connected: false, email: null });
    } catch (err) {
      console.error('Failed to disconnect Google:', err);
    }
  };

  const handleSyncGoogle = async () => {
    setSyncing(true);
    try {
      await api.syncGoogleCalendar();
      await fetchEvents();
    } catch (err) {
      console.error('Failed to sync Google Calendar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleCellClick = (dayIndex, hour) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    setSelectedSlot({ date, hour });
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedSlot(null);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (data) => {
    try {
      if (editingEvent) {
        await api.updateCalendarEvent(editingEvent.id, data);
      } else {
        await api.createCalendarEvent(data);
      }
      setShowEventForm(false);
      setEditingEvent(null);
      setSelectedSlot(null);
      await fetchEvents();
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await api.deleteCalendarEvent(id);
      setShowEventForm(false);
      setEditingEvent(null);
      await fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const today = new Date();

  // Build day columns
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Get events for a specific day
  const getEventsForDay = (dayDate) => {
    return events.filter((evt) => {
      const start = new Date(evt.start_time || evt.start);
      return isSameDay(start, dayDate);
    });
  };

  // Calculate event position/size in the grid
  const getEventStyle = (evt) => {
    const start = new Date(evt.start_time || evt.start);
    const end = new Date(evt.end_time || evt.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const gridStartMinutes = START_HOUR * 60;

    const top = Math.max(0, startMinutes - gridStartMinutes);
    const height = Math.max(15, endMinutes - startMinutes);
    const color = TYPE_COLORS[evt.event_type] || evt.color || TYPE_COLORS.other;

    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: color,
    };
  };

  return (
    <div className="calendar-overlay">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-header__left">
          <span className="calendar-header__title">Kalender</span>

          <div className="calendar-header__nav">
            <button className="calendar-header__nav-btn" onClick={goToPreviousWeek} title="Föregående vecka">
              &#8249;
            </button>
            <button className="calendar-header__today" onClick={goToThisWeek}>
              Denna vecka
            </button>
            <button className="calendar-header__nav-btn" onClick={goToNextWeek} title="Nästa vecka">
              &#8250;
            </button>
          </div>

          <span className="calendar-header__week-label">{formatWeekLabel(currentWeekStart)}</span>
        </div>

        <div className="calendar-header__right">
          <div className="calendar-header__google">
            {googleStatus.connected ? (
              <>
                <span className="calendar-header__google-dot" />
                <span>Synkad med Google</span>
                <button
                  className="btn btn--secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={handleSyncGoogle}
                  disabled={syncing}
                >
                  {syncing ? 'Synkar...' : 'Synka'}
                </button>
                <button
                  className="event-form__delete"
                  onClick={handleDisconnectGoogle}
                  style={{ fontSize: '12px' }}
                >
                  Koppla bort
                </button>
              </>
            ) : (
              <>
                <span className="calendar-header__google-dot calendar-header__google-dot--disconnected" />
                <button
                  className="btn btn--secondary"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={handleConnectGoogle}
                >
                  Koppla Google Kalender
                </button>
              </>
            )}
          </div>

          <button className="calendar-header__close" onClick={onClose} title="St\u00e4ng">
            {'\u00d7'}
          </button>
        </div>
      </div>

      {googleError && (
        <div className="calendar-google-error">
          <span>{googleError}</span>
          <button onClick={() => setGoogleError(null)}>{'\u2715'}</button>
        </div>
      )}

      {/* Week grid */}
      <div className="calendar-grid">
        {/* Day headers row */}
        <div className="calendar-grid__day-headers">
          <div className="calendar-grid__corner" />
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={`calendar-grid__day-header${isToday ? ' calendar-grid__day-header--today' : ''}`}
              >
                <div className="calendar-grid__day-name">{DAY_NAMES[i]}</div>
                <div className="calendar-grid__day-date">{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        <div className="calendar-grid__body">
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="calendar-grid__time-label">
                {formatTime(hour)}
              </div>
              {days.map((dayDate, dayIndex) => {
                const isToday = isSameDay(dayDate, today);
                const dayEvents = hour === START_HOUR ? getEventsForDay(dayDate) : [];

                return (
                  <div
                    key={dayIndex}
                    className={`calendar-grid__cell${isToday ? ' calendar-grid__cell--today' : ''}`}
                    onClick={() => handleCellClick(dayIndex, hour)}
                  >
                    {/* Render events only in the first hour cell to avoid duplicates */}
                    {hour === START_HOUR && dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="calendar-event"
                        style={getEventStyle(evt)}
                        onClick={(e) => handleEventClick(e, evt)}
                        title={evt.title}
                      >
                        <div className="calendar-event__title">{evt.title}</div>
                        {evt.lead_company && (
                          <div className="calendar-event__lead">{evt.lead_company}</div>
                        )}
                        <div className="calendar-event__time">
                          {formatTime(
                            new Date(evt.start_time || evt.start).getHours(),
                            new Date(evt.start_time || evt.start).getMinutes()
                          )}
                          {' - '}
                          {formatTime(
                            new Date(evt.end_time || evt.end).getHours(),
                            new Date(evt.end_time || evt.end).getMinutes()
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Event form modal */}
      {showEventForm && (
        <EventForm
          event={editingEvent}
          defaultDate={selectedSlot?.date}
          defaultHour={selectedSlot?.hour}
          onSave={handleSaveEvent}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}

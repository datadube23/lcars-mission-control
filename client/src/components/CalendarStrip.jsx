/**
 * CalendarStrip
 * Displays today + tomorrow calendar events from icalBuddy.
 */

export default function CalendarStrip({ events, loading }) {
  if (loading) {
    return (
      <div className="lcars-loading">
        <div className="lcars-loading__bar"><div className="lcars-loading__progress" /></div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <div className="calendar-empty">No events in next 48h</div>;
  }

  return (
    <div>
      {events.map((event, i) => (
        <div key={i} className="calendar-event">
          <div className="calendar-event__title">{event.title}</div>
          {event.time && (
            <div className="calendar-event__time">{event.time}</div>
          )}
          {event.calendar && (
            <div
              style={{
                fontFamily: 'var(--font-lcars)',
                fontSize: 'var(--text-meta)',
                letterSpacing: '0.1em',
                color: 'var(--lcars-gray)',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              {event.calendar}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * LCARSBottomBar
 * Status strip at the bottom of the dashboard.
 * Shows system status, project count, and last update time.
 */

export default function LCARSBottomBar({ statusText, lastUpdate, projects }) {
  const now = new Date();
  const stardate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const lastUpdateStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <footer className="lcars-bottombar">
      {/* Left elbow cap */}
      <div className="lcars-bottombar__elbow" />

      {/* Main bar */}
      <div className="lcars-bottombar__bar">
        <span className="lcars-bottombar__status">{statusText}</span>

        <span
          className="lcars-bottombar__status"
          style={{ marginLeft: 'auto' }}
        >
          LAST UPDATE: {lastUpdateStr}
        </span>

        <span className="lcars-bottombar__status">
          STARDATE {stardate}
        </span>

        <span className="lcars-bottombar__status">
          {now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })}
        </span>
      </div>

      {/* Right sidebar cap */}
      <div className="lcars-bottombar__sidebar-cap" />
    </footer>
  );
}

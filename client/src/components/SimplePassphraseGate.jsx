/**
 * SimplePassphraseGate
 * LCARS-styled login screen. Hardcoded to "enterprise" by default.
 * POST /api/auth to verify.
 */

import { useState } from 'react';

export default function SimplePassphraseGate({ onAuth }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;

    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: value.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.ok) {
        onAuth(true);
      } else {
        setError('ACCESS DENIED — INVALID AUTHORIZATION CODE');
        setValue('');
      }
    } catch {
      setError('CONNECTION FAILURE — CHECK NETWORK STATUS');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="lcars-gate">
      {/* LCARS decorative top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 52, display: 'flex', gap: 8 }}>
        <div style={{ width: 72, background: 'var(--lcars-gold)', borderRadius: '28px 0 0 0' }} />
        <div style={{ flex: 1, background: 'var(--lcars-gold)' }} />
        <div style={{ width: 320, background: 'var(--lcars-african-violet)', borderRadius: '0 28px 0 0' }} />
      </div>

      <div className="lcars-gate__panel">
        <div className="lcars-gate__title">MISSION CONTROL</div>
        <div className="lcars-gate__subtitle">MR_DATA FLEET COMMAND CENTER</div>
        <div style={{ width: '100%', height: 1, background: 'var(--lcars-panel-border)' }} />
        <div
          className="lcars-label"
          style={{ color: 'var(--lcars-gray-light)', fontSize: 'var(--text-meta)' }}
        >
          AUTHORIZATION REQUIRED
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="lcars-gate__input"
            type="password"
            placeholder="ENTER PASSPHRASE"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            autoComplete="current-password"
            spellCheck={false}
          />
          <button
            className="lcars-gate__btn"
            type="submit"
            disabled={checking || !value.trim()}
          >
            {checking ? 'VERIFYING...' : 'AUTHORIZE ACCESS'}
          </button>
        </form>

        {error && <div className="lcars-gate__error">{error}</div>}

        <div className="lcars-readout" style={{ textAlign: 'center', marginTop: 8 }}>
          STARDATE {new Date().toISOString().split('T')[0].replace(/-/g, '.')}
        </div>
      </div>

      {/* LCARS decorative bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52, display: 'flex', gap: 8 }}>
        <div style={{ width: 72, background: 'var(--lcars-butterscotch)', borderRadius: '0 0 0 28px' }} />
        <div style={{ flex: 1, background: 'var(--lcars-golden-orange)' }} />
        <div style={{ width: 320, background: 'var(--lcars-moonlit-violet)', borderRadius: '0 0 28px 0' }} />
      </div>
    </div>
  );
}

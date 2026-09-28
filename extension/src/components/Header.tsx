import './Header.scss';

interface HeaderProps {
  email: string;
  onEditEmail?: () => void;
  isConnected?: boolean;
}

export function Header({ email, onEditEmail, isConnected = true }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="logo-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
        </div>
        <h1 className="brand-title">YT Context Hub</h1>
      </div>

      <div className="header-actions">
        <div
          className={`status-badge ${isConnected ? 'connected' : 'offline'}`}
          title={isConnected ? 'YouTube video detected' : 'No active YouTube video'}
        >
          <span className="status-dot" />
          {isConnected ? 'Active Tab' : 'Offline'}
        </div>

        {onEditEmail && (
          <button
            className="user-pill-btn"
            onClick={onEditEmail}
            title={`Logged in as ${email}. Click to change.`}
          >
            {email.split('@')[0]}
          </button>
        )}
      </div>
    </header>
  );
}

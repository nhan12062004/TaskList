import { useAuth } from "../../contexts/AuthContext.jsx";
import "./UserMenuModal.css";

export default function UserMenuModal({ isOpen, onClose, onOpenTelegram }) {
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.email || "User";
  const initial = displayName.trim().charAt(0).toUpperCase();

  if (!isOpen) return null;

  const handleTelegramClick = () => {
    onClose(); // Close menu first
    onOpenTelegram?.(); // Then open Telegram modal
  };

  return (
    <div className="user-menu-overlay" onClick={onClose}>
      <div className="user-menu" onClick={(event) => event.stopPropagation()}>
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              <span className="user-menu-avatar-text">{initial}</span>
            )}
          </div>
          <div className="user-menu-meta">
            <div className="user-menu-name">{displayName}</div>
            <div className="user-menu-subtitle">0/5 tasks</div>
          </div>
        </div>
        <div className="user-menu-divider" />
        <button type="button" className="user-menu-item">
          <span className="user-menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.46.46 1.12.6 1.82.33a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .7.4 1.31 1 1.51.7.27 1.36.13 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.46.46-.6 1.12-.33 1.82.2.6.81 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.7 0-1.31.4-1.51 1z"></path>
            </svg>
          </span>
          <span className="user-menu-label">Settings</span>
        </button>
        <button
          type="button"
          className="user-menu-item telegram-menu-item"
          onClick={handleTelegramClick}
        >
          <span className="user-menu-icon telegram-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </span>
          <span className="user-menu-label">Telegram</span>
        </button>
        <div className="user-menu-divider" />
        <button type="button" className="user-menu-item">
          <span className="user-menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 12a8 8 0 1 0 16 0"></path>
              <path d="M12 8v4l3 3"></path>
            </svg>
          </span>
          <span className="user-menu-label">Activity log</span>
        </button>
        <button type="button" className="user-menu-item">
          <span className="user-menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="6" y="3" width="12" height="14" rx="2"></rect>
              <path d="M8 7h8M8 11h8M8 15h6"></path>
            </svg>
          </span>
          <span className="user-menu-label">Print</span>
        </button>
        <div className="user-menu-divider" />
        <button type="button" className="user-menu-item">
          <span className="user-menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 12a8 8 0 0 1 14-5"></path>
              <path d="M20 12a8 8 0 0 1-14 5"></path>
              <path d="M16 5h4v4"></path>
              <path d="M8 19H4v-4"></path>
            </svg>
          </span>
          <span className="user-menu-label">Sync</span>
        </button>
        <div className="user-menu-divider" />
        <button type="button" className="user-menu-item" onClick={logout}>
          <span className="user-menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <path d="M16 17l5-5-5-5"></path>
              <path d="M21 12H9"></path>
            </svg>
          </span>
          <span className="user-menu-label">Log out</span>
        </button>
        <div className="user-menu-footer">v9610 · Changelog</div>
      </div>
    </div>
  );
}

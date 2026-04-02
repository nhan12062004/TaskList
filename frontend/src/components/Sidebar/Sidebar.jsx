import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import SpeechToText from "../SpeechToText/SpeechToText.jsx";

const MENU_ITEMS = [
  {
    id: "search",
    label: "Search",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6"></circle>
        <path d="M20 20l-3.5-3.5"></path>
      </svg>
    )
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" fill="currentColor" className="inbox-fill-svg">
        <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
      </svg>
    )
  },
  {
    id: "today",
    label: "Today",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="14" rx="2"></rect>
        <path d="M8 4v4M16 4v4M4 10h16"></path>
      </svg>
    )
  },
  {
    id: "upcoming",
    label: "Upcoming",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="14" rx="2"></rect>
        <path d="M8 4v4M16 4v4M4 10h16"></path>
        <path d="M12 13v4M12 13h3"></path>
      </svg>
    )
  },
  {
    id: "filters",
    label: "Filters & Labels",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M4 12l8-8h8v8l-8 8-8-8z"></path>
        <circle cx="16" cy="8" r="1.5"></circle>
      </svg>
    )
  },
  {
    id: "completed",
    label: "Completed",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M8 12.5l2.5 2.5L16 9"></path>
      </svg>
    )
  }
];
export default function Sidebar({
  activePage,
  onSelectPage,
  isCollapsed,
  onToggleCollapse,
  onAddTaskClick,
  onVoiceTaskClick,
  labels,
  onOpenUserMenu,
  onOpenTelegram,
  refreshTrigger
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsError, setProjectsError] = useState("");
  const [taskCounts, setTaskCounts] = useState({ inbox: 0, today: 0 });
  const [isSTTOpen, setIsSTTOpen] = useState(false);
  const { user, token } = useAuth();
  const displayName = user?.name || user?.email || "User";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const apiBaseUrl = "";

  const closeSearchWithAnimation = () => {
    setIsSearchClosing(true);
    setTimeout(() => {
      setIsSearchClosing(false);
      setIsSearchOpen(false);
    }, 150);
  };

  const handleToggleUserMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenUserMenu?.();
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!token) return;
      try {
        setProjectsError("");
        const response = await fetch(`${apiBaseUrl}/api/projects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const error = await response.json();
            throw new Error(error.error || "Failed to load projects");
          }
          const text = await response.text();
          throw new Error(text || "Failed to load projects");
        }

        const data = await response.json();
        setProjects(data.projects ?? []);
      } catch (error) {
        setProjectsError(error.message || "Failed to load projects");
      }
    };

    fetchProjects();
  }, [token]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${apiBaseUrl}/api/tasks/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setTaskCounts({
          inbox: data.inbox ?? 0,
          today: data.today ?? 0,
        });
      } catch {
        // ignore counts error
      }
    };

    fetchCounts();
  }, [token, refreshTrigger]);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="user">
          <button
            type="button"
            className="user-button"
            onClick={handleToggleUserMenu}
          >
            <div className="avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" />
              ) : (
                <span className="avatar-text">{initial}</span>
              )}
            </div>
            <span className="username">{displayName}</span>
            <span className="caret" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5"></path>
              </svg>
            </span>
          </button>
        </div>
        <div className="sidebar-actions">
          <button
            type="button"
            className={`sidebar-icon-btn bell-btn ${activePage === "notifications" ? "active" : ""}`}
            onClick={() => onSelectPage("notifications")}
            aria-label="Notifications"
            aria-pressed={activePage === "notifications"}
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="m6.585 15.388-.101.113c-.286.322-.484.584-.484 1h12c0-.416-.198-.678-.484-1l-.101-.113c-.21-.233-.455-.505-.7-.887-.213-.33-.355-.551-.458-.79-.209-.482-.256-1.035-.4-2.71-.214-3.5-1.357-5.5-3.857-5.5s-3.643 2-3.857 5.5c-.144 1.675-.191 2.227-.4 2.71-.103.239-.245.46-.457.79-.246.382-.491.654-.701.887m10.511-2.312c-.083-.341-.131-.862-.241-2.148-.113-1.811-.469-3.392-1.237-4.544C14.8 5.157 13.57 4.5 12 4.5s-2.8.656-3.618 1.883c-.768 1.152-1.124 2.733-1.237 4.544-.11 1.286-.158 1.807-.241 2.148-.062.253-.13.373-.46.884-.198.308-.373.504-.57.723q-.11.12-.232.261c-.293.342-.642.822-.642 1.557a1 1 0 0 0 1 1h3a3 3 0 0 0 6 0h3a1 1 0 0 0 1-1c0-.735-.35-1.215-.642-1.557q-.122-.141-.232-.261c-.197-.22-.372-.415-.57-.723-.33-.511-.398-.63-.46-.884M14 17.5h-4a2 2 0 1 0 4 0"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar-icon-btn ${isCollapsed ? "collapsed" : ""}`}
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M19 4.001H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2m-15 2a1 1 0 0 1 1-1h4v14H5a1 1 0 0 1-1-1zm6 13h9a1 1 0 0 0 1-1v-12a1 1 0 0 0-1-1h-9z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="add-task-wrapper">
        <button className="add-task-btn" type="button" onClick={onAddTaskClick}>
          <span className="add-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </span>
          Add task
        </button>
        <button
          className="sidebar-voice-btn"
          type="button"
          aria-label="Voice input"
          onClick={() => setIsSTTOpen(true)}
        >
          <SoundWaveIcon />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {MENU_ITEMS.map((item) => {
            const badgeValue =
              item.id === "inbox"
                ? taskCounts.inbox
                : item.id === "today"
                  ? taskCounts.today
                  : null;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`nav-item ${item.id === "search" ? "search-item" : ""} ${item.id !== "search" && activePage === item.id
                    ? "active"
                    : ""
                    }`}
                  onClick={() => {
                    if (item.id === "search") {
                      setIsSearchOpen(true);
                      return;
                    }
                    onSelectPage(item.id);
                  }}
                >
                  <span className="menu-left">
                    <span className="menu-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="menu-label">
                      {labels[item.id] ?? item.label}
                    </span>
                  </span>
                  {badgeValue ? (
                    <span className="badge">{badgeValue}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="projects">
        <div className={`nav-item projects-header ${activePage === "projects" ? "active" : ""}`}>
          <button
            type="button"
            className="projects-title-button"
            onClick={() => onSelectPage("projects")}
          >
            My Projects
          </button>
          <div className="projects-actions">
            <button
              type="button"
              className="projects-action-btn"
              aria-label="Add project"
              onClick={() => setIsProjectsMenuOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </button>
            <button
              type="button"
              className="projects-action-btn"
              aria-label={isProjectsExpanded ? "Collapse projects" : "Expand projects"}
              onClick={() => setIsProjectsExpanded((prev) => !prev)}
            >
              <svg
                className={`chevron ${isProjectsExpanded ? "open" : ""}`}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </button>
          </div>
        </div>
        {isProjectsExpanded && (
          <div className="projects-list">
            {projects.map((project) => (
              <div key={project.id} className="project">
                <span className="menu-left">
                  <span className="menu-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 4l-2 16M17 4l-2 16M4 9h16M3 15h16"></path>
                    </svg>
                  </span>
                  <span className="menu-label">{project.name}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="bottom-item telegram-link-btn"
          onClick={() => onOpenTelegram?.()}
        >
          <span className="menu-left">
            <span className="menu-icon telegram-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </span>
            <span className="menu-label">Telegram</span>
          </span>
        </button>
        <div className="bottom-item">
          <span className="menu-left">
            <span className="menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-.7.6-1.5 1-1.5 2"></path>
                <circle cx="12" cy="17" r="0.7"></circle>
              </svg>
            </span>
            <span className="menu-label">Help &amp; resources</span>
          </span>
        </div>
      </div>

      {isSearchOpen && (
        <div
          className="search-modal-overlay"
          onClick={closeSearchWithAnimation}
        >
          <div
            className={`search-modal ${isSearchClosing ? "closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="search-header">
              <div className="search-icon-wrapper">
                <svg viewBox="0 0 24 24" className="search-glass-icon">
                  <circle cx="11" cy="11" r="6"></circle>
                  <path d="M20 20l-3.5-3.5"></path>
                </svg>
              </div>
              <input
                type="text"
                className="search-input-field"
                placeholder="Search or type a command..."
                autoFocus
              />
              <span className="search-shortcut-hint">Ctrl K</span>
            </div>

            <div className="search-body-list">
              <div className="search-section-title">Navigation</div>
              <ul className="search-results">
                <li className="search-result-item" onClick={() => onSelectPage("inbox")}>
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  </span>
                  <span className="result-label">Go to Home</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>H</kbd></div>
                </li>
                <li className="search-result-item" onClick={() => onSelectPage("inbox")}>
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" fill="currentColor" className="inbox-fill-svg">
                      <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
                    </svg>
                  </span>
                  <span className="result-label">Go to Inbox</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>i</kbd></div>
                </li>
                <li className="search-result-item" onClick={() => onSelectPage("today")}>
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"></rect><path d="M8 4v4M16 4v4M4 10h16"></path></svg>
                  </span>
                  <span className="result-label">Go to Today</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>T</kbd></div>
                </li>
                <li className="search-result-item" onClick={() => onSelectPage("upcoming")}>
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"></rect><path d="M8 4v4M16 4v4M4 10h16"></path><path d="M12 13v4M12 13h3"></path></svg>
                  </span>
                  <span className="result-label">Go to Upcoming</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>U</kbd></div>
                </li>
                <li className="search-result-item" onClick={() => onSelectPage("filters")}>
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24"><path d="M4 12l8-8h8v8l-8 8-8-8z"></path><circle cx="16" cy="8" r="1.5"></circle></svg>
                  </span>
                  <span className="result-label">Go to Filters & Labels</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>V</kbd></div>
                </li>
                <li className="search-result-item" onClick={() => onSelectPage("completed")}>
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M8 12.5l2.5 2.5L16 9"></path></svg>
                  </span>
                  <span className="result-label">Go to Completed</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>C</kbd></div>
                </li>
                <li className="search-result-item">
                  <span className="result-icon">
                    <svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>
                  </span>
                  <span className="result-label">Open project...</span>
                  <div className="result-shortcut"><kbd>G</kbd> then <kbd>P</kbd></div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {isProjectsMenuOpen && (
        <div
          className="projects-modal-overlay"
          onClick={() => setIsProjectsMenuOpen(false)}
        >
          <div
            className="projects-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="projects-modal-header">
              <span>New project</span>
              <button
                type="button"
                className="projects-modal-close"
                onClick={() => setIsProjectsMenuOpen(false)}
                aria-label="Close project modal"
              >
                ×
              </button>
            </div>
            <div className="projects-modal-body">
              <input
                type="text"
                className="projects-modal-input"
                placeholder="Project name"
                autoFocus
              />
            </div>
            <div className="projects-modal-footer">
              <button
                type="button"
                className="projects-modal-cancel"
                onClick={() => setIsProjectsMenuOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="projects-modal-create">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      <SpeechToText
        isOpen={isSTTOpen}
        onClose={() => setIsSTTOpen(false)}
        onTranscript={(text) => {
          onVoiceTaskClick?.(text);
          setIsSTTOpen(false);
        }}
      />
    </aside>
  );
}

const SoundWaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M15 15.985v-11c0-.517-.166-.815-.332-.98a.94.94 0 0 0-.668-.27.94.94 0 0 0-.668.27c-.166.165-.332.463-.332.98v14c0 .996-.328 1.835-.914 2.428a2.9 2.9 0 0 1-2.097.854C8.435 22.25 7 21.027 7 18.985v-9c0-.517-.166-.815-.332-.98A.94.94 0 0 0 6 8.735a.94.94 0 0 0-.668.27c-.166.165-.332.463-.332.98v5a1 1 0 1 1-2 0v-5c0-.983.334-1.81.918-2.395A2.94 2.94 0 0 1 6 6.735c.747 0 1.507.28 2.082.855.584.585.918 1.412.918 2.395v9c0 .959.565 1.278 1.01 1.283a.9.9 0 0 0 .654-.262c.164-.166.336-.474.336-1.021v-14c0-.983.334-1.81.918-2.395A2.94 2.94 0 0 1 14 1.735c.747 0 1.507.28 2.082.855.584.585.918 1.412.918 2.395v11c0 .517.166.815.332.98a.94.94 0 0 0 .668.27.94.94 0 0 0 .668-.27c.166-.165.332-.463.332-.98v-4a1 1 0 1 1 2 0v4c0 .983-.334 1.81-.918 2.395a2.94 2.94 0 0 1-2.082.855c-.747 0-1.507-.28-2.082-.855-.584-.585-.918-1.412-.918-2.395"></path></svg>
);

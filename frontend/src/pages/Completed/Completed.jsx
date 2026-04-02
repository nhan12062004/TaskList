import React, { useState, useEffect } from "react";
import "./Completed.css";

const API_URL = "http://localhost:3000/api";

const getActionText = (actionType) => {
  switch (actionType) {
    case "create_task": return "You created the task";
    case "complete_task": return "You completed the task";
    case "reopen_task": return "You reopened the task";
    case "add_comment": return "You commented";
    case "change_date": return "You changed the date of";
    case "update_task": return "You updated the task";
    default: return "You performed an action on";
  }
};

const getTargetIcon = (actionType, details) => {
  if (actionType === "change_date") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    );
  }
  return null;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { day: 'numeric', month: 'short', weekday: 'long' };
  return date.toLocaleDateString('en-GB', options).replace(',', ' ·');
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function Completed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/activity`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();

        // Group by date
        const groups = data.reduce((acc, log) => {
          const dateStr = formatDate(log.created_at);
          if (!acc[dateStr]) acc[dateStr] = [];
          acc[dateStr].push(log);
          return acc;
        }, {});

        const formattedGroups = Object.keys(groups).map(date => ({
          date,
          items: groups[date]
        }));

        setActivities(formattedGroups);
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  if (loading) {
    return <div className="completed-page">Loading...</div>;
  }

  return (
    <div className="completed-page">
      <header className="completed-header">
        <div className="header-left">
          <button className="project-selector">
            <h1>Activity: All projects</h1>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="completed-content scrollable">
        {activities.length === 0 ? (
          <div className="history-footer" style={{ marginTop: '100px' }}>
            <p>No activity yet. Start by creating tasks!</p>
          </div>
        ) : (
          activities.map((group) => (
            <div key={group.date} className="activity-group">
              <h3 className="group-date">{group.date}</h3>
              <div className="activity-list">
                {group.items.map((item) => {
                  const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
                  return (
                    <div key={item.id} className="activity-item">
                      <div className="item-main">
                        <div className="user-avatar">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt={item.full_name} />
                          ) : (
                            <div className="avatar-placeholder">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                                <circle cx="12" cy="8" r="4"></circle>
                                <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="activity-text">
                          <span className="action-label">{getActionText(item.action_type)}</span>

                          {item.action_type === 'add_comment' && (
                            <span className="comment-pill">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                              </svg>
                              <span className="comment-content">{details.content}</span>
                            </span>
                          )}

                          {item.action_type !== 'create_task' && <span className="detail-label">on</span>}

                          {details.title && (
                            <span className="task-pill">
                              <span className="status-circle" style={{ borderColor: '#888' }}></span>
                              {details.title}
                            </span>
                          )}

                          {item.action_type === 'change_date' && (
                            <>
                              <span className="detail-label">to</span>
                              <span className="target-pill">
                                <span className="target-icon" style={{ color: '#dc2626' }}>
                                  {getTargetIcon(item.action_type)}
                                </span>
                                <span className="target-text" style={{ color: '#dc2626' }}>
                                  {new Date(details.new_date).toLocaleDateString()}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="item-meta">
                        <span className="location-label">{item.project_name || "Inbox"}</span>
                        <span className="time-label">{formatTime(item.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="history-footer">
          <p>That's it. No more history to load.</p>
        </div>
      </div>
    </div>
  );
}

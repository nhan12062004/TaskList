import { useState } from "react";
import illustration from "../../assets/02611bff72adf405.png";
import "./Notifications.css";

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <section className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications</h1>
        <div className="notifications-filters" role="tablist" aria-label="Notification filters">
          <button
            type="button"
            className="filter-chip"
            role="tab"
            aria-selected={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            type="button"
            className="filter-chip"
            role="tab"
            aria-selected={activeTab === "unread"}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </button>
        </div>
      </div>
      <div className="notifications-empty">
        <img src={illustration} alt="" />
        <p>
          {activeTab === "all"
            ? "You're all caught up!"
            : "No unread notifications."}
        </p>
      </div>
    </section>
  );
}

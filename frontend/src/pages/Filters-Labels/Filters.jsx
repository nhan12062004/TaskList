import React, { useState, useEffect } from "react";
import "./Filters.css";
import AddFilterModal from "../../components/AddFilterModal/AddFilterModal.jsx";
import AddLabelModal from "../../components/AddLabelModal/AddLabelModal.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function Filters({ title }) {
  const { user } = useAuth();
  const displayName = user?.name || user?.email || "User";
  const initial = displayName.trim().charAt(0).toUpperCase();

  const [isMyFiltersExpanded, setIsMyFiltersExpanded] = useState(true);
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(true);
  const [isAddFilterModalOpen, setIsAddFilterModalOpen] = useState(false);
  const [isAddLabelModalOpen, setIsAddLabelModalOpen] = useState(false);
  const [filters, setFilters] = useState([]);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    fetchFilters();
    fetchLabels();
  }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/filters", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFilters(data);
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const fetchLabels = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/labels", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLabels(data);
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
    }
  };

  const handleAddFilter = async (newFilter) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFilter.name,
          query: newFilter.query,
          color: newFilter.color.name, // The backend expects a color name (like 'Charcoal' or hex)
          is_favorite: newFilter.isFavorite
        })
      });

      if (response.ok) {
        const savedFilter = await response.json();
        // The backend might return color as a string, but the frontend state needs {name, hex}
        // Let's just refetch or update the state with the hex from the form
        setFilters([...filters, { ...savedFilter, color: newFilter.color }]);
      }
    } catch (error) {
      console.error("Error adding filter:", error);
    }
  };

  const handleAddLabel = async (newLabel) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newLabel.name,
          color: newLabel.color.name,
          is_favorite: newLabel.isFavorite
        })
      });

      if (response.ok) {
        const savedLabel = await response.json();
        setLabels([...labels, { ...savedLabel, color: newLabel.color.name }]);
      }
    } catch (error) {
      console.error("Error adding label:", error);
    }
  };

  // Helper to get color hex by name
  const getColorHex = (colorName) => {
    const defaultColors = [
      { name: "Berry Red", hex: "#b82525" },
      { name: "Orange", hex: "#ff9a14" },
      { name: "Yellow", hex: "#fad000" },
      { name: "Olive Green", hex: "#afb83b" },
      { name: "Lime Green", hex: "#7ecc49" },
      { name: "Green", hex: "#299438" },
      { name: "Mint Green", hex: "#6accbc" },
      { name: "Teal", hex: "#158fad" },
      { name: "Sky Blue", hex: "#14aaf5" },
      { name: "Light Blue", hex: "#96c3eb" },
      { name: "Blue", hex: "#4073ff" },
      { name: "Grape", hex: "#884dff" },
      { name: "Violet", hex: "#af38eb" },
      { name: "Lavender", hex: "#eb96eb" },
      { name: "Magenta", hex: "#e05194" },
      { name: "Salmon", hex: "#ff8d85" },
      { name: "Charcoal", hex: "#808080" },
      { name: "Grey", hex: "#b8b8b8" },
    ];
    const found = defaultColors.find(c => c.name === colorName);
    return found ? found.hex : "#808080";
  };

  // Example placeholder for labels
  // const labels = [
  //   { id: "1", name: "Local1", count: 2 }
  // ];

  return (
    <div className="filters-container">
      <header className="filters-header">
        <h1>{title || "Filters & Labels"}</h1>
      </header>

      <div className="filters-body">
        {/* My Filters Section */}
        <div className="filters-section">
          <div className="filters-section-header">
            <div className="filters-section-header-left">
              <button
                className="collapse-btn"
                onClick={() => setIsMyFiltersExpanded(!isMyFiltersExpanded)}
                aria-label={isMyFiltersExpanded ? "Collapse My Filters" : "Expand My Filters"}
              >
                <svg className={`chevron-icon ${isMyFiltersExpanded ? "open" : ""}`} viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>
              <div className="filter-icon-box">
                <div className="avatar" style={{ width: 24, height: 24, fontSize: '12px' }}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'cover' }} />
                  ) : (
                    <span className="avatar-text" style={{ background: 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>{initial}</span>
                  )}
                </div>
              </div>
              <h2>My Filters</h2>
            </div>
            <button className="add-btn" aria-label="Add Filter" onClick={() => setIsAddFilterModalOpen(true)}>
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
              </svg>
            </button>
          </div>

          <div className="divider"></div>

          {isMyFiltersExpanded && (
            <div className="section-content">
              {filters.length === 0 ? (
                <div className="empty-state">
                  Your list of filters will show up here.
                </div>
              ) : (
                <div className="filters-list">
                  {filters.map(filter => (
                    <div key={filter.id} className="filter-item">
                      <div className="filter-info">
                        <svg className="filter-icon" viewBox="0 0 24 24" style={{ color: typeof filter.color === 'string' ? getColorHex(filter.color) : filter.color.hex }}>
                          <path fill="currentColor" fillRule="evenodd" d="M17 14a5 5 0 0 1-10 0c0-1.102.345-2 1.064-3.03.138-.198.534-.71.915-1.202.33-.427.65-.84.782-1.023.775-1.077 1.338-2.123 1.765-3.403a.5.5 0 0 1 .948 0c.427 1.28.99 2.326 1.765 3.403.131.183.451.596.782 1.023.38.493.776 1.004.915 1.202C16.656 12 17 12.898 17 14m-2.709-3.54c-.587-.76-.738-.957-.863-1.13A13.7 13.7 0 0 1 12 6.882c-.377.844-.84 1.632-1.428 2.448-.125.173-.276.37-.863 1.13l-.004.004c-.493.638-.725.941-.821 1.079C8.252 12.448 8 13.15 8 14a4 4 0 0 0 8 0c0-.851-.252-1.553-.884-2.458a41 41 0 0 0-.821-1.079z" clipRule="evenodd"></path>
                        </svg>
                        <span>{filter.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Labels Section */}
        <div className="filters-section">
          <div className="filters-section-header">
            <div className="filters-section-header-left">
              <button
                className="collapse-btn"
                onClick={() => setIsLabelsExpanded(!isLabelsExpanded)}
                aria-label={isLabelsExpanded ? "Collapse Labels" : "Expand Labels"}
              >
                <svg className={`chevron-icon ${isLabelsExpanded ? "open" : ""}`} viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>
              <h2>Labels</h2>
            </div>
            <button className="add-btn" aria-label="Add Label" onClick={() => setIsAddLabelModalOpen(true)}>
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
              </svg>
            </button>
          </div>

          <div className="divider"></div>

          {isLabelsExpanded && (
            <div className="section-content labels-list">
              {labels.length === 0 ? (
                <div className="empty-state">
                  Your list of labels will show up here.
                </div>
              ) : (
                labels.map(label => (
                  <div key={label.id} className="label-item">
                    <div className="label-info">
                      <svg className="label-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style={{ color: typeof label.color === 'string' ? getColorHex(label.color) : (label.color?.hex || '#808080') }}>
                        <path fill="currentColor" fillRule="evenodd" d="M7.828 2H12a2 2 0 0 1 2 2v4.172a2 2 0 0 1-.586 1.414l-4 4a2 2 0 0 1-2.828 0L2.414 9.414a2 2 0 0 1 0-2.828l4-4A2 2 0 0 1 7.828 2m0 1a1 1 0 0 0-.707.293l-4 4a1 1 0 0 0 0 1.414l4.172 4.172a1 1 0 0 0 1.414 0l4-4A1 1 0 0 0 13 8.172V4a1 1 0 0 0-1-1zM10 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clipRule="evenodd"></path>
                      </svg>
                      <span>{label.name}</span>
                    </div>
                    <div style={{ color: '#808080', fontSize: '13px', paddingRight: '12px' }}>
                      {label.count !== undefined ? label.count : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <AddFilterModal
        isOpen={isAddFilterModalOpen}
        onClose={() => setIsAddFilterModalOpen(false)}
        onAdd={handleAddFilter}
      />
      <AddLabelModal
        isOpen={isAddLabelModalOpen}
        onClose={() => setIsAddLabelModalOpen(false)}
        onAdd={handleAddLabel}
      />
    </div>
  );
}

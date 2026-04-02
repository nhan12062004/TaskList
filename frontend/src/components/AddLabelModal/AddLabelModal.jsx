import React, { useState, useEffect, useRef } from "react";
import "./AddLabelModal.css";

export default function AddLabelModal({ isOpen, onClose, onAdd }) {
    const [name, setName] = useState("");
    const [isFavorite, setIsFavorite] = useState(false);
    const [selectedColor, setSelectedColor] = useState({ name: "Charcoal", hex: "#808080" });
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
    const colorDropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target)) {
                setIsColorDropdownOpen(false);
            }
        }
        if (isColorDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isColorDropdownOpen]);

    const colors = [
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
        { name: "Taupe", hex: "#917d66" },
    ];

    const handleSubmit = () => {
        if (!name.trim()) return;

        const newLabel = {
            name,
            color: selectedColor,
            isFavorite
        };

        if (onAdd) {
            onAdd(newLabel);
        }

        // Reset form
        setName("");
        setIsFavorite(false);
        setSelectedColor({ name: "Charcoal", hex: "#808080" });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="add-label-overlay" onClick={onClose}>
            <div className="add-label-modal" onClick={(e) => e.stopPropagation()}>
                <div className="add-label-header">
                    <div className="header-left">
                        <h2>Add label</h2>
                        <button className="help-icon-btn" aria-label="Help">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01" />
                            </svg>
                        </button>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M6 6l12 12m0-12L6 18" />
                        </svg>
                    </button>
                </div>

                <div className="add-label-body">
                    <div className="form-group">
                        <label>Name</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={60}
                            />
                            <span className="char-count">{name.length}/60</span>
                        </div>
                    </div>

                    <div className="form-group color-group">
                        <label>Color</label>
                        <div className="color-dropdown-container" ref={colorDropdownRef}>
                            <button
                                className="color-select-btn"
                                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                type="button"
                            >
                                <div className="color-left">
                                    <span className="color-circle" style={{ backgroundColor: selectedColor.hex }}></span>
                                    <span>{selectedColor.name}</span>
                                </div>
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" className={isColorDropdownOpen ? "rotated" : ""}>
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>

                            {isColorDropdownOpen && (
                                <ul className="color-dropdown">
                                    {colors.map((color) => (
                                        <li
                                            key={color.name}
                                            onClick={() => {
                                                setSelectedColor(color);
                                                setIsColorDropdownOpen(false);
                                            }}
                                            className={selectedColor.name === color.name ? "selected" : ""}
                                        >
                                            {selectedColor.name === color.name && (
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="check-icon">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                </svg>
                                            )}
                                            <span className="color-circle" style={{ backgroundColor: color.hex }}></span>
                                            <span className="color-name">{color.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="form-group toggle-group">
                        <button
                            className={`toggle-switch ${isFavorite ? 'on' : 'off'}`}
                            onClick={() => setIsFavorite(!isFavorite)}
                            aria-checked={isFavorite}
                            role="switch"
                        >
                            <div className="toggle-knob"></div>
                        </button>
                        <span className="toggle-label" onClick={() => setIsFavorite(!isFavorite)}>Add to favorites</span>
                    </div>
                </div>

                <div className="add-label-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className={`add-submit-btn ${!name.trim() ? 'disabled' : ''}`}
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./AddTaskInline.css";
import { useAuth } from "../../contexts/AuthContext.jsx";
import SpeechToText from "../SpeechToText/SpeechToText.jsx";

export default function AddTaskInline({ onCancel, onAdd, initialProject = null, initialSectionId = null, initialDate = null, initialTask = null }) {
    const { user, logout } = useAuth();
    const displayName = user?.name || user?.email || "User";
    const initial = displayName.trim().charAt(0).toUpperCase();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(initialTask?.due_date ? new Date(initialTask.due_date) : initialDate);
    const [title, setTitle] = useState(initialTask?.title || "");
    const [description, setDescription] = useState(initialTask?.description || "");
    const [priority, setPriority] = useState(initialTask?.priority || 4);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [showLabelPicker, setShowLabelPicker] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState(initialTask?.labels ? initialTask.labels.map(l => typeof l === 'string' ? l : l.name) : []);
    const [labelSearch, setLabelSearch] = useState("");
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const [isClosing, setIsClosing] = useState(false);
    const lastAutoTitleRef = useRef("");
    const [stickyMonth, setStickyMonth] = useState(null);
    const [isSTTOpen, setIsSTTOpen] = useState(false);

    // Projects state
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(initialTask ? (initialTask.project_name ? { id: initialTask.project_id, name: initialTask.project_name } : null) : initialProject);
    const [inboxProject, setInboxProject] = useState(null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [projectSearch, setProjectSearch] = useState("");
    const projectPickerRef = useRef(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("/api/projects", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.projects);
                }
            } catch (err) {
                console.error("Failed to fetch projects", err);
            }
        };
        if (showProjectPicker) {
            fetchProjects();
        }
    }, [showProjectPicker]);

    useEffect(() => {
        const fetchInboxProject = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("/api/projects/inbox", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInboxProject(data);
                }
            } catch (err) {
                console.error("Failed to fetch inbox project", err);
            }
        };
        if (!inboxProject) {
            fetchInboxProject();
        }
    }, [inboxProject]);

    // --- LOGIC THỜI GIAN ---
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This weekend
    const thisWeekend = new Date(today);
    thisWeekend.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));

    // Next week
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));

    // viewDate
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    const isAtCurrentMonth =
        viewDate.getFullYear() === today.getFullYear() &&
        viewDate.getMonth() === today.getMonth();

    // --- HÀM ĐIỀU HƯỚNG ---
    const handlePrevMonth = (e) => {
        e.stopPropagation();
        if (isAtCurrentMonth) return;
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleGoToday = (e) => {
        e.stopPropagation();
        setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    // 6 months display
    const monthsToDisplay = useMemo(() => {
        const months = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthName = date.toLocaleString('en-US', { month: 'short' });

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startOffset = firstDay === 0 ? 6 : firstDay - 1;

            const days = [];
            for (let j = 0; j < startOffset; j++) days.push(null);
            for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

            months.push({ id: `${year}-${month}`, monthName, year, days });
        }
        return months;
    }, [viewDate]);

    const formatDateLabel = (date) => {
        if (!date) return "Date";
        const dateStr = date.toDateString();
        if (dateStr === today.toDateString()) return "Today";
        if (dateStr === tomorrow.toDateString()) return "Tomorrow";
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);
        if (date > tomorrow && date <= sevenDaysLater) return date.toLocaleDateString('en-US', { weekday: 'long' });
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const isTodaySelected = selectedDate && selectedDate.toDateString() === today.toDateString();
    const isTomorrowSelected = selectedDate && selectedDate.toDateString() === tomorrow.toDateString();
    const isNextSevenSelected = selectedDate && selectedDate > tomorrow && selectedDate <= new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const startOfWeek = useMemo(() => {
        const start = new Date(today);
        const dayIndex = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - dayIndex);
        start.setHours(0, 0, 0, 0);
        return start;
    }, [today]);
    const dateInputValue = selectedDate ? selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";

    const titleInputRef = useRef(null);
    const datepickerRef = useRef(null);
    const priorityPickerRef = useRef(null);
    const labelPickerRef = useRef(null);
    const editorRef = useRef(null);

    const [datePickerFlip, setDatePickerFlip] = useState(false);
    const [priorityPickerFlip, setPriorityPickerFlip] = useState(false);
    const [labelPickerFlip, setLabelPickerFlip] = useState(false);

    // Insert Chip
    const insertChip = (type, value, text, prefix = "") => {
        if (!editorRef.current) return;

        if (type === 'date' || type === 'priority' || type === 'project') {
            const existing = editorRef.current.querySelector(`.chip-item[data-type="${type}"]`);
            if (existing) {
                const nextSibling = existing.nextSibling;
                if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE &&
                    (nextSibling.textContent === '\u00A0' || nextSibling.textContent === ' ' || nextSibling.textContent.trim() === '')) {
                    nextSibling.remove();
                }
                existing.remove();
            }
        }

        const span = document.createElement('span');
        span.className = 'chip-item';
        span.contentEditable = "false";
        span.dataset.type = type;
        span.dataset.value = value;

        span.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (type === 'date') {
                setSelectedDate(null);
            } else if (type === 'priority') {
                setPriority(4);
            } else if (type === 'label') {
                setSelectedLabels(prev => prev.filter(l => l !== value));
            } else if (type === 'project') {
                setSelectedProject(initialProject);
            }

            const next = span.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                next.remove();
            }
            span.remove();
        };

        if (prefix) {
            const p = document.createElement('span');
            p.className = 'prefix';
            p.textContent = prefix;
            span.appendChild(p);
        }

        const t = document.createTextNode(text);
        span.appendChild(t);

        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (editorRef.current.contains(range.commonAncestorContainer)) {
                range.insertNode(span);
                range.collapse(false);
                const space = document.createTextNode(' ');
                range.insertNode(space);
                range.setStartAfter(space);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                editorRef.current.appendChild(span);
                editorRef.current.appendChild(document.createTextNode(' '));
            }
        } else {
            editorRef.current.appendChild(span);
            editorRef.current.appendChild(document.createTextNode(' '));
        }

        syncStateFromDOM();
    };

    const syncStateFromDOM = () => {
        if (!editorRef.current) return;

        const dateChip = editorRef.current.querySelector('.chip-item[data-type="date"]');
        if (!dateChip && selectedDate) {
            setSelectedDate(null);
        }

        const priChip = editorRef.current.querySelector('.chip-item[data-type="priority"]');
        if (!priChip && priority !== 4) {
            setPriority(4);
        }

        const labelChips = editorRef.current.querySelectorAll('.chip-item[data-type="label"]');
        const labels = Array.from(labelChips).map(c => c.dataset.value);
        if (JSON.stringify(labels) !== JSON.stringify(selectedLabels)) {
            setSelectedLabels(labels);
        }
    };

    const handleDateSelectOverride = (date) => {
        setSelectedDate(date);
        const dateFormatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        insertChip('date', date.toISOString(), dateFormatted, '');
    };

    const handlePrioritySelectOverride = (p) => {
        setPriority(p);
        if (p < 4) {
            insertChip('priority', p, `P${p}`, '');
        } else {
            if (editorRef.current) {
                const priorityChip = editorRef.current.querySelector('.chip-item[data-type="priority"]');
                if (priorityChip) {
                    priorityChip.remove();
                }
            }
        }
        setShowPriorityPicker(false);
    };

    const handleLabelSelectOverride = (label) => {
        if (selectedLabels.includes(label)) {
            const existing = Array.from(editorRef.current.querySelectorAll(`.chip-item[data-type="label"]`))
                .find(el => el.dataset.value === label);
            if (existing) {
                const next = existing.nextSibling;
                if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                    next.remove();
                }
                existing.remove();
            }
            setSelectedLabels(prev => prev.filter(l => l !== label));
        } else {
            setSelectedLabels(prev => [...prev, label]);
            insertChip('label', label, label, '@');
        }
        setLabelSearch("");
    };

    const handleProjectSelectOverride = (proj) => {
        setSelectedProject(proj);
        if (proj) {
            insertChip('project', proj.id, proj.name, '#');
        } else {
            if (editorRef.current) {
                const existing = editorRef.current.querySelector('.chip-item[data-type="project"]');
                if (existing) {
                    const next = existing.nextSibling;
                    if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                        next.remove();
                    }
                    existing.remove();
                }
            }
        }
        setShowProjectPicker(false);
        setProjectSearch("");
    };

    const scrollAreaRef = useRef(null);
    const monthBlockRefs = useRef([]);
    const isAutoTitle = !!dateInputValue && title === dateInputValue;
    const prioritised = priority !== 4;

    const [availableLabels, setAvailableLabels] = useState([]);

    useEffect(() => {
        const fetchLabels = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("/api/labels", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLabels(data.map(l => l.name));
                }
            } catch (err) {
                console.error("Failed to fetch labels", err);
            }
        };
        if (showLabelPicker) {
            fetchLabels();
        }
    }, [showLabelPicker]);

    const filteredLabels = availableLabels.filter(l => l.toLowerCase().includes(labelSearch.toLowerCase()));

    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        if (selectedDate) {
            setSearchText(selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
        } else {
            setSearchText("");
        }
    }, [selectedDate]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchText(val);

        if (!val.trim()) {
            setSelectedDate(null);
            return;
        }

        try {
            const currentYear = new Date().getFullYear();
            let dateToParse = val;
            if (!/\d{4}/.test(val)) {
                dateToParse = `${val} ${currentYear}`;
            }
            const timestamp = Date.parse(dateToParse);
            if (!isNaN(timestamp)) {
                const newDate = new Date(timestamp);
                if (newDate instanceof Date && !isNaN(newDate)) {
                    setSelectedDate(newDate);
                }
            }
        } catch (err) { }
    };

    useEffect(() => {
        if (dateInputValue !== lastAutoTitleRef.current) {
            if (!title || title === lastAutoTitleRef.current) {
                setTitle(dateInputValue);
            }
            lastAutoTitleRef.current = dateInputValue;
        }
        else if (dateInputValue && !title && lastAutoTitleRef.current === dateInputValue) {
            setTitle(dateInputValue);
        }
    }, [dateInputValue, title]);

    useEffect(() => {
        setStickyMonth(monthsToDisplay[0] ?? null);
    }, [monthsToDisplay]);

    const handleCalendarScroll = () => {
        if (!scrollAreaRef.current || monthsToDisplay.length === 0) return;
        const scrollTop = scrollAreaRef.current.scrollTop;
        let current = monthsToDisplay[0];
        for (let i = 0; i < monthsToDisplay.length; i += 1) {
            const el = monthBlockRefs.current[i];
            if (!el) continue;
            if (el.offsetTop <= scrollTop + 4) {
                current = monthsToDisplay[i];
            } else {
                break;
            }
        }
        if (current && (!stickyMonth || stickyMonth.id !== current.id)) {
            setStickyMonth(current);
        }
    };

    const handleCreateProject = async () => {
        if (!projectSearch.trim()) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: projectSearch.trim() })
            });

            if (res.ok) {
                const newProject = await res.json();
                setProjects(prev => [...prev, newProject]);
                setProjects(prev => [...prev, newProject]); // Double set? safe to keep one
                handleProjectSelectOverride(newProject);
            } else {
                console.error("Failed to create project");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSTTTranscript = (transcript) => {
        if (!editorRef.current) return;
        const currentText = editorRef.current.textContent.trim();
        if (currentText) {
            editorRef.current.appendChild(document.createTextNode(' ' + transcript));
        } else {
            editorRef.current.appendChild(document.createTextNode(transcript));
        }
        setTitle(editorRef.current.textContent);
        setTimeout(() => {
            editorRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }, 100);
    };

    const closeWithAnimation = () => {
        onCancel();
    };

    const handleAttemptClose = () => {
        const isDirty = () => {
            if (!initialTask) {
                // If adding new, check if anything non-default is present
                return (
                    title.trim().length > 0 ||
                    description.trim().length > 0 ||
                    selectedDate !== initialDate ||
                    priority !== 4 ||
                    selectedLabels.length > 0 ||
                    (selectedProject && initialProject && selectedProject.id !== initialProject.id) ||
                    (selectedProject && !initialProject && selectedProject.name !== "Inbox")
                );
            }

            // If editing, compare with initialTask
            const initialTitle = (initialTask.title || "").trim();
            const currentTitle = title.trim();
            if (initialTitle !== currentTitle) return true;

            const initialDesc = (initialTask.description || "").trim();
            const currentDesc = description.trim();
            if (initialDesc !== currentDesc) return true;

            if (priority !== (initialTask.priority || 4)) return true;

            const initialDateStr = initialTask.due_date ? new Date(initialTask.due_date).toDateString() : null;
            const currentDateStr = selectedDate ? selectedDate.toDateString() : null;
            if (initialDateStr !== currentDateStr) return true;

            const initialProjId = initialTask.project_id || null;
            const currentProjId = selectedProject?.id || null;
            if (initialProjId !== currentProjId) return true;

            const initialLabels = initialTask.labels ? initialTask.labels.map(l => typeof l === 'string' ? l : l.name).sort().join(',') : "";
            const currentLabels = [...selectedLabels].sort().join(',');
            if (initialLabels !== currentLabels) return true;

            return false;
        };

        if (isDirty()) {
            setShowDiscardConfirm(true);
        } else {
            closeWithAnimation();
        }
    };

    const handleDiscard = () => {
        setTitle("");
        setDescription("");
        setSelectedDate(null);
        setPriority(4);
        setSelectedLabels([]);
        setStickyMonth(null);
        setShowDiscardConfirm(false);
        closeWithAnimation();
    };

    const handleAddTask = async () => {
        let rawTitle = "";
        if (editorRef.current) {
            const clone = editorRef.current.cloneNode(true);
            const chips = clone.querySelectorAll('.chip-item');
            chips.forEach(c => c.remove());
            rawTitle = clone.textContent || "";
        } else {
            rawTitle = title;
        }

        const cleanTitle = rawTitle.trim();
        if (!cleanTitle) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Authentication error");
                return;
            }

            const payload = {
                content: cleanTitle,
                description: description,
                priority: priority === 4 ? 4 : priority,
                due_date: selectedDate ? (() => {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                })() : null,
                labels: selectedLabels,
                project_id: selectedProject ? selectedProject.id : (inboxProject ? inboxProject.id : null),
                section_id: initialSectionId || null
            };

            const url = initialTask ? `/api/tasks/${initialTask.id}` : "/api/tasks";
            const method = initialTask ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setTitle("");
                setDescription("");
                setSelectedDate(null);
                setPriority(4);
                setSelectedLabels([]);
                if (editorRef.current) editorRef.current.innerHTML = "";

                if (onAdd) onAdd();
            } else {
                if (res.status === 401) {
                    alert("Session expired. Please log in again.");
                    logout();
                    return;
                }
                const err = await res.text();
                alert("Failed to add task: " + err);
            }

        } catch (e) {
            console.error(e);
            alert("Error adding task: " + e.message);
        }
    };

    const handleCreateLabel = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!labelSearch.trim()) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/labels", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: labelSearch })
            });

            if (res.ok) {
                const newLabel = await res.json();
                setAvailableLabels(prev => [...prev, newLabel.name]);
                setSelectedLabels(prev => [...prev, newLabel.name]);
                setLabelSearch("");
            } else {
                console.error("Failed to create label");
            }
        } catch (err) {
            console.error("Failed to create label", err);
        }
    };

    const checkShouldFlip = (buttonRef, popupHeight) => {
        if (!buttonRef.current) return false;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        return spaceBelow < popupHeight + 20;
    };

    const handleOpenDatePicker = () => {
        if (!showDatePicker) {
            const shouldFlip = checkShouldFlip(datepickerRef, 450);
            setDatePickerFlip(shouldFlip);
        }
        setShowDatePicker(!showDatePicker);
    };

    const handleOpenPriorityPicker = () => {
        if (!showPriorityPicker) {
            const shouldFlip = checkShouldFlip(priorityPickerRef, 180);
            setPriorityPickerFlip(shouldFlip);
        }
        setShowPriorityPicker(!showPriorityPicker);
    };

    const handleOpenLabelPicker = () => {
        if (!showLabelPicker) {
            const shouldFlip = checkShouldFlip(labelPickerRef, 280);
            setLabelPickerFlip(shouldFlip);
        }
        setShowLabelPicker(!showLabelPicker);
    };

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (showDatePicker && datepickerRef.current && !datepickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
            if (showPriorityPicker && priorityPickerRef.current && !priorityPickerRef.current.contains(e.target)) {
                setShowPriorityPicker(false);
            }
            if (showLabelPicker && labelPickerRef.current && !labelPickerRef.current.contains(e.target)) {
                setShowLabelPicker(false);
            }
            if (showProjectPicker && projectPickerRef.current && !projectPickerRef.current.contains(e.target)) {
                setShowProjectPicker(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [showDatePicker, showPriorityPicker, showLabelPicker, showProjectPicker]);

    useEffect(() => {
        if (initialDate && !initialTask && !editorRef.current?.querySelector('.chip-item[data-type="date"]')) {
            // Use a slight timeout to ensure DOM is ready and stabilization
            setTimeout(() => {
                handleDateSelectOverride(initialDate);
            }, 0);
        }

        if (initialTask && editorRef.current) {
            // Populate content editable
            const taskTitle = initialTask.title || "";
            editorRef.current.textContent = taskTitle;
            setTitle(taskTitle);
        }
    }, []);

    return (
        <div className={`ati-container ${initialTask ? 'is-editing' : ''}`}>
            <div className="ati-main-content">
                <div className="ati-title-row">
                    <div
                        ref={editorRef}
                        className="ati-content-editable"
                        contentEditable
                        onInput={() => {
                            const text = editorRef.current.textContent;
                            setTitle(text);

                            if (!text.trim() && !editorRef.current.querySelector('.chip-item')) {
                                editorRef.current.innerHTML = "";
                            }

                            if (editorRef.current) {
                                if (!editorRef.current.querySelector('.chip-item[data-type="date"]') && selectedDate) {
                                    setSelectedDate(null);
                                }
                                if (!editorRef.current.querySelector('.chip-item[data-type="priority"]') && priority !== 4) {
                                    setPriority(4);
                                }
                                if (!editorRef.current.querySelector('.chip-item[data-type="project"]') && selectedProject && selectedProject.id !== initialProject?.id) {
                                    setSelectedProject(initialProject);
                                }
                            }
                        }}
                        placeholder="Task name"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTask();
                            }
                        }}
                    ></div>
                    <button
                        type="button"
                        className="ati-voice-btn"
                        aria-label="Voice input"
                        onClick={() => setIsSTTOpen(true)}
                    >
                        <SoundWaveIcon />
                    </button>
                </div>

                <input
                    type="text"
                    className="ati-input-desc"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoComplete="off"
                />

                <div className="ati-actions-row">
                    <div className="ati-popover-wrapper" ref={datepickerRef}>
                        <button
                            type="button"
                            className={`ati-tag-btn ${showDatePicker ? 'active' : ''} ${isTodaySelected ? 'is-today' : ''} ${isTomorrowSelected ? 'is-tomorrow' : ''} ${isNextSevenSelected ? 'is-next-seven' : ''}`}
                            onClick={handleOpenDatePicker}
                        >
                            <span className="ati-tag-icon"><CalendarIcon /></span>
                            {formatDateLabel(selectedDate)}
                            {selectedDate && (
                                <button
                                    type="button"
                                    className="ati-tag-clear"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDate(null);
                                        if (editorRef.current) {
                                            const dateChip = editorRef.current.querySelector('.chip-item[data-type="date"]');
                                            if (dateChip) {
                                                const next = dateChip.nextSibling;
                                                if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) next.remove();
                                                dateChip.remove();
                                            }
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </button>

                        {showDatePicker && (
                            <div className={`ati-popover ati-datepicker-popover ${datePickerFlip ? 'flip' : ''}`}>
                                <div className="ati-dp-search">
                                    <input
                                        type="text"
                                        placeholder="Type a date"
                                        value={searchText}
                                        onChange={handleSearchChange}
                                        autoFocus
                                    />
                                </div>

                                <div className="ati-dp-list">
                                    <div className="ati-dp-item" onClick={() => { handleDateSelectOverride(today); setShowDatePicker(false); }}>
                                        <span className="ati-dp-left">
                                            <span className="ati-dp-ico green"><TodayIcon /></span>
                                            <span className="ati-dp-label">Today</span>
                                        </span>
                                        <span className="ati-dp-sub right">{today.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    </div>

                                    <div className="ati-dp-item" onClick={() => { handleDateSelectOverride(tomorrow); setShowDatePicker(false); }}>
                                        <span className="ati-dp-left">
                                            <span className="ati-dp-ico orange"><TomorrowIcon /></span>
                                            <span className="ati-dp-label">Tomorrow</span>
                                        </span>
                                        <span className="ati-dp-sub right">{tomorrow.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    </div>

                                    <div className="ati-dp-item" onClick={() => { handleDateSelectOverride(thisWeekend); setShowDatePicker(false); }}>
                                        <span className="ati-dp-left">
                                            <span className="ati-dp-ico blue"><WeekendIcon /></span>
                                            <span className="ati-dp-label">This weekend</span>
                                        </span>
                                        <span className="ati-dp-sub right">{thisWeekend.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    </div>

                                    <div className="ati-dp-item" onClick={() => { handleDateSelectOverride(nextWeek); setShowDatePicker(false); }}>
                                        <span className="ati-dp-left">
                                            <span className="ati-dp-ico purple"><NextWeekIcon /></span>
                                            <span className="ati-dp-label">Next week</span>
                                        </span>
                                        <span className="ati-dp-sub right">{nextWeek.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>

                                <div className="ati-dp-fixed">
                                    <div className="ati-dp-month-header">
                                        <span className="ati-dp-month-title">
                                            {stickyMonth
                                                ? `${stickyMonth.monthName} ${stickyMonth.year}`
                                                : `${viewDate.toLocaleString('en-US', { month: 'short' })} ${viewDate.getFullYear()}`}
                                        </span>
                                        <div className="ati-dp-nav">
                                            <button
                                                type="button"
                                                className={`nav-btn ${isAtCurrentMonth ? 'disabled' : ''}`}
                                                onClick={handlePrevMonth}
                                            >‹</button>
                                            <button type="button" className="nav-btn dot" onClick={handleGoToday}>○</button>
                                            <button type="button" className="nav-btn" onClick={handleNextMonth}>›</button>
                                        </div>
                                    </div>
                                    <div className="ati-dp-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
                                </div>

                                <div className="ati-dp-scroll-area" ref={scrollAreaRef} onScroll={handleCalendarScroll}>
                                    {monthsToDisplay.map((m, idx) => (
                                        <div
                                            key={m.id}
                                            className="ati-dp-month-block"
                                            ref={(el) => {
                                                monthBlockRefs.current[idx] = el;
                                            }}
                                        >
                                            {idx > 0 && (
                                                <div className="ati-dp-month-divider">
                                                    <span className="ati-dp-month-divider-label">
                                                        {m.monthName}{m.year !== new Date().getFullYear() ? ` ${m.year}` : ""}
                                                    </span>
                                                    <span className="ati-dp-month-divider-line" />
                                                </div>
                                            )}
                                            <div className="ati-dp-days-grid">
                                                {(() => {
                                                    const daysToRender = [];
                                                    for (let w = 0; w < m.days.length; w += 7) {
                                                        const week = m.days.slice(w, w + 7);
                                                        const hasCurrentOrFuture = week.some(
                                                            (date) => date && date >= startOfWeek
                                                        );
                                                        if (idx === 0 && !hasCurrentOrFuture) continue;
                                                        daysToRender.push(...week);
                                                    }
                                                    return daysToRender;
                                                })().map((date, i) => {
                                                    if (!date) return <div key={i} className="ati-dp-day empty"></div>;
                                                    const isToday = date.toDateString() === today.toDateString();
                                                    const isSelected =
                                                        selectedDate && date.toDateString() === selectedDate.toDateString();
                                                    const isPast = date < today && !isToday;

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`ati-dp-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                                                            onClick={() => { if (!isPast) { handleDateSelectOverride(date); } }}
                                                        >
                                                            {date.getDate()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="ati-dp-footer">
                                    <button type="button"><TimeIcon /> Time</button>
                                    <button type="button"><RepeatIcon /> Repeat</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="ati-popover-wrapper" ref={priorityPickerRef}>
                        <button
                            type="button"
                            className={`ati-tag-btn ${showPriorityPicker ? 'active' : ''} ${priority < 4 ? `p${priority}` : ''}`}
                            onClick={handleOpenPriorityPicker}
                        >
                            <span className="ati-tag-icon">
                                <PriorityIcon className={priority < 4 ? `icon-p${priority}` : ''} filled={priority < 4} />
                            </span>
                            {priority === 4 ? "Priority" : `P${priority}`}
                            {priority !== 4 && (
                                <button
                                    type="button"
                                    className="ati-tag-clear"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPriority(4);
                                        if (editorRef.current) {
                                            const priorityChip = editorRef.current.querySelector('.chip-item[data-type="priority"]');
                                            if (priorityChip) {
                                                const next = priorityChip.nextSibling;
                                                if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) next.remove();
                                                priorityChip.remove();
                                            }
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </button>

                        {showPriorityPicker && (
                            <div className={`ati-popover ati-priority-popover ${priorityPickerFlip ? 'flip' : ''}`}>
                                {[1, 2, 3, 4].map((p) => {
                                    const priorityColors = {
                                        1: '#d1453b',
                                        2: '#eb8909',
                                        3: '#246fe0',
                                        4: '#808080'
                                    };
                                    return (
                                        <div
                                            key={p}
                                            className="ati-p-item"
                                            onClick={() => handlePrioritySelectOverride(p)}
                                        >
                                            <span className="ati-p-left">
                                                <span className={`ati-p-flag p${p}`}>
                                                    <PriorityIcon filled={p < 4} color={priorityColors[p]} />
                                                </span>
                                                <span className="ati-p-label">Priority {p}</span>
                                            </span>
                                            {priority === p && <span className="ati-p-check">✓</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="ati-popover-wrapper" ref={labelPickerRef}>
                        {selectedLabels.length > 0 && (
                            <button
                                type="button"
                                className={`ati-tag-btn has-labels ${showLabelPicker ? 'active' : ''}`}
                                onClick={handleOpenLabelPicker}
                            >
                                <span className="ati-tag-icon"><LabelIcon /></span>
                                {selectedLabels[0]}
                                <button
                                    type="button"
                                    className="ati-tag-clear"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const labelToRemove = selectedLabels[0];
                                        setSelectedLabels(prev => prev.slice(1));
                                        if (editorRef.current) {
                                            const chip = editorRef.current.querySelector(`.chip-item[data-type="label"][data-value="${labelToRemove}"]`);
                                            if (chip) {
                                                const next = chip.nextSibling;
                                                if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) next.remove();
                                                chip.remove();
                                            }
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            </button>
                        )}

                        {selectedLabels.length > 1 && (
                            <button
                                type="button"
                                className="ati-tag-btn ati-label-count"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLabels([]);
                                    if (editorRef.current) {
                                        const chips = editorRef.current.querySelectorAll('.chip-item[data-type="label"]');
                                        chips.forEach(chip => {
                                            const next = chip.nextSibling;
                                            if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) next.remove();
                                            chip.remove();
                                        });
                                    }
                                }}
                            >
                                <span className="ati-tag-icon"><LabelIcon /></span>
                                {selectedLabels.length - 1}
                                <span className="ati-tag-clear">×</span>
                            </button>
                        )}

                        {selectedLabels.length === 0 && (
                            <button
                                type="button"
                                className={`ati-tag-btn ${showLabelPicker ? 'active' : ''}`}
                                onClick={handleOpenLabelPicker}
                            >
                                <span className="ati-tag-icon"><LabelIcon /></span>
                                Labels
                            </button>
                        )}

                        {showLabelPicker && (
                            <div className={`ati-popover ati-label-popover ${labelPickerFlip ? 'flip' : ''}`}>
                                <input
                                    type="text"
                                    className="ati-label-search"
                                    placeholder="Type a label"
                                    value={labelSearch}
                                    onChange={(e) => setLabelSearch(e.target.value)}
                                    autoFocus
                                    autoComplete="off"
                                />
                                <div className="ati-label-list">
                                    {filteredLabels.map(label => {
                                        const isSelected = selectedLabels.includes(label);
                                        return (
                                            <div
                                                key={label}
                                                className="ati-label-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleLabelSelectOverride(label);
                                                }}
                                            >
                                                <span className="ati-label-left">
                                                    <LabelIcon />
                                                    <span className="ati-label-text">{label}</span>
                                                </span>
                                                <div className={`ati-checkbox ${isSelected ? 'checked' : ''}`}>
                                                    {isSelected && <CheckIcon />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredLabels.length === 0 && labelSearch.trim() !== "" && (
                                        <>
                                            <div className="ati-label-empty">Label not found</div>
                                            <div
                                                className="ati-label-create"
                                                onMouseDown={handleCreateLabel}
                                            >
                                                <span className="plus-icon">+</span>
                                                Create "{labelSearch}"
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="ati-footer">
                <div className="ati-popover-wrapper" ref={projectPickerRef}>
                    <button
                        type="button"
                        className={`ati-project-selector ${showProjectPicker ? 'active' : ''}`}
                        onClick={() => { setShowProjectPicker(!showProjectPicker); setTimeout(() => document.getElementById('project-search-input-inline')?.focus(), 50); }}
                    >
                        {(!selectedProject || selectedProject.is_inbox || selectedProject.name === "Inbox") ? (
                            <InboxIcon style={{ width: 18, height: 18 }} />
                        ) : (
                            <span style={{ color: selectedProject.color || '#808080', marginRight: 6, fontSize: 16 }}>#</span>
                        )}
                        <span className="ati-project-name">
                            {(!selectedProject || selectedProject.is_inbox || selectedProject.name === "Inbox") ? "Inbox" : selectedProject.name}
                        </span>{" "}
                        <ArrowDownIcon />
                    </button>


                    {showProjectPicker && (
                        <div className="ati-popover ati-project-popover" onClick={(e) => e.stopPropagation()}>
                            <div className="ati-project-search-wrapper">
                                <input
                                    id="project-search-input-inline"
                                    type="text"
                                    className="ati-project-search"
                                    placeholder="Type a project name"
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            <div className="ati-project-list">
                                {("Inbox".toLowerCase().includes(projectSearch.toLowerCase()) || !projectSearch) && (
                                    <div
                                        className={`ati-project-item ${(!selectedProject || selectedProject.is_inbox || selectedProject.name === "Inbox") ? 'is-selected' : ''}`}
                                        onClick={() => handleProjectSelectOverride(null)}
                                    >
                                        <span className="ati-p-left">
                                            <InboxIcon style={{ width: 20, height: 20 }} />
                                            <span className="ati-p-label">Inbox</span>
                                        </span>
                                        {(!selectedProject || selectedProject.is_inbox || selectedProject.name === "Inbox") && <CheckIcon />}
                                    </div>
                                )}

                                {!projectSearch && (
                                    <div className="ati-project-group-header">
                                        <div className="avatar" style={{ width: 24, height: 24, fontSize: 12 }}>
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            ) : (
                                                <span className="avatar-text" style={{ fontWeight: 600, color: '#3a3a3a' }}>{initial}</span>
                                            )}
                                        </div>
                                        <span className="ati-p-group-title">My Projects</span>
                                    </div>
                                )}

                                {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(proj => (
                                    <div
                                        key={proj.id}
                                        className={`ati-project-item ${selectedProject?.id === proj.id ? 'is-selected' : ''} ${!projectSearch ? 'is-child-project' : ''}`}
                                        onClick={() => handleProjectSelectOverride(proj)}
                                    >
                                        <span className="ati-p-left">
                                            <span style={{ color: proj.color || '#808080', marginRight: 8, fontSize: 16 }}>#</span>
                                            <span className="ati-p-label">{proj.name}</span>
                                        </span>
                                        {selectedProject?.id === proj.id && <CheckIcon />}
                                    </div>
                                ))}

                                {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 &&
                                    ! "Inbox".toLowerCase().includes(projectSearch.toLowerCase()) && (
                                        <>
                                            <div className="ati-project-empty">Project not found</div>
                                            <div className="ati-project-create" onMouseDown={(e) => { e.stopPropagation(); handleCreateProject(); }}>
                                                <span className="plus-icon">+</span> Create "{projectSearch}"
                                            </div>
                                        </>
                                    )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="ati-footer-btns">
                    <button type="button" className="ati-btn-cancel" onClick={handleAttemptClose}>Cancel</button>
                    <button
                        type="button"
                        className={`ati-btn-add ${title.trim() ? "is-active" : ""}`}
                        onClick={handleAddTask}
                    >
                        {initialTask ? "Save" : "Add task"}
                    </button>
                </div>
            </div>

            {showDiscardConfirm && createPortal(
                <div
                    className="ati-confirm-overlay"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDiscardConfirm(false);
                    }}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 11000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    <div className="ati-confirm-box" onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: 20, borderRadius: 8, maxWidth: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <h3 className="ati-confirm-title" style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Discard unsaved changes?</h3>
                        <p className="ati-confirm-text" style={{ fontSize: 14, color: '#555' }}>Your unsaved changes will be discarded.</p>
                        <div className="ati-confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 15 }}>
                            <button
                                className="ati-confirm-btn-cancel"
                                style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer' }}
                                onClick={() => setShowDiscardConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ati-confirm-btn-discard"
                                style={{ padding: '6px 12px', border: 'none', borderRadius: 4, background: '#db4c3f', color: 'white', cursor: 'pointer' }}
                                onClick={handleDiscard}
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <SpeechToText
                isOpen={isSTTOpen}
                onClose={() => setIsSTTOpen(false)}
                onTranscript={handleSTTTranscript}
            />
        </div>
    );
}

// Icons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path fill="currentColor" d="M12 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1m-1.25 7a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5m.75-5a.5.5 0 1 1 0 1h-7a.5.5 0 0 1 0-1z"></path>
    </svg>
);
const PriorityIcon = ({ className = "", filled = false, color = "currentColor" }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
        {filled ? (
            <path fill={color} d="M2 3a.5.5 0 0 1 .276-.447C3.025 2.179 4.096 2 5.5 2c.901 0 1.485.135 2.658.526C9.235 2.885 9.735 3 10.5 3c1.263 0 2.192-.155 2.776-.447A.5.5 0 0 1 14 3v6.5a.5.5 0 0 1-.276.447c-.749.375-1.82.553-3.224.553-.901 0-1.485-.135-2.658-.526C6.765 9.615 6.265 9.5 5.5 9.5c-1.08 0-1.915.113-2.5.329V13.5a.5.5 0 0 1-1 0V3z" />
        ) : (
            <path fill={color} fillRule="evenodd" d="M2 3a.5.5 0 0 1 .276-.447C3.025 2.179 4.096 2 5.5 2c.901 0 1.485.135 2.658.526C9.235 2.885 9.735 3 10.5 3c1.263 0 2.192-.155 2.776-.447A.5.5 0 0 1 14 3v6.5a.5.5 0 0 1-.276.447c-.749.375-1.82.553-3.224.553-.901 0-1.485-.135-2.658-.526C6.765 9.615 6.265 9.5 5.5 9.5c-1.08 0-1.915.113-2.5.329V13.5a.5.5 0 0 1-1 0V3m1 5.779v-5.45C3.585 3.113 4.42 3 5.5 3c.765 0 1.265.115 2.342.474C9.015 3.865 9.599 4 10.5 4c1.002 0 1.834-.09 2.5-.279v5.45c-.585.216-1.42.329-2.5.329-.765 0-1.265-.115-2.342-.474C6.985 8.635 6.401 8.5 5.5 8.5c-1.001 0-1.834.09-2.5.279" clipRule="evenodd" />
        )}
    </svg>
);
const TodayIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
        <path d="M8 10h8"></path>
        <path d="M12 14h0"></path>
    </svg>
);
const InboxIcon = (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
        <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
    </svg>
);
const TomorrowIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path>
    </svg>
);
const WeekendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2"></rect>
        <path d="M7 6V4M17 6V4M3 10h18"></path>
    </svg>
);
const NextWeekIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 5v4l3 3"></path>
        <circle cx="12" cy="12" r="9"></circle>
    </svg>
);
const LabelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path fill="currentColor" fillRule="evenodd" d="M7.828 2H12a2 2 0 0 1 2 2v4.172a2 2 0 0 1-.586 1.414l-4 4a2 2 0 0 1-2.828 0L2.414 9.414a2 2 0 0 1 0-2.828l4-4A2 2 0 0 1 7.828 2m0 1a1 1 0 0 0-.707.293l-4 4a1 1 0 0 0 0 1.414l4.172 4.172a1 1 0 0 0 1.414 0l4-4A1 1 0 0 0 13 8.172V4a1 1 0 0 0-1-1zM10 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clipRule="evenodd"></path>
    </svg>
);
const TimeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const RepeatIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>;
const ArrowDownIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 10l5 5 5-5H7z" /></svg>;
const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
const SoundWaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M15 15.985v-11c0-.517-.166-.815-.332-.98a.94.94 0 0 0-.668-.27.94.94 0 0 0-.668.27c-.166.165-.332.463-.332.98v14c0 .996-.328 1.835-.914 2.428a2.9 2.9 0 0 1-2.097.854C8.435 22.25 7 21.027 7 18.985v-9c0-.517-.166-.815-.332-.98A.94.94 0 0 0 6 8.735a.94.94 0 0 0-.668.27c-.166.165-.332.463-.332.98v5a1 1 0 1 1-2 0v-5c0-.983.334-1.81.918-2.395A2.94 2.94 0 0 1 6 6.735c.747 0 1.507.28 2.082.855.584.585.918 1.412.918 2.395v9c0 .959.565 1.278 1.01 1.283a.9.9 0 0 0 .654-.262c.164-.166.336-.474.336-1.021v-14c0-.983.334-1.81.918-2.395A2.94 2.94 0 0 1 14 1.735c.747 0 1.507.28 2.082.855.584.585.918 1.412.918 2.395v11c0 .517.166.815.332.98a.94.94 0 0 0 .668.27.94.94 0 0 0 .668-.27c.166-.165.332-.463.332-.98v-4a1 1 0 1 1 2 0v4c0 .983-.334 1.81-.918 2.395a2.94 2.94 0 0 1-2.082.855c-.747 0-1.507-.28-2.082-.855-.584-.585-.918-1.412-.918-2.395"></path></svg>
);

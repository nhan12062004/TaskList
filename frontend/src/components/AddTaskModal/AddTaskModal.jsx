import React, { useState, useMemo, useRef, useEffect } from "react";
import "./AddTaskModal.css";
import { useAuth } from "../../contexts/AuthContext.jsx";
import SpeechToText from "../SpeechToText/SpeechToText.jsx";

export default function AddTaskModal({ isOpen, onClose, onAddTask, initialTitle = "", initialDate = null }) {
  const { user } = useAuth();
  const displayName = user?.name || user?.email || "User";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(4);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [labelSearch, setLabelSearch] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const lastAutoTitleRef = useRef("");
  const [stickyMonth, setStickyMonth] = useState(null);
  const [isSTTOpen, setIsSTTOpen] = useState(false);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); // null means Inbox
  const [inboxProject, setInboxProject] = useState(null); // Store inbox project
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

  // Fetch inbox project when modal opens
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
    if (isOpen && !inboxProject) {
      fetchInboxProject();
    }
  }, [isOpen, inboxProject]);

  // --- LOGIC THỜI GIAN ---
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // This weekend (Thứ 7 gần nhất phía trước)
  const thisWeekend = new Date(today);
  thisWeekend.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));

  // Next week (Thứ 2 tuần sau)
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));

  // viewDate dùng để xác định tháng đầu tiên hiển thị trong danh sách cuộn
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

  // Tạo danh sách 6 tháng từ viewDate
  const monthsToDisplay = useMemo(() => {
    const months = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthName = date.toLocaleString('en-US', { month: 'short' });

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Thứ 2 bắt đầu

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

    // Check if it's Today
    if (dateStr === today.toDateString()) {
      return "Today";
    }

    // Check if it's Tomorrow
    if (dateStr === tomorrow.toDateString()) {
      return "Tomorrow";
    }

    // Check if it's within the next 7 days - show weekday
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    if (date > tomorrow && date <= sevenDaysLater) {
      return date.toLocaleDateString('en-US', { weekday: 'long' }); // "Wednesday", "Thursday", etc.
    }

    // Default: show date format for dates beyond 7 days
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const isTodaySelected = selectedDate && selectedDate.toDateString() === today.toDateString();
  const isTomorrowSelected =
    selectedDate && selectedDate.toDateString() === tomorrow.toDateString();
  const isNextSevenSelected =
    selectedDate &&
    selectedDate > tomorrow &&
    selectedDate <= new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  const startOfWeek = useMemo(() => {
    const start = new Date(today);
    const dayIndex = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - dayIndex);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [today]);
  const dateInputValue = selectedDate
    ? selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";

  const titleInputRef = useRef(null);
  const datepickerRef = useRef(null);
  const priorityPickerRef = useRef(null);
  const labelPickerRef = useRef(null);
  const editorRef = useRef(null);

  // Flip position states for popups
  const [datePickerFlip, setDatePickerFlip] = useState(false);
  const [priorityPickerFlip, setPriorityPickerFlip] = useState(false);
  const [labelPickerFlip, setLabelPickerFlip] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTitle) {
        setTitle(initialTitle);
        if (editorRef.current) {
          editorRef.current.textContent = initialTitle;
        }
      }

      if (editorRef.current) {
        setTimeout(() => {
          editorRef.current.focus();
          // If there's initial title, move cursor to end
          if (initialTitle) {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }, 50);
      }
    } else {
      // Reset when closed
      if (!isClosing) {
        setTitle("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        setSelectedDate(null);
        setPriority(4);
        setSelectedLabels([]);
        setSelectedProject(null);
      }
    }
  }, [isOpen, initialTitle]);

  const insertChip = (type, value, text, prefix = "") => {
    if (!editorRef.current) return;

    // Check if chip already exists for single-value types
    if (type === 'date' || type === 'priority' || type === 'project') {
      const existing = editorRef.current.querySelector(`.chip-item[data-type="${type}"]`);
      if (existing) {
        // Also remove any trailing space after the chip (both regular and non-breaking)
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

    // Add click handler to remove chip
    span.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Reset corresponding state
      if (type === 'date') {
        setSelectedDate(null);
      } else if (type === 'priority') {
        setPriority(4);
      } else if (type === 'label') {
        // Remove this label from selectedLabels
        setSelectedLabels(prev => prev.filter(l => l !== value));
      } else if (type === 'project') {
        setSelectedProject(null);
      }

      // Remove the chip and trailing space
      const next = span.nextSibling;
      if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
        next.remove();
      }
      span.remove();
    };

    // Create inner structure
    // Prefix (icon or text)
    if (prefix) {
      const p = document.createElement('span');
      p.className = 'prefix';
      p.textContent = prefix;
      span.appendChild(p);
    }

    // Text value
    const t = document.createTextNode(text);
    span.appendChild(t);

    // Close button - Removed as per request
    // const close = document.createElement('span');
    // ...

    // Insert at cursor or append
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Ensure range is inside editor
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        range.insertNode(span);
        range.collapse(false);
        // Add a space after the chip so user can click and type next to it
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

    // Sync Date
    const dateChip = editorRef.current.querySelector('.chip-item[data-type="date"]');
    if (dateChip) {
      // We don't easily parse date back from text, relying on state being single source of truth for value?
      // Actually, we must rely on Chip presence.
      // If we re-select date, we update chip.
      // If user deletes chip, we must know.
      // The issue is parsing "Today" back to Date object.
      // It's better to NOT update `selectedDate` from DOM to NULL unless we are sure.
      // But if user deletes the chip, `selectedDate` should become null.
    } else {
      if (selectedDate) setSelectedDate(null);
    }

    // Sync Priority
    const priChip = editorRef.current.querySelector('.chip-item[data-type="priority"]');
    if (priChip) {
      // setPriority(parseInt(priChip.dataset.value));
    } else {
      if (priority !== 4) setPriority(4);
    }

    // Sync Labels
    const labelChips = editorRef.current.querySelectorAll('.chip-item[data-type="label"]');
    const labels = Array.from(labelChips).map(c => c.dataset.value);
    // Only update if different to avoid loop
    if (JSON.stringify(labels) !== JSON.stringify(selectedLabels)) {
      setSelectedLabels(labels);
    }
  };

  // Override handlers to use insertChip
  const handleDateSelectOverride = (date) => {
    setSelectedDate(date);
    // Use date format for title chip (e.g., "20 Jan"), not friendly label
    const dateFormatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    insertChip('date', date.toISOString(), dateFormatted, '');
    // Keep popup open - only close when clicking outside
  };

  useEffect(() => {
    if (isOpen && initialDate) {
      // Timeout to ensure editor is focused/ready
      setTimeout(() => {
        handleDateSelectOverride(initialDate);
      }, 60);
    }
  }, [isOpen, initialDate]);

  const handlePrioritySelectOverride = (p) => {
    setPriority(p);
    if (p < 4) {
      insertChip('priority', p, `P${p}`, ''); // No prefix icon
    } else {
      // P4 is default - remove any existing priority chip from title editor
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
      // Remove
      const existing = Array.from(editorRef.current.querySelectorAll(`.chip-item[data-type="label"]`))
        .find(el => el.dataset.value === label);
      if (existing) {
        // Also remove trailing space after the chip
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
      // Insert chip for project (not Inbox)
      insertChip('project', proj.id, proj.name, '#');
    } else {
      // Inbox -> Remove chip if exists
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

  // Labels state
  const [availableLabels, setAvailableLabels] = useState([]);

  // Fetch labels from backend
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


  // --- LOGIC SEARCH DATE ---
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

    // Try parsing date
    try {
      // Append current year if not present for better parsing
      const currentYear = new Date().getFullYear();
      let dateToParse = val;
      if (!/\d{4}/.test(val)) {
        dateToParse = `${val} ${currentYear}`;
      }

      const timestamp = Date.parse(dateToParse);
      if (!isNaN(timestamp)) {
        const newDate = new Date(timestamp);
        // Ensure it's not an invalid date object
        if (newDate instanceof Date && !isNaN(newDate)) {
          // Only update if it's a valid day/month (sanity check not strictly needed if parse worked)
          setSelectedDate(newDate);
        }
      }
    } catch (err) {
      // Ignore parse errors
    }
  };

  useEffect(() => {
    // If date has changed
    if (dateInputValue !== lastAutoTitleRef.current) {
      // If title is empty/cleared OR was previously an auto-title, update it
      if (!title || title === lastAutoTitleRef.current) {
        setTitle(dateInputValue);
      }
      lastAutoTitleRef.current = dateInputValue;
    }
    // Even if date hasn't changed (e.g. initial load or refocus), 
    // if title is empty and we have a date, set it.
    else if (dateInputValue && !title && lastAutoTitleRef.current === dateInputValue) {
      // This handles the case where user cleared it manually, then re-opens or re-selects same date?
      // Actually, user wants "hien lai". If I clear it, then pick a date (even same date), it should show.
      // But picking same date doesn't trigger change.
      // Let's allow empty title to be populated if a date is selected.
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
        setProjects(prev => [...prev, newProject]);
        // setSelectedProject(newProject); // Changed to use override
        handleProjectSelectOverride(newProject);
        // setShowProjectPicker(false); // Handled by override
      } else {
        console.error("Failed to create project");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSTTTranscript = (transcript) => {
    if (!editorRef.current) return;

    // Clear existing text but keep chips if we want? 
    // Or append? Let's append if there's text, otherwise set.
    const currentText = editorRef.current.textContent.trim();
    if (currentText) {
      editorRef.current.appendChild(document.createTextNode(' ' + transcript));
    } else {
      editorRef.current.appendChild(document.createTextNode(transcript));
    }

    // Update title state
    setTitle(editorRef.current.textContent);

    // Focus back
    setTimeout(() => {
      editorRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }, 100);
  };

  const closeWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150); // Match animation duration
  };

  const handleAttemptClose = () => {
    if (title.trim() || description.trim()) {
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
      // Clone to manipulate
      const clone = editorRef.current.cloneNode(true);
      // Remove chips to get pure text. 
      // Or should we keep them? 
      // If I write "Buy milk", add Date chip, then "and eggs".
      // Title displayed: "Buy milk [Today] and eggs".
      // Backend fields: title="Buy milk  and eggs", due_date=Today.
      // This seems correct for structured data.
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
        priority: priority === 4 ? 4 : priority, // 4 is default
        due_date: selectedDate ? (() => {
          const year = selectedDate.getFullYear();
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const day = String(selectedDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : null,
        labels: selectedLabels,
        project_id: selectedProject ? selectedProject.id : (inboxProject ? inboxProject.id : null) // Use inbox project if no selection
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Success
        // Reset and close
        setTitle("");
        setDescription("");
        setSelectedDate(null);
        setPriority(4);
        setSelectedLabels([]);
        if (editorRef.current) editorRef.current.innerHTML = "";
        onClose();
        // Trigger refresh if needed (passed via props?)
        if (onAddTask) onAddTask(); // Assuming prop name
        else window.location.reload(); // Fallback if no prop
      } else {
        const err = await res.text();
        alert("Failed to add task: " + err);
      }

    } catch (e) {
      console.error(e);
      alert("Error adding task");
    }
  };
  const handleCreateLabel = async (e) => {
    e.preventDefault(); // Use preventDefault with onMouseDown to prevent focus loss if any
    e.stopPropagation();
    console.log("Create Label Clicked:", labelSearch);

    if (!labelSearch.trim()) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No login token found!");
        return;
      }

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
        // alert("Label created!");
      } else {
        console.error("Failed to create label: Status", res.status);
        const errText = await res.text();
        alert(`Failed to create label: ${res.status} ${errText}`);
      }
    } catch (err) {
      console.error("Failed to create label", err);
      alert("Error connecting to server.");
    }
  };

  // Helper function to check if popup should flip to top
  const checkShouldFlip = (buttonRef, popupHeight) => {
    if (!buttonRef.current) return false;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    return spaceBelow < popupHeight + 20; // 20px margin
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

  if (!isOpen) return null;

  return (
    <div
      className="atm-overlay"
      onClick={() => {
        if (showDatePicker) {
          setShowDatePicker(false);
          return;
        }
        if (showPriorityPicker) {
          setShowPriorityPicker(false);
          return;
        }
        if (showLabelPicker) {
          setShowLabelPicker(false);
          return;
        }
        if (showProjectPicker) {
          setShowProjectPicker(false);
          return;
        }
        handleAttemptClose();
      }}
    >
      <div
        className={`atm-container ${isClosing ? 'closing' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
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
        }}
      >
        <div className="atm-main-content">
          <div className="atm-title-inline">
            <div
              ref={editorRef}
              className="atm-content-editable"
              contentEditable
              onInput={() => {
                const text = editorRef.current.textContent;
                setTitle(text);

                // If effectively empty (e.g. only <br>), clear it so :empty works
                if (!text.trim() && !editorRef.current.querySelector('.chip-item')) {
                  editorRef.current.innerHTML = "";
                }

                // Check if any chips were deleted and update state
                if (editorRef.current) {
                  // Check date chip
                  if (!editorRef.current.querySelector('.chip-item[data-type="date"]')) {
                    if (selectedDate) setSelectedDate(null);
                  }
                  // Check priority chip
                  if (!editorRef.current.querySelector('.chip-item[data-type="priority"]')) {
                    if (priority !== 4) setPriority(4);
                  }
                  // Check label chips
                  const existingLabelChips = editorRef.current.querySelectorAll('.chip-item[data-type="label"]');
                  const existingLabelValues = Array.from(existingLabelChips).map(c => c.dataset.value);
                  if (existingLabelValues.length !== selectedLabels.length ||
                    !selectedLabels.every(l => existingLabelValues.includes(l))) {
                    setSelectedLabels(existingLabelValues);
                  }

                  // Check project chip
                  if (!editorRef.current.querySelector('.chip-item[data-type="project"]')) {
                    if (selectedProject) setSelectedProject(null);
                  }
                }
              }}
              placeholder="Task name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // handleAddTask(); 
                }
              }}
            ></div>
            <button
              type="button"
              className="atm-title-voice-btn"
              aria-label="Voice input"
              onClick={() => setIsSTTOpen(true)}
            >
              <SoundWaveIcon />
            </button>
          </div>

          <input
            type="text"
            className="atm-input-desc"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
          />

          <div className="atm-actions-row">
            <div className="atm-datepicker-wrapper" ref={datepickerRef}>
              <button
                type="button"
                className={`atm-tag-btn ${showDatePicker ? 'active' : ''} ${isTodaySelected ? 'is-today' : ''} ${isTomorrowSelected ? 'is-tomorrow' : ''} ${isNextSevenSelected ? 'is-next-seven' : ''}`}
                onClick={handleOpenDatePicker}
              >
                <span className="atm-tag-icon"><CalendarIcon /></span>
                {formatDateLabel(selectedDate)}
                {selectedDate && (
                  <button
                    type="button"
                    className="atm-tag-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(null);
                      // Also remove date chip from title editor
                      if (editorRef.current) {
                        const dateChip = editorRef.current.querySelector('.chip-item[data-type="date"]');
                        if (dateChip) {
                          const next = dateChip.nextSibling;
                          if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                            next.remove();
                          }
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
                <div className={`atm-datepicker-popover ${datePickerFlip ? 'flip' : ''}`}>
                  <div className="atm-dp-search">
                    <input
                      type="text"
                      placeholder="Type a date"
                      value={searchText}
                      onChange={handleSearchChange}
                      autoFocus
                    />
                  </div>

                  <div className="atm-dp-list">
                    {/* TODAY */}
                    <div className="atm-dp-item" onClick={() => { handleDateSelectOverride(today); setShowDatePicker(false); }}>
                      <span className="atm-dp-left">
                        <span className="atm-dp-ico green"><TodayIcon /></span>
                        <span className="atm-dp-label">Today</span>
                      </span>
                      <span className="atm-dp-sub right">{today.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>

                    {/* TOMORROW */}
                    <div className="atm-dp-item" onClick={() => { handleDateSelectOverride(tomorrow); setShowDatePicker(false); }}>
                      <span className="atm-dp-left">
                        <span className="atm-dp-ico orange"><TomorrowIcon /></span>
                        <span className="atm-dp-label">Tomorrow</span>
                      </span>
                      <span className="atm-dp-sub right">{tomorrow.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>

                    {/* THIS WEEKEND */}
                    <div className="atm-dp-item" onClick={() => { handleDateSelectOverride(thisWeekend); setShowDatePicker(false); }}>
                      <span className="atm-dp-left">
                        <span className="atm-dp-ico blue"><WeekendIcon /></span>
                        <span className="atm-dp-label">This weekend</span>
                      </span>
                      <span className="atm-dp-sub right">{thisWeekend.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>

                    {/* NEXT WEEK */}
                    <div className="atm-dp-item" onClick={() => { handleDateSelectOverride(nextWeek); setShowDatePicker(false); }}>
                      <span className="atm-dp-left">
                        <span className="atm-dp-ico purple"><NextWeekIcon /></span>
                        <span className="atm-dp-label">Next week</span>
                      </span>
                      <span className="atm-dp-sub right">{nextWeek.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="atm-dp-fixed">
                    <div className="atm-dp-month-header">
                      <span className="atm-dp-month-title">
                        {stickyMonth
                          ? `${stickyMonth.monthName} ${stickyMonth.year}`
                          : `${viewDate.toLocaleString('en-US', { month: 'short' })} ${viewDate.getFullYear()}`}
                      </span>
                      <div className="atm-dp-nav">
                        <button
                          type="button"
                          className={`nav-btn ${isAtCurrentMonth ? 'disabled' : ''}`}
                          onClick={handlePrevMonth}
                        >‹</button>
                        <button type="button" className="nav-btn dot" onClick={handleGoToday}>○</button>
                        <button type="button" className="nav-btn" onClick={handleNextMonth}>›</button>
                      </div>
                    </div>
                    <div className="atm-dp-weekdays"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
                  </div>

                  <div className="atm-dp-scroll-area" ref={scrollAreaRef} onScroll={handleCalendarScroll}>
                    {monthsToDisplay.map((m, idx) => (
                      <div
                        key={m.id}
                        className="atm-dp-month-block"
                        ref={(el) => {
                          monthBlockRefs.current[idx] = el;
                        }}
                      >
                        {idx > 0 && (
                          <div className="atm-dp-month-divider">
                            <span className="atm-dp-month-divider-label">
                              {m.monthName}{m.year !== new Date().getFullYear() ? ` ${m.year}` : ""}
                            </span>
                            <span className="atm-dp-month-divider-line" />
                          </div>
                        )}
                        <div className="atm-dp-days-grid">
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
                            if (!date) return <div key={i} className="atm-dp-day empty"></div>;
                            const isToday = date.toDateString() === today.toDateString();
                            const isSelected =
                              selectedDate && date.toDateString() === selectedDate.toDateString();
                            const isPast = date < today && !isToday;

                            return (
                              <div
                                key={i}
                                className={`atm-dp-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
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

                  <div className="atm-dp-footer">
                    <button type="button"><TimeIcon /> Time</button>
                    <button type="button"><RepeatIcon /> Repeat</button>
                  </div>
                </div>
              )}
            </div>

            <div className="atm-priority-wrapper" ref={priorityPickerRef}>
              <button
                type="button"
                className={`atm-tag-btn ${showPriorityPicker ? 'active' : ''} ${priority < 4 ? `p${priority}` : ''}`}
                onClick={handleOpenPriorityPicker}
              >
                <span className="atm-tag-icon">
                  <PriorityIcon className={priority < 4 ? `icon-p${priority}` : ''} filled={priority < 4} />
                </span>
                {priority === 4 ? "Priority" : `P${priority}`}
                {priority !== 4 && (
                  <button
                    type="button"
                    className="atm-tag-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPriority(4);
                      // Also remove priority chip from title editor
                      if (editorRef.current) {
                        const priorityChip = editorRef.current.querySelector('.chip-item[data-type="priority"]');
                        if (priorityChip) {
                          const next = priorityChip.nextSibling;
                          if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                            next.remove();
                          }
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
                <div className={`atm-priority-popover ${priorityPickerFlip ? 'flip' : ''}`}>
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
                        className="atm-p-item"
                        onClick={() => handlePrioritySelectOverride(p)}
                      >
                        <span className="atm-p-left">
                          <span className={`atm-p-flag p${p}`}>
                            <PriorityIcon filled={p < 4} color={priorityColors[p]} />
                          </span>
                          <span className="atm-p-label">Priority {p}</span>
                        </span>
                        {priority === p && <span className="atm-p-check">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="atm-label-wrapper" ref={labelPickerRef}>
              {/* First label button - only show when at least 1 label selected */}
              {selectedLabels.length > 0 && (
                <button
                  type="button"
                  className={`atm-tag-btn has-labels ${showLabelPicker ? 'active' : ''}`}
                  onClick={handleOpenLabelPicker}
                >
                  <span className="atm-tag-icon"><LabelIcon /></span>
                  {selectedLabels[0]}
                  <button
                    type="button"
                    className="atm-tag-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Remove only the first label
                      const labelToRemove = selectedLabels[0];
                      setSelectedLabels(prev => prev.slice(1));
                      // Sync DOM
                      if (editorRef.current) {
                        const chip = editorRef.current.querySelector(`.chip-item[data-type="label"][data-value="${labelToRemove}"]`);
                        if (chip) {
                          // Also remove trailing space if exists
                          const next = chip.nextSibling;
                          if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                            next.remove();
                          }
                          chip.remove();
                        }
                      }
                    }}
                  >
                    ×
                  </button>
                </button>
              )}

              {/* Count badge - only show when 2+ labels selected */}
              {selectedLabels.length > 1 && (
                <button
                  type="button"
                  className="atm-tag-btn atm-label-count"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Clear all labels when clicking the count
                    setSelectedLabels([]);
                    // Sync DOM
                    if (editorRef.current) {
                      const chips = editorRef.current.querySelectorAll('.chip-item[data-type="label"]');
                      chips.forEach(chip => {
                        const next = chip.nextSibling;
                        if (next && next.nodeType === Node.TEXT_NODE && (next.textContent === ' ' || next.textContent === '\u00A0')) {
                          next.remove();
                        }
                        chip.remove();
                      });
                    }
                  }}
                >
                  <span className="atm-tag-icon"><LabelIcon /></span>
                  {selectedLabels.length - 1}
                  <span className="atm-tag-clear">×</span>
                </button>
              )}

              {/* Default Labels button - only show when no labels selected */}
              {selectedLabels.length === 0 && (
                <button
                  type="button"
                  className={`atm-tag-btn ${showLabelPicker ? 'active' : ''}`}
                  onClick={handleOpenLabelPicker}
                >
                  <span className="atm-tag-icon"><LabelIcon /></span>
                  Labels
                </button>
              )}

              {showLabelPicker && (
                <div className={`atm-label-popover ${labelPickerFlip ? 'flip' : ''}`}>
                  <input
                    type="text"
                    className="atm-label-search"
                    placeholder="Type a label"
                    value={labelSearch}
                    onChange={(e) => setLabelSearch(e.target.value)}
                    autoFocus
                    autoComplete="off"
                  />
                  <div className="atm-label-list">
                    {filteredLabels.map(label => {
                      const isSelected = selectedLabels.includes(label);
                      return (
                        <div
                          key={label}
                          className="atm-label-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLabelSelectOverride(label);
                          }}
                        >
                          <span className="atm-label-left">
                            <LabelIcon />
                            <span className="atm-label-text">{label}</span>
                          </span>
                          <div className={`atm-checkbox ${isSelected ? 'checked' : ''}`}>
                            {isSelected && <CheckIcon />}
                          </div>
                        </div>
                      );
                    })}
                    {filteredLabels.length === 0 && labelSearch.trim() !== "" && (
                      <>
                        <div className="atm-label-empty">Label not found</div>
                        <div
                          className="atm-label-create"
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

        <div className="atm-footer">
          <div className={`atm-project ${showProjectPicker ? 'active' : ''}`} onClick={() => { setShowProjectPicker(!showProjectPicker); setTimeout(() => document.getElementById('project-search-input')?.focus(), 50); }} ref={projectPickerRef}>
            {selectedProject ? (
              <span style={{ color: selectedProject.color || '#808080', marginRight: 6, fontSize: 16 }}>#</span>
            ) : (
              <InboxIcon />
            )}
            <span className="atm-project-name">{selectedProject ? selectedProject.name : "Inbox"}</span>{" "}
            <ArrowDownIcon />

            {showProjectPicker && (
              <div className="atm-project-popover" onClick={(e) => e.stopPropagation()}>
                <div className="atm-project-search-wrapper">
                  <input
                    id="project-search-input"
                    type="text"
                    className="atm-project-search"
                    placeholder="Type a project name"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="atm-project-list">
                  {/* Inbox always shown unless filtered out? Usually Inbox matches "Inbox" search or is always visible. 
                        Let's show it if search matches "Inbox" or search is empty. */}
                  {("Inbox".toLowerCase().includes(projectSearch.toLowerCase()) || !projectSearch) && (
                    <div
                      className={`atm-project-item ${!selectedProject ? 'is-selected' : ''}`}
                      onClick={() => handleProjectSelectOverride(null)}
                    >
                      <span className="atm-p-left">
                        <InboxIcon />
                        <span className="atm-p-label">Inbox</span>
                      </span>
                      {!selectedProject && <CheckIcon />}
                    </div>
                  )}



                  {!projectSearch && (
                    <div className="atm-project-group-header">
                      <div className="avatar" style={{ width: 24, height: 24, fontSize: 12 }}>
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <span className="avatar-text" style={{ fontWeight: 600, color: '#3a3a3a' }}>{initial}</span>
                        )}
                      </div>
                      <span className="atm-p-group-title">My Projects</span>
                    </div>
                  )}

                  {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(proj => (
                    <div
                      key={proj.id}
                      className={`atm-project-item ${selectedProject?.id === proj.id ? 'is-selected' : ''} ${!projectSearch ? 'is-child-project' : ''}`}
                      onClick={() => handleProjectSelectOverride(proj)}
                    >
                      <span className="atm-p-left">
                        <span style={{ color: proj.color || '#808080', marginRight: 8, fontSize: 16 }}>#</span>
                        <span className="atm-p-label">{proj.name}</span>
                      </span>
                      {selectedProject?.id === proj.id && <CheckIcon />}
                    </div>
                  ))}

                  {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 &&
                    ! "Inbox".toLowerCase().includes(projectSearch.toLowerCase()) && (
                      <>
                        <div className="atm-project-empty">Project not found</div>
                        <div className="atm-project-create" onMouseDown={(e) => { e.stopPropagation(); handleCreateProject(); }}>
                          <span className="plus-icon">+</span> Create "{projectSearch}"
                        </div>
                      </>
                    )}
                </div>
              </div>
            )}
          </div>
          <div className="atm-btns">
            <button type="button" className="atm-btn-cancel" onClick={handleAttemptClose}>Cancel</button>
            <button
              type="button"
              className={`atm-btn-add ${title.trim() ? "is-active" : ""}`}
              onClick={handleAddTask}
            >
              Add task
            </button>
          </div>
        </div>

        {showDiscardConfirm && (
          <div
            className="atm-confirm-overlay"
            onClick={(e) => {
              e.stopPropagation();
              setShowDiscardConfirm(false);
            }}
          >
            <div className="atm-confirm-box" onClick={(e) => e.stopPropagation()}>
              <h3 className="atm-confirm-title">Discard unsaved changes?</h3>
              <p className="atm-confirm-text">Your unsaved changes will be discarded.</p>
              <div className="atm-confirm-actions">
                <button
                  className="atm-confirm-btn-cancel"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="atm-confirm-btn-discard"
                  onClick={handleDiscard}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
const InboxIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
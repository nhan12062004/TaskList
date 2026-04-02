import React, { useState, useEffect, useRef } from "react";
import "./Upcoming.css";
import TaskDetailModal from "../../components/TaskDetailModal/TaskDetailModal.jsx";
import AddTaskInline from "../../components/AddTaskInline/AddTaskInline.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function Upcoming({ title, onAddTaskClick, refreshTrigger, onRefresh }) {
  const { logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [focusCommentOnOpen, setFocusCommentOnOpen] = useState(false);
  const [addingTaskForDate, setAddingTaskForDate] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const listRef = useRef(null);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tasks", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error("Upcoming: Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  function getISOString(date) {
    return date.toISOString().split('T')[0];
  }

  const goPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => {
    const now = new Date();
    setWeekStart(getStartOfWeek(now));
    setSelectedDate(now);
    scrollToDate(getISOString(now));
  };

  const scrollToDate = (dateIso) => {
    const el = document.getElementById(`group-${dateIso}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    scrollToDate(getISOString(date));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthLabel = weekStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysToShow = Array.from({ length: 28 }, (_, i) => addDays(weekStart, i))
    .filter(d => d >= today);

  const tasksByDate = {};
  tasks.forEach(task => {
    if (task.due_date) {
      const d = new Date(task.due_date);
      const key = getISOString(d);
      if (!tasksByDate[key]) tasksByDate[key] = [];
      tasksByDate[key].push(task);
    }
  });

  const handleTaskComplete = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (onRefresh) onRefresh();
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/tasks/${taskId}/close`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (error) {
      console.error(error);
      fetchTasks();
    }
  };

  const handleAddSuccess = () => {
    fetchTasks();
    if (onRefresh) onRefresh();
  };

  const handleTaskClick = (e, task) => {
    if (e.target.closest('.task-checkbox') || e.target.closest('.task-action-btn') || e.target.closest('.task-drag-handle')) {
      return;
    }

    // Fix: Don't open detail modal if we are currently editing inline
    if (editingTaskId === task.id) return;

    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const renderTaskItem = (task) => (
    <div key={task.id} className="task-item upcoming-task-item" onClick={(e) => handleTaskClick(e, task)}>
      {editingTaskId === task.id ? (
        <AddTaskInline
          initialTask={task}
          onCancel={() => setEditingTaskId(null)}
          onAdd={() => {
            setEditingTaskId(null);
            fetchTasks();
            if (onRefresh) onRefresh();
          }}
        />
      ) : (
        <>
          <div className="task-checkbox-wrapper">
            <button
              className={`task-checkbox priority-${task.priority}`}
              onClick={(e) => {
                e.stopPropagation();
                handleTaskComplete(task.id);
              }}
            >
              <CheckIcon />
            </button>
          </div>
          <div className="task-content">
            <div className="task-title">{task.title}</div>
            {task.description && <div className="task-desc">{task.description}</div>}
            <div className="task-meta">
              {task.labels && task.labels.map((label, idx) => (
                <span key={idx} className="task-label-tag">
                  <TagIcon />
                  {label.name}
                </span>
              ))}
            </div>
          </div>
          <div className="task-actions" style={{ marginLeft: '12px' }}>
            <button className="task-action-btn" title="Edit task" onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); }}>
              <EditIcon />
            </button>
            <button className="task-action-btn" title="Set due date">
              <CalendarIcon />
            </button>
            <button className="task-action-btn" title="Comment" onClick={(e) => {
              e.stopPropagation();
              if (editingTaskId === task.id) return;
              setFocusCommentOnOpen(true);
              setSelectedTask(task);
              setIsDetailModalOpen(true);
            }}>
              <CommentSmallIcon />
            </button>
            <button className="task-action-btn" title="More actions">
              <MoreHorizIcon />
            </button>
          </div>
          <div className="task-project-label">
            {task.project_name || "Inbox"}
            <ProjectIcon isInbox={task.project_name === "Inbox" || !task.project_name} />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="upcoming-container">
      {/* Display button positioned exactly like Today */}
      <div className="header-actions">
        <button className="header-action-btn display-btn">
          <span className="action-icon"><DisplayIcon /></span>
          <span className="action-label">Display</span>
        </button>
      </div>

      <header className="upcoming-header-top">
        <div className="header-row-1">
          <h1>{title}</h1>
        </div>

        <div className="header-row-2">
          <div className="month-picker">
            {monthLabel} <ChevronDownIcon />
          </div>
          <div className="week-nav">
            <button className="nav-btn" onClick={goPrevWeek}><ChevronLeftIcon /></button>
            <button className="nav-today-btn" onClick={goToday}>Today</button>
            <button className="nav-btn" onClick={goNextWeek}><ChevronRightIcon /></button>
          </div>
        </div>

        <div className="date-strip">
          {weekDays.map(date => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <div
                key={date.toString()}
                className={`date-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <span className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="day-number">{date.getDate()}</span>
              </div>
            );
          })}
        </div>
      </header>

      <div className="upcoming-body" ref={listRef}>
        {daysToShow.map(date => {
          const dateKey = getISOString(date);
          const dayTasks = tasksByDate[dateKey] || [];
          const isToday = isSameDay(date, new Date());

          let dateHeader = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

          let relative = "";
          if (isToday) relative = " · Today";
          else if (isSameDay(date, addDays(new Date(), 1))) relative = " · Tomorrow";
          else if (isSameDay(date, addDays(new Date(), -1))) relative = " · Yesterday";

          const headerText = `${dateHeader}${relative} · ${weekday}`;

          return (
            <div key={dateKey} id={`group-${dateKey}`} className="date-group">
              <div className={`date-group-header ${isToday ? 'is-today' : ''}`}>
                {headerText}
              </div>
              <div className="date-group-tasks">
                {dayTasks.map(renderTaskItem)}

                {addingTaskForDate === dateKey ? (
                  <AddTaskInline
                    onCancel={() => setAddingTaskForDate(null)}
                    onAdd={handleAddSuccess}
                    initialDate={date}
                    autoFocus={true}
                  />
                ) : (
                  <button className="add-task-btn-text" onClick={() => setAddingTaskForDate(dateKey)}>
                    <span className="plus-icon"><PlusIcon /></span>
                    Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        let currentScopeTasks = [];
        if (selectedTask && selectedTask.due_date) {
          const dateKey = getISOString(new Date(selectedTask.due_date));
          currentScopeTasks = tasksByDate[dateKey] || [];
        } else {
          currentScopeTasks = daysToShow.flatMap(date => tasksByDate[getISOString(date)] || []);
        }

        const currentTaskIndex = selectedTask ? currentScopeTasks.findIndex(t => t.id === selectedTask.id) : -1;
        return (
          <TaskDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setFocusCommentOnOpen(false);
            }}
            task={selectedTask}
            initialCommentFocus={focusCommentOnOpen}
            onUpdate={fetchTasks}
            onPrevTask={currentTaskIndex > 0 ? () => setSelectedTask(currentScopeTasks[currentTaskIndex - 1]) : null}
            onNextTask={currentTaskIndex >= 0 && currentTaskIndex < currentScopeTasks.length - 1 ? () => setSelectedTask(currentScopeTasks[currentTaskIndex + 1]) : null}
          />
        );
      })()}
    </div>
  );
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
);
const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 16 16">
    <path fill="currentColor" fillRule="evenodd" d="M7.828 2H12a2 2 0 0 1 2 2v4.172a2 2 0 0 1-.586 1.414l-4 4a2 2 0 0 1-2.828 0L2.414 9.414a2 2 0 0 1 0-2.828l4-4A2 2 0 0 1 7.828 2m0 1a1 1 0 0 0-.707.293l-4 4a1 1 0 0 0 0 1.414l4.172 4.172a1 1 0 0 0 1.414 0l4-4A1 1 0 0 0 13 8.172V4a1 1 0 0 0-1-1zM10 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clipRule="evenodd"></path>
  </svg>
);
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1V12M1 6.5H12" /></svg>
);
const DisplayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" fillRule="evenodd" d="M17.333 4.001A2.667 2.667 0 0 1 20 6.668v10.667A2.667 2.667 0 0 1 17.333 20H6.667A2.667 2.667 0 0 1 4 17.335V6.668A2.667 2.667 0 0 1 6.667 4zm-.083 1H6.75a1.75 1.75 0 0 0-1.745 1.62L5 6.75v10.5a1.75 1.75 0 0 0 1.62 1.745l.13.005h10.5a1.75 1.75 0 0 0 1.745-1.62l.005-.13v-10.5a1.75 1.75 0 0 0-1.62-1.745zm-.75 7c0-.276-.183-.5-.41-.5H7.91l-.074.008c-.191.043-.336.247-.336.492 0 .276.183.5.41.5h8.18l.074-.008c.191-.042.336-.246.336-.492m-.41 3.5c.227 0 .41.224.41.5 0 .246-.145.45-.336.492l-.073.008H7.909c-.226 0-.409-.224-.409-.5 0-.245.145-.45.336-.492l.073-.008zm.41-7.5c0-.276-.183-.5-.41-.5H7.91l-.074.008c-.191.043-.336.247-.336.492 0 .276.183.5.41.5h8.18l.074-.008c.191-.042.336-.246.336-.492" clipRule="evenodd"></path>
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
);
const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
);
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
);
const ProjectIcon = ({ isInbox }) => (
  isInbox ?
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
    </svg> :
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor">
      <path strokeWidth="1" d="M9 4l-2 16M17 4l-2 16M4 9h16M3 15h16"></path>
    </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" fillRule="evenodd" d="M15.204 5.373a1.5 1.5 0 0 1 2.121 0l1.302 1.302a1.5 1.5 0 0 1 0 2.122l-8.621 8.62a2.5 2.5 0 0 1-1.22.684l-2.185.547a.5.5 0 0 1-.61-.61l.547-2.184a2.5 2.5 0 0 1 .684-1.221zm1.06 1.06-8.62 8.621a1.5 1.5 0 0 0-.41.733l-.32 1.282 1.283-.32a1.5 1.5 0 0 0 .733-.41l8.62-8.622zM17.477 7.23 16.77 6.523l.707-.707 1.303 1.303-.707.707z" clipRule="evenodd"></path>
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path fill="currentColor" d="M12 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1m-1.25 7a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5m.75-5a.5.5 0 1 1 0 1h-7a.5.5 0 0 1 0-1z"></path>
  </svg>
);
const CommentSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-13.4 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>
);
const MoreHorizIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
);

import React, { useState, useEffect } from "react";
import "./Today.css";
import TaskDetailModal from "../../components/TaskDetailModal/TaskDetailModal.jsx";
import AddTaskInline from "../../components/AddTaskInline/AddTaskInline.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import todayEmptyStateImg from "../../assets/4e6216ee601268ce.png";

export default function Today({ title, onAddTaskClick, refreshTrigger, onRefresh }) {
    const { user, logout } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [focusCommentOnOpen, setFocusCommentOnOpen] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [dragOverTaskId, setDragOverTaskId] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/tasks", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            } else if (response.status === 401) {
                logout();
            }
        } catch (error) {
            console.error("Today: Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();

        const handleRefresh = () => fetchTasks();
        window.addEventListener('task-updated', handleRefresh);

        return () => window.removeEventListener('task-updated', handleRefresh);
    }, [refreshTrigger]);

    // Filter Helper
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        d.setHours(0, 0, 0, 0);
        return d < todayDate;
    });

    const todayTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        d.setHours(0, 0, 0, 0);
        return isSameDay(d, todayDate);
    });

    // --- Drag and Drop Logic (Inbox style) ---
    const handleDragStart = (e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
        setTimeout(() => {
            e.target.closest('.task-item')?.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.closest('.task-item')?.classList.remove('dragging');
        setDraggedTaskId(null);
        setDragOverTaskId(null);
    };

    const handleDragOver = (e, taskId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (taskId !== draggedTaskId) {
            setDragOverTaskId(taskId);
        }
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverTaskId(null);
        }
    };

    const handleDrop = async (e, targetTaskId) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedTaskId || draggedTaskId === targetTaskId) {
            setDragOverTaskId(null);
            return;
        }

        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        const targetTask = tasks.find(t => t.id === targetTaskId);

        if (!draggedTask || !targetTask) return;

        // Create new tasks array (local reorder for filtered lists only?)
        // Since Today/Overdue are derived state, we must update the main 'tasks' state locally to reflect reorder.
        // But reordering visually in "Today" might not mean changing sort_order if backend reorder logic depends on it.
        // For now, let's just update local 'tasks' array to reflect visual change and call backend to reorder.

        let newTasks = [...tasks];
        const draggedIndex = newTasks.findIndex(t => t.id === draggedTaskId);
        newTasks.splice(draggedIndex, 1);
        const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);
        newTasks.splice(targetIndex, 0, draggedTask);

        setTasks(newTasks);
        setDragOverTaskId(null);
        setDraggedTaskId(null);

        // Call reorder API
        try {
            const token = localStorage.getItem("token");
            const taskIds = newTasks.map(t => t.id);
            await fetch("/api/tasks/reorder", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ taskIds })
            });
        } catch (error) {
            console.error("Failed to reorder task", error);
            fetchTasks();
        }
    };


    const handleTaskComplete = async (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));

        if (onRefresh) onRefresh();

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/tasks/${taskId}/close`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to close task");
        } catch (error) {
            console.error("Failed to complete task", error);
            fetchTasks();
            if (onRefresh) onRefresh();
        }
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

    const handleAddSuccess = () => {
        fetchTasks();
        if (onRefresh) onRefresh();
    };

    const renderTaskItem = (task) => (
        <div
            key={task.id}
            className={`task-item ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, task.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, task.id)}
            onClick={(e) => handleTaskClick(e, task)}
        >
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
                    <div className="task-drag-handle">
                        <DragIcon />
                    </div>
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
                            {task.due_date && (
                                <span className={`task-date ${getDueDateClass(task.due_date)}`}>
                                    <CalendarSmallIcon />
                                    {formatDate(task.due_date)}
                                </span>
                            )}
                            {task.labels && task.labels.map((label, idx) => (
                                <span key={idx} className="task-label-tag">
                                    <TagIcon />
                                    {label.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="task-actions">
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
                    <div className="task-project">
                        {task.project_name || `Inbox`}
                        {(Number(task.project_is_inbox) === 1 || task.project_name === "Inbox" || !task.project_name) ? <InboxIcon /> : <ProjectHashIcon />}
                    </div>
                </>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="today-container">
                <header className="today-header">
                    <h1>{title}</h1>
                </header>
                <div style={{ padding: "0 20px", color: "#666" }}>Loading tasks...</div>
            </div>
        );
    }

    return (
        <div className="today-container">
            <header className="today-header">
                <h1>{title}</h1>
                <div className="header-actions">
                    <button className="header-action-btn display-btn">
                        <span className="action-icon"><DisplayIcon /></span>
                        <span className="action-label">Display</span>
                    </button>
                </div>
            </header>

            {/* Overdue section removed per user request to start fresh each day */
            /*
            {overdueTasks.length > 0 && (
                <div className="overdue-section">
                    <div className="section-overdue-header">Overdue</div>
                    <div className="task-list">
                        {overdueTasks.map(renderTaskItem)}
                    </div>
                </div>
            )}
            */}

            <div className="today-section">
                {/* {overdueTasks.length > 0 && <div className="section-overdue-header" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '5px', marginBottom: '10px' }}>Today</div>} */}

                <div className="task-list">
                    {/* Always show Add Task button or form at top if no tasks, or at bottom if tasks exist? 
                        User wants: "when no tasks, show add task button AND image like that".
                        In the image, "Add task" is at the TOP.
                        So let's put it at the top when empty.
                    */}

                    {/* Updated condition to strictly check todayTasks only */
                        (todayTasks.length === 0) ? (
                            <>
                                {/* Add Task Button at Top for Empty State */}
                                {isAddingTask ? (
                                    <AddTaskInline
                                        onCancel={() => setIsAddingTask(false)}
                                        onAdd={handleAddSuccess}
                                        initialDate={new Date()}
                                    />
                                ) : (
                                    <button className="add-task-btn-text" onClick={() => setIsAddingTask(true)}>
                                        <span className="plus-icon"><PlusIcon /></span>
                                        Add task
                                    </button>
                                )}

                                <div className="today-empty-state">
                                    <img
                                        src={todayEmptyStateImg}
                                        alt="All done"
                                        width="300"
                                        style={{ marginBottom: 20 }}
                                    />
                                    <h2>You're all done for the week, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || "User"}!</h2>
                                    <p style={{ maxWidth: 400, marginTop: 8 }}>
                                        Enjoy the rest of your day and don't forget to share your #TodoistZero awesomeness
                                        <br />↓
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {todayTasks.map(renderTaskItem)}

                                {isAddingTask ? (
                                    <AddTaskInline
                                        onCancel={() => setIsAddingTask(false)}
                                        onAdd={handleAddSuccess}
                                        initialDate={new Date()}
                                    />
                                ) : (
                                    <button className="add-task-btn-text" onClick={() => setIsAddingTask(true)}>
                                        <span className="plus-icon"><PlusIcon /></span>
                                        Add task
                                    </button>
                                )}
                            </>
                        )}
                </div>
            </div>

            {(() => {
                const currentTaskIndex = selectedTask ? todayTasks.findIndex(t => t.id === selectedTask.id) : -1;
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
                        onPrevTask={currentTaskIndex > 0 ? () => setSelectedTask(todayTasks[currentTaskIndex - 1]) : null}
                        onNextTask={currentTaskIndex >= 0 && currentTaskIndex < todayTasks.length - 1 ? () => setSelectedTask(todayTasks[currentTaskIndex + 1]) : null}
                    />
                );
            })()}
        </div>
    );
}

// Helpers
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";

    if (diffDays > 1 && diffDays <= 7) {
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return weekdays[new Date(dateString).getDay()];
    }

    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getDueDateClass(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "is-overdue";
    if (diffDays === 0) return "is-today";
    if (diffDays === 1) return "is-tomorrow";
    if (diffDays > 1 && diffDays <= 7) return "is-next-seven";

    return "";
}

// Icons (Reusable or Import from match)
const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
);

const CalendarSmallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 12 12">
        <path fill="currentColor" fillRule="evenodd" d="M9.5 1h-7A1.5 1.5 0 0 0 1 2.5v7A1.5 1.5 0 0 0 2.5 11h7A1.5 1.5 0 0 0 11 9.5v-7A1.5 1.5 0 0 0 9.5 1M2 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5zM8.75 8a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0M3.5 4a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z" clipRule="evenodd"></path>
    </svg>
);

const TagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 16 16">
        <path fill="currentColor" fillRule="evenodd" d="M7.828 2H12a2 2 0 0 1 2 2v4.172a2 2 0 0 1-.586 1.414l-4 4a2 2 0 0 1-2.828 0L2.414 9.414a2 2 0 0 1 0-2.828l4-4A2 2 0 0 1 7.828 2m0 1a1 1 0 0 0-.707.293l-4 4a1 1 0 0 0 0 1.414l4.172 4.172a1 1 0 0 0 1.414 0l4-4A1 1 0 0 0 13 8.172V4a1 1 0 0 0-1-1zM10 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clipRule="evenodd"></path>
    </svg>
);

const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dd4b39" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const DisplayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" fillRule="evenodd" d="M17.333 4.001A2.667 2.667 0 0 1 20 6.668v10.667A2.667 2.667 0 0 1 17.333 20H6.667A2.667 2.667 0 0 1 4 17.335V6.668A2.667 2.667 0 0 1 6.667 4zm-.083 1H6.75a1.75 1.75 0 0 0-1.745 1.62L5 6.75v10.5a1.75 1.75 0 0 0 1.62 1.745l.13.005h10.5a1.75 1.75 0 0 0 1.745-1.62l.005-.13v-10.5a1.75 1.75 0 0 0-1.62-1.745zm-.75 7c0-.276-.183-.5-.41-.5H7.91l-.074.008c-.191.043-.336.247-.336.492 0 .276.183.5.41.5h8.18l.074-.008c.191-.042.336-.246.336-.492m-.41 3.5c.227 0 .41.224.41.5 0 .246-.145.45-.336.492l-.073.008H7.909c-.226 0-.409-.224-.409-.5 0-.245.145-.45.336-.492l.073-.008zm.41-7.5c0-.276-.183-.5-.41-.5H7.91l-.074.008c-.191.043-.336.247-.336.492 0 .276.183.5.41.5h8.18l.074-.008c.191-.042.336-.246.336-.492" clipRule="evenodd"></path>
    </svg>
);

const EditIcon = () => (
    <svg width="24" height="24">
        <g fill="none" fillRule="evenodd">
            <path fill="currentColor" d="M9.5 19h10a.5.5 0 1 1 0 1h-10a.5.5 0 1 1 0-1"></path>
            <path stroke="currentColor" d="M4.42 16.03a1.5 1.5 0 0 0-.43.9l-.22 2.02a.5.5 0 0 0 .55.55l2.02-.21a1.5 1.5 0 0 0 .9-.44L18.7 7.4a1.5 1.5 0 0 0 0-2.12l-.7-.7a1.5 1.5 0 0 0-2.13 0L4.42 16.02z"></path>
        </g>
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" fillRule="evenodd" d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm12 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 8a.5.5 0 0 0 0 1h10a.5.5 0 0 0 0-1z" clipRule="evenodd"></path>
    </svg>
);

const CommentSmallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path fill="currentColor" fillRule="nonzero" d="M11.707 20.793A1 1 0 0 1 10 20.086V18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4.5l-2.793 2.793zM11 20.086L14.086 17H19a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6v3.086z"></path>
    </svg>
);

const MoreHorizIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinecap="round" transform="translate(3 10)">
            <circle cx="2" cy="2" r="2"></circle>
            <circle cx="9" cy="2" r="2"></circle>
            <circle cx="16" cy="2" r="2"></circle>
        </g>
    </svg>
);

const CommentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" fillRule="nonzero" d="M11.707 20.793A1 1 0 0 1 10 20.086V18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4.5l-2.793 2.793zM11 20.086L14.086 17H19a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6v3.086z"></path>
    </svg>
);

const MoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinecap="round" transform="translate(3 10)">
            <circle cx="2" cy="2" r="2"></circle>
            <circle cx="9" cy="2" r="2"></circle>
            <circle cx="16" cy="2" r="2"></circle>
        </g>
    </svg>
);

const DragIcon = () => (
    <svg width="24" height="24">
        <path fill="currentColor" d="M14.5 15.5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 14.5 15.5m-5 0a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 9.5 15.5m5-5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 14.5 10.5m-5 0a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 9.5 10.5m5-5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 14.5 5.5m-5 0a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 9.5 5.5"></path>
    </svg>
);

const InboxIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12" fill="currentColor">
        <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
    </svg>
);

const ProjectHashIcon = () => (
    <svg viewBox="0 0 24 24" width="12" height="12">
        <path fill="currentColor" stroke="currentColor" strokeWidth="1" d="M9 4l-2 16M17 4l-2 16M4 9h16M3 15h16"></path>
    </svg>
);

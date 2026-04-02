import React from "react";
import "./Inbox.css";
import inboxIllustration from "../../assets/f6defa2ca953237a.png";
import TaskDetailModal from "../../components/TaskDetailModal/TaskDetailModal.jsx";
import AddTaskInline from "../../components/AddTaskInline/AddTaskInline.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";


export default function Inbox({ title, onAddTaskClick, refreshTrigger, onRefresh }) {
  const { logout } = useAuth();
  const [tasks, setTasks] = React.useState([]);
  const [sections, setSections] = React.useState([]);
  const [inboxProjectId, setInboxProjectId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [draggedTaskId, setDraggedTaskId] = React.useState(null);
  const [dragOverTaskId, setDragOverTaskId] = React.useState(null);
  const [draggedSectionId, setDraggedSectionId] = React.useState(null);
  const [dragOverSectionId, setDragOverSectionId] = React.useState(null);
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [focusCommentOnOpen, setFocusCommentOnOpen] = React.useState(false);
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [addingSectionName, setAddingSectionName] = React.useState("");
  const [isAddingSection, setIsAddingSection] = React.useState(false);
  const [addingTaskInSection, setAddingTaskInSection] = React.useState(null); // section_id or null
  const [collapsedSections, setCollapsedSections] = React.useState([]); // array of collapsed section IDs
  const [editingTaskId, setEditingTaskId] = React.useState(null);

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Fetch inbox project ID
  const fetchInboxProject = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/projects/inbox", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInboxProjectId(data.id);
        return data.id;
      }
    } catch (error) {
      console.error("Failed to fetch inbox project", error);
    }
    return null;
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tasks?inbox=true", {
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
      console.error("Inbox: Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (projectId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sections?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSections(data);
      }
    } catch (error) {
      console.error("Failed to fetch sections", error);
    }
  };

  React.useEffect(() => {
    const init = async () => {
      const projId = await fetchInboxProject();
      if (projId) {
        await fetchSections(projId);
      }
      await fetchTasks();
    };
    init();
  }, [title, refreshTrigger]);

  // Drag and drop handlers
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    // Add dragging class after a small delay to avoid visual glitches
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
    // Only reset if leaving the task-item entirely
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

    // Determine if moving to a different section
    const newSectionId = targetTask.section_id;
    const isSectionChanged = draggedTask.section_id !== newSectionId;

    // Create new tasks array
    let newTasks = [...tasks];
    const draggedIndex = newTasks.findIndex(t => t.id === draggedTaskId);
    newTasks.splice(draggedIndex, 1); // Remove dragged task

    // Calculate target index (find where targetTask is now)
    const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);

    // Update dragged task section locally
    const updatedDraggedTask = { ...draggedTask, section_id: newSectionId };

    // Insert at new position
    newTasks.splice(targetIndex, 0, updatedDraggedTask);

    setTasks(newTasks);
    setDragOverTaskId(null);
    setDraggedTaskId(null);

    try {
      const token = localStorage.getItem("token");

      // 1. If section changed, update it first
      if (isSectionChanged) {
        await fetch(`/api/tasks/${draggedTaskId}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ section_id: newSectionId })
        });
      }

      // 2. Reorder
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
      console.error("Failed to move/reorder task", error);
      fetchTasks(); // Revert on error
    }
  };

  // Section Drag & Drop Handlers
  const handleSectionDragStart = (e, sectionId) => {
    setDraggedSectionId(sectionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", sectionId); // Required for Firefox and some browsers
  };

  const handleSectionDragOver = (e, sectionId) => {
    e.preventDefault();
    if (draggedSectionId && sectionId !== draggedSectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleSectionDrop = async (e, targetSectionId) => {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDragOverSectionId(null);
      return;
    }

    // Reorder sections locally
    const newSections = [...sections];
    const draggedIndex = newSections.findIndex(s => s.id === draggedSectionId);
    const targetIndex = newSections.findIndex(s => s.id === targetSectionId);

    const [draggedSection] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedSection);

    setSections(newSections);
    setDragOverSectionId(null);
    setDraggedSectionId(null);

    // Save to backend
    try {
      const token = localStorage.getItem("token");
      const sectionIds = newSections.map(s => s.id);
      await fetch("/api/sections/reorder", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sectionIds })
      });
    } catch (error) {
      console.error("Failed to reorder sections", error);
    }
  };

  // Handle dropping a TASK onto a SECTION Header (move to section)
  const handleTaskDropOnSection = async (e, targetSectionId) => {
    e.preventDefault();
    setDragOverSectionId(null);

    if (!draggedTaskId) return;

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    if (!draggedTask || draggedTask.section_id === targetSectionId) return;

    // Move logic: Append to end of tasks in that section
    let newTasks = tasks.filter(t => t.id !== draggedTaskId);

    // Update section_id
    const updatedTask = { ...draggedTask, section_id: targetSectionId };

    let insertIndex = -1;
    for (let i = newTasks.length - 1; i >= 0; i--) {
      if (newTasks[i].section_id === targetSectionId) {
        insertIndex = i + 1;
        break;
      }
    }

    if (insertIndex === -1) {
      newTasks.push(updatedTask);
    } else {
      newTasks.splice(insertIndex, 0, updatedTask);
    }

    setTasks(newTasks);
    setDraggedTaskId(null);

    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/tasks/${draggedTaskId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: targetSectionId })
      });
    } catch (e) {
      console.error(e);
      fetchTasks();
    }
  };

  const handleTaskComplete = async (taskId) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    if (onRefresh) onRefresh();

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${taskId}/close`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Failed to close task");
      }
    } catch (error) {
      console.error("Failed to complete task", error);
      fetchTasks(); // Revert on error
      if (onRefresh) onRefresh();
    }
  };

  const handleTaskClick = (e, task) => {
    // Prevent opening modal if clicking specific buttons
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

  const handleCreateSection = async () => {
    if (!addingSectionName.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: addingSectionName.trim(),
          project_id: inboxProjectId
        })
      });

      if (res.ok) {
        setAddingSectionName("");
        setIsAddingSection(false);
        if (inboxProjectId) {
          await fetchSections(inboxProjectId);
        }
      }
    } catch (error) {
      console.error("Failed to create section", error);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/sections/${sectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (inboxProjectId) {
        await fetchSections(inboxProjectId);
      }
      await fetchTasks();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to delete section", error);
    }
  };

  // Group tasks by section
  const tasksWithoutSection = tasks.filter(t => !t.section_id);
  const tasksBySection = sections.map(section => ({
    ...section,
    tasks: tasks.filter(t => t.section_id === section.id)
  }));

  if (loading) {
    return (
      <div className="inbox-container">
        <header className="inbox-header">
          <h1>{title}</h1>
        </header>
        <div style={{ padding: "0 35px", color: "#666" }}>Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="inbox-container">
      <header className="inbox-header">
        <h1>{title}</h1>
        <div className="header-actions">
          <button className="header-action-btn display-btn">
            <span className="action-icon"><DisplayIcon /></span>
            <span className="action-label">Display</span>
          </button>
          <button className="header-action-btn icon-only" aria-label="Comment">
            <CommentIcon />
          </button>
          <button className="header-action-btn icon-only" aria-label="More actions">
            <MoreIcon />
          </button>
        </div>
      </header>

      {tasks.length === 0 && sections.length === 0 && !isAddingTask ? (
        <div className="inbox-empty-state">
          <img
            src={inboxIllustration}
            alt="No tasks in inbox"
            className="empty-illustration"
          />
          <h2>Capture now, plan later</h2>
          <p>
            Inbox is your go-to spot for quick task<br />
            entry. Clear your mind now, organize<br />
            when you're ready.
          </p>
          <button className="add-task-btn-large" onClick={() => setIsAddingTask(true)}>
            <PlusIcon />
            <span>Add task</span>
          </button>
        </div>
      ) : (
        <div className="task-list">
          {/* Tasks without section */}
          {tasksWithoutSection.map(task => (
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
                    {(task.due_date || (task.labels && task.labels.length > 0)) && (
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
                    )}
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
                </>
              )}
            </div>
          ))}

          {/* Add task for no-section area */}
          {isAddingTask && !addingTaskInSection ? (
            <AddTaskInline
              onCancel={() => setIsAddingTask(false)}
              onAdd={handleAddSuccess}
            />
          ) : (
            <button className="add-task-btn-text" onClick={() => { setIsAddingTask(true); setAddingTaskInSection(null); }}>
              <span className="plus-icon"><PlusIcon /></span>
              Add task
            </button>
          )}

          {/* Add Section - divider style */}
          {isAddingSection === 'middle' ? (
            <div className="add-section-form">
              <input
                type="text"
                className="add-section-input"
                placeholder="Name this section"
                value={addingSectionName}
                onChange={(e) => setAddingSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSection();
                  if (e.key === "Escape") { setIsAddingSection(false); setAddingSectionName(""); }
                }}
                autoFocus
              />
              <div className="add-section-actions">
                <button
                  className={`add-section-submit ${!addingSectionName.trim() ? 'disabled' : ''}`}
                  onClick={handleCreateSection}
                  disabled={!addingSectionName.trim()}
                >Add section</button>
                <button className="add-section-cancel" onClick={() => { setIsAddingSection(false); setAddingSectionName(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="add-section-divider-btn" onClick={() => setIsAddingSection('middle')}>
              <span className="divider-line"></span>
              <span className="divider-text">Add section</span>
              <span className="divider-line"></span>
            </button>
          )}

          {/* Sections */}
          {tasksBySection.map(section => (
            <div
              key={section.id}
              className="section-container"
              draggable
              onDragStart={(e) => {
                handleSectionDragStart(e, section.id);
              }}
              onDragOver={(e) => {
                // If dragging a section:
                if (draggedSectionId) handleSectionDragOver(e, section.id);
                // If dragging a task:
                if (draggedTaskId) {
                  e.preventDefault();
                  setDragOverSectionId(section.id);
                }
              }}
              onDrop={(e) => {
                if (draggedSectionId) handleSectionDrop(e, section.id);
                if (draggedTaskId) handleTaskDropOnSection(e, section.id);
              }}
              onDragLeave={(e) => {
                // only clear if leaving component, simplified
                if (dragOverSectionId === section.id) setDragOverSectionId(null);
              }}
              onDragEnd={() => {
                setDraggedSectionId(null);
                setDragOverSectionId(null);
              }}
              style={{ opacity: draggedSectionId === section.id ? 0.5 : 1 }}
            >
              <div className="section-header">
                <div className="section-drag-handle" title="Drag to reorder">
                  <SectionDragHandleIcon />
                </div>
                <button className="section-toggle-btn" onClick={() => toggleSection(section.id)}>
                  <span className={`section-arrow ${collapsedSections.includes(section.id) ? 'collapsed' : ''}`}>
                    <ChevronIcon />
                  </span>
                  <span className="section-name">{section.name}</span>
                  <span className="section-count">{section.tasks.length}</span>
                </button>
                <button className="section-more-btn" onClick={() => handleDeleteSection(section.id)} title="More actions">
                  <MoreHorizIcon />
                </button>
              </div>
              {!collapsedSections.includes(section.id) && (
                <div className="section-tasks">
                  {section.tasks.map(task => (
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
                            {(task.due_date || (task.labels && task.labels.length > 0)) && (
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
                            )}
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
                        </>
                      )}
                    </div>
                  ))}
                  {/* Add task in section */}
                  {addingTaskInSection === section.id ? (
                    <AddTaskInline
                      onCancel={() => setAddingTaskInSection(null)}
                      onAdd={handleAddSuccess}
                      initialSectionId={section.id}
                    />
                  ) : (
                    <button className="add-task-btn-text section-add-task" onClick={() => { setAddingTaskInSection(section.id); setIsAddingTask(false); }}>
                      <span className="plus-icon"><PlusIcon /></span>
                      Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Section - Bottom */}
          {isAddingSection === 'bottom' ? (
            <div className="add-section-form">
              <input
                type="text"
                className="add-section-input"
                placeholder="Name this section"
                value={addingSectionName}
                onChange={(e) => setAddingSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSection();
                  if (e.key === "Escape") { setIsAddingSection(false); setAddingSectionName(""); }
                }}
                autoFocus
              />
              <div className="add-section-actions">
                <button
                  className={`add-section-submit ${!addingSectionName.trim() ? 'disabled' : ''}`}
                  onClick={handleCreateSection}
                  disabled={!addingSectionName.trim()}
                >Add section</button>
                <button className="add-section-cancel" onClick={() => { setIsAddingSection(false); setAddingSectionName(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="add-section-divider-btn" onClick={() => setIsAddingSection('bottom')}>
              <span className="divider-line"></span>
              <span className="divider-text">Add section</span>
              <span className="divider-line"></span>
            </button>
          )}
        </div>
      )}

      {/* Section-confined task navigation */}
      {(() => {
        let currentScopeTasks = [];
        if (selectedTask) {
          if (!selectedTask.section_id) {
            currentScopeTasks = tasksWithoutSection;
          } else {
            const section = tasksBySection.find(s => s.id === selectedTask.section_id);
            if (section) {
              currentScopeTasks = section.tasks;
            }
          }
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
            onUpdate={() => { }} // Handle updates later
            onPrevTask={currentTaskIndex > 0 ? () => setSelectedTask(currentScopeTasks[currentTaskIndex - 1]) : null}
            onNextTask={currentTaskIndex >= 0 && currentTaskIndex < currentScopeTasks.length - 1 ? () => setSelectedTask(currentScopeTasks[currentTaskIndex + 1]) : null}
          />
        );
      })()}
    </div>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  // For dates within next 7 days (2-7), show weekday name
  if (diffDays > 1 && diffDays <= 7) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return weekdays[new Date(dateString).getDay()];
  }

  // Format for display (beyond 7 days)
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getDueDateClass(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "is-today";
  if (diffDays === 1) return "is-tomorrow";
  if (diffDays > 1 && diffDays <= 7) return "is-next-seven";

  return "";
}

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

// Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const DisplayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" fillRule="evenodd" d="M17.333 4.001A2.667 2.667 0 0 1 20 6.668v10.667A2.667 2.667 0 0 1 17.333 20H6.667A2.667 2.667 0 0 1 4 17.335V6.668A2.667 2.667 0 0 1 6.667 4zm-.083 1H6.75a1.75 1.75 0 0 0-1.745 1.62L5 6.75v10.5a1.75 1.75 0 0 0 1.62 1.745l.13.005h10.5a1.75 1.75 0 0 0 1.745-1.62l.005-.13v-10.5a1.75 1.75 0 0 0-1.62-1.745zm-.75 7c0-.276-.183-.5-.41-.5H7.91l-.074.008c-.191.043-.336.247-.336.492 0 .276.183.5.41.5h8.18l.074-.008c.191-.042.336-.246.336-.492m-.41 3.5c.227 0 .41.224.41.5 0 .246-.145.45-.336.492l-.073.008H7.909c-.226 0-.409-.224-.409-.5 0-.245.145-.45.336-.492l.073-.008zm.41-7.5c0-.276-.183-.5-.41-.5H7.91l-.074.008c-.191.043-.336.247-.336.492 0 .276.183.5.41.5h8.18l.074-.008c.191-.042.336-.246.336-.492" clipRule="evenodd"></path>
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



// Task hover action icons
const DragIcon = () => (
  <svg width="24" height="24">
    <path fill="currentColor" d="M14.5 15.5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 14.5 15.5m-5 0a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 9.5 15.5m5-5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 14.5 10.5m-5 0a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 9.5 10.5m5-5a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 14.5 5.5m-5 0a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 9.5 5.5"></path>
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

const SectionDragHandleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-4 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-4 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0" />
  </svg>
);

const SectionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <path fill="currentColor" d="M3.5 3a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zm0 4a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9zm0 4a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9z" />
  </svg>
);

const ChevronIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
    <path fill="currentColor" d="M11.646 5.647a.5.5 0 0 1 .708.707l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 1 1 .708-.707L8 9.294z" />
  </svg>
);

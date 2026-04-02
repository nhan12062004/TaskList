import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from "../../contexts/AuthContext";
import "./TaskDetailModal.css";

export default function TaskDetailModal({ isOpen, onClose, task, onUpdate, onPrevTask, onNextTask, initialCommentFocus }) {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isClosing, setIsClosing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isCommentEditing, setIsCommentEditing] = useState(false);
    const [origTitle, setOrigTitle] = useState("");
    const [origDescription, setOrigDescription] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pickerPos, setPickerPos] = useState(null);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setOrigTitle(task.title || "");
            setOrigDescription(task.description || "");
            setIsEditing(false);
            fetchComments();
            setIsCommentEditing(!!initialCommentFocus);
        }
    }, [task, initialCommentFocus]);

    const fetchComments = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/tasks/${task.id}/comments`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setComments(data);
            }
        } catch (error) {
            console.error("Failed to fetch comments", error);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 150);
    };

    const handleDeleteTask = async () => {
        setIsMoreMenuOpen(false);
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/tasks/${task.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            onClose();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to delete task", error);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/tasks/${task.id}/comments`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ content: newComment })
            });
            if (response.ok) {
                setNewComment("");
                fetchComments();
            }
        } catch (error) {
            console.error("Failed to add comment", error);
        }
    };

    const handleSaveTitle = async () => {
        if (title === task.title) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/tasks/${task.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title })
            });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update title", error);
        }
    };

    const handleSaveDescription = async () => {
        if (description === (task.description || "")) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`/api/tasks/${task.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ description })
            });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update description", error);
        }
    };

    if (!isOpen || !task) return null;

    const projectName = task.project_name || "Inbox";
    const isInbox = !task.project_name || task.project_name === "Inbox" || Number(task.project_is_inbox) === 1;
    const displayName = user?.name || user?.email || "User";
    const initial = displayName.trim().charAt(0).toUpperCase();

    return (
        <div className="tdm-overlay" onClick={handleClose}>
            <div
                className={`tdm-container ${isClosing ? "closing" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="tdm-header">
                    <div className="tdm-header-left">
                        <span className="tdm-project-icon">
                            {isInbox ? <InboxIcon /> : <ProjectHashIcon />}
                        </span>
                        <span className="tdm-project-name">{projectName}</span>
                    </div>
                    <div className="tdm-header-right">
                        <button className="tdm-header-btn" title="Previous task" onClick={() => onPrevTask && onPrevTask()} disabled={!onPrevTask} style={{ opacity: !onPrevTask ? 0.3 : 1, cursor: !onPrevTask ? 'default' : 'pointer' }}><UpIcon /></button>
                        <button className="tdm-header-btn" title="Next task" onClick={() => onNextTask && onNextTask()} disabled={!onNextTask} style={{ opacity: !onNextTask ? 0.3 : 1, cursor: !onNextTask ? 'default' : 'pointer' }}><DownIcon /></button>

                        <div className="tdm-more-menu-container">
                            <button className="tdm-header-btn" title="More actions" onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}>
                                <MoreIcon />
                            </button>
                            {isMoreMenuOpen && (
                                <>
                                    <div className="tdm-more-menu-backdrop" onClick={() => setIsMoreMenuOpen(false)} />
                                    <div className="tdm-more-menu">
                                        <div className="tdm-more-menu-info">
                                            Added on {task.created_at ? new Date(task.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + new Date(task.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "Unknown"}
                                        </div>
                                        <div className="tdm-more-menu-divider" />
                                        <button className="tdm-more-menu-item"><span className="tdm-more-icon"><DuplicateIcon /></span> Duplicate</button>
                                        <button className="tdm-more-menu-item" onClick={() => { navigator.clipboard.writeText(window.location.href); setIsMoreMenuOpen(false); }}><span className="tdm-more-icon"><LinkIcon /></span> Copy link to task</button>
                                        <button className="tdm-more-menu-item"><span className="tdm-more-icon"><EmailIcon /></span> Add comments via email</button>
                                        <button className="tdm-more-menu-item"><span className="tdm-more-icon"><ActivityIcon /></span> View task activity</button>
                                        <button className="tdm-more-menu-item" onClick={() => { window.print(); setIsMoreMenuOpen(false); }}><span className="tdm-more-icon"><PrintIcon /></span> Print</button>
                                        <div className="tdm-more-menu-divider" />
                                        <button className="tdm-more-menu-item"><span className="tdm-more-icon"><ExtensionIcon /></span> Add extension...</button>
                                        <div className="tdm-more-menu-divider" />
                                        <button className="tdm-more-menu-item danger" onClick={handleDeleteTask}><span className="tdm-more-icon"><DeleteIcon /></span> Delete <span className="tdm-more-menu-shortcut">↑ Delete</span></button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button className="tdm-header-btn close" onClick={handleClose} title="Close"><CloseIcon /></button>
                    </div>
                </header>

                {/* Body */}
                <div className="tdm-body">
                    {/* Main Content */}
                    <div className="tdm-main">
                        <div className="tdm-task-content-top">
                            {/* Task Title + Description */}
                            <div className="tdm-task-header">
                                <button className={`tdm-checkbox priority-${task.priority || 4}`}>
                                    <CheckIcon />
                                </button>
                                <div
                                    className={`tdm-edit-card ${isEditing ? 'editing' : ''}`}
                                    onClick={() => !isEditing && setIsEditing(true)}
                                >
                                    <input
                                        className="tdm-title-input"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Task name"
                                        readOnly={!isEditing}
                                    />
                                    {isEditing ? (
                                        <div className="tdm-desc-edit-row">
                                            <DescIcon />
                                            <textarea
                                                className="tdm-desc-input"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Description"
                                                rows="2"
                                                autoFocus={!title}
                                            />
                                        </div>
                                    ) : (
                                        description ? (
                                            <div className="tdm-desc-text">{description}</div>
                                        ) : (
                                            <div className="tdm-desc-placeholder-static">
                                                <DescIcon />
                                                <span>Description</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                            {isEditing && (
                                <div className="tdm-edit-actions">
                                    <button
                                        className="tdm-edit-cancel"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTitle(origTitle);
                                            setDescription(origDescription);
                                            setIsEditing(false);
                                        }}
                                    >Cancel</button>
                                    <button
                                        className="tdm-edit-save"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const token = localStorage.getItem("token");
                                                await fetch(`/api/tasks/${task.id}`, {
                                                    method: "PUT",
                                                    headers: {
                                                        "Authorization": `Bearer ${token}`,
                                                        "Content-Type": "application/json"
                                                    },
                                                    body: JSON.stringify({ title, description })
                                                });
                                                setOrigTitle(title);
                                                setOrigDescription(description);
                                                setIsEditing(false);
                                                if (onUpdate) onUpdate();
                                            } catch (error) {
                                                console.error("Failed to save", error);
                                            }
                                        }}
                                    >Save</button>
                                </div>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="tdm-comments-section">
                            {comments.length > 0 && (
                                <div className="tdm-comments-list">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="tdm-comment-item">
                                            <div className="tdm-comment-avatar" style={{ backgroundColor: "#e21d81", padding: 0, overflow: "hidden" }}>
                                                {comment.user_avatar_url ? (
                                                    <img src={comment.user_avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    comment.user_name?.charAt(0) || "U"
                                                )}
                                            </div>
                                            <div className="tdm-comment-content">
                                                <div className="tdm-comment-info">
                                                    <strong className="tdm-user-name">{comment.user_name}</strong>
                                                    <span className="tdm-comment-time">
                                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="tdm-comment-text">{comment.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="tdm-comment-input-area">
                                {!isCommentEditing && (
                                    <div className="tdm-comment-avatar-small" style={{ backgroundColor: "#e21d81" }}>
                                        {user?.avatarUrl
                                            ? <img src={user.avatarUrl} alt="" />
                                            : initial
                                        }
                                    </div>
                                )}
                                {isCommentEditing ? (
                                    <div className="tdm-comment-edit-card">
                                        <textarea
                                            className="tdm-comment-textarea"
                                            placeholder="Comment"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            autoFocus
                                            rows="2"
                                        />
                                        <div className="tdm-comment-edit-bottom">
                                            <div className="tdm-comment-edit-icons">
                                                <button
                                                    className="tdm-comment-icon-btn"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <PaperclipIcon />
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setNewComment(prev => prev + (prev ? " " : "") + `[File: ${file.name}]`);
                                                        }
                                                        e.target.value = null;
                                                    }}
                                                />
                                                <button
                                                    className="tdm-comment-icon-btn"
                                                    onClick={(e) => {
                                                        if (!showEmojiPicker) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const pickerHeight = 350;
                                                            let pTop = rect.top - pickerHeight - 8;
                                                            if (pTop < 10) {
                                                                // Not enough space above, show below the button
                                                                pTop = rect.bottom + 8;
                                                            }
                                                            setPickerPos({
                                                                top: pTop,
                                                                left: rect.left
                                                            });
                                                            setShowEmojiPicker(true);
                                                        } else {
                                                            setShowEmojiPicker(false);
                                                        }
                                                    }}
                                                >
                                                    <EmojiIcon />
                                                </button>
                                                {showEmojiPicker && pickerPos && createPortal(
                                                    <div className="tdm-emoji-picker-wrapper" style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 1000000 }}>
                                                        <EmojiPicker
                                                            onEmojiClick={(emojiData) => {
                                                                setNewComment(prev => prev + emojiData.emoji);
                                                                setShowEmojiPicker(false);
                                                            }}
                                                            width={300}
                                                            height={400}
                                                            searchPlaceHolder="Search"
                                                            previewConfig={{ showPreview: false }}
                                                            skinTonesDisabled
                                                        />
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                            <div className="tdm-comment-edit-actions">
                                                <button
                                                    className="tdm-edit-cancel"
                                                    onClick={() => {
                                                        setNewComment("");
                                                        setIsCommentEditing(false);
                                                    }}
                                                >Cancel</button>
                                                <button
                                                    className="tdm-comment-submit"
                                                    onClick={() => {
                                                        handleAddComment();
                                                        setIsCommentEditing(false);
                                                    }}
                                                    disabled={!newComment.trim()}
                                                >Comment</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="tdm-comment-input-pill" onClick={() => setIsCommentEditing(true)}>
                                        <input
                                            placeholder="Comment"
                                            readOnly
                                            style={{ cursor: 'text' }}
                                        />
                                        <button className="tdm-comment-attach-btn"><PaperclipIcon /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="tdm-sidebar">
                        {/* Project */}
                        <div className="tdm-sidebar-item">
                            <div className="tdm-sidebar-label">
                                <span className="tdm-sidebar-label-text">Project</span>
                            </div>
                            <button className="tdm-sidebar-btn">
                                <span className="tdm-sidebar-btn-icon">
                                    {isInbox ? <InboxIcon /> : <ProjectHashIcon />}
                                </span>
                                <span>{projectName}</span>
                            </button>
                        </div>

                        {/* Date */}
                        <div className="tdm-sidebar-item">
                            <div className="tdm-sidebar-label">
                                <span className="tdm-sidebar-label-text">Date</span>
                                <button className="tdm-sidebar-label-action" title="Set date"><PlusSmallIcon /></button>
                            </div>
                            {task.due_date && (() => {
                                const due = new Date(task.due_date);
                                const today = new Date();
                                const isToday = due.toDateString() === today.toDateString();
                                return (
                                    <button className="tdm-sidebar-btn" style={isToday ? { color: '#058527' } : {}}>
                                        <span className="tdm-sidebar-btn-icon" style={isToday ? { color: '#058527' } : {}}>
                                            {isToday ? <TodayIcon /> : <CalendarIcon />}
                                        </span>
                                        <span style={isToday ? { color: '#058527', fontWeight: 500 } : {}}>
                                            {isToday ? "Today" : due.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </button>
                                );
                            })()}
                        </div>


                        {/* Priority */}
                        <div className="tdm-sidebar-item">
                            <div className="tdm-sidebar-label">
                                <span className="tdm-sidebar-label-text">Priority</span>
                            </div>
                            <button className="tdm-sidebar-btn">
                                <span className="tdm-sidebar-btn-icon"><FlagIcon priority={task.priority} /></span>
                                <span>P{task.priority || 4}</span>
                            </button>
                        </div>

                        {/* Labels */}
                        <div className="tdm-sidebar-item">
                            <div className="tdm-sidebar-label">
                                <span className="tdm-sidebar-label-text">Labels</span>
                                <button className="tdm-sidebar-label-action" title="Add label"><PlusSmallIcon /></button>
                            </div>
                            {task.labels && task.labels.length > 0 && (
                                <div className="tdm-labels-list">
                                    {task.labels.map(label => (
                                        <span key={label.id} className="tdm-label-tag">
                                            {label.name}
                                            <button title="Remove label"><CloseSmallIcon /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reminders */}
                        <div className="tdm-sidebar-item">
                            <div className="tdm-sidebar-label">
                                <span className="tdm-sidebar-label-text">Reminders</span>
                                <button className="tdm-sidebar-label-action" title="Add reminder"><PlusSmallIcon /></button>
                            </div>
                        </div>

                    </aside>
                </div>
            </div>
        </div>
    );
}

/* ===== ICONS ===== */

const InboxIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="currentColor">
        <path fillRule="evenodd" d="M8.062 4h7.876a2 2 0 0 1 1.94 1.515l2.062 8.246q.06.24.06.486V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.754a2 2 0 0 1 .06-.485L6.12 5.515A2 2 0 0 1 8.061 4m0 1a1 1 0 0 0-.97.758L5.03 14.004a1 1 0 0 0-.03.242V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.754a1 1 0 0 0-.03-.242L16.91 5.758a1 1 0 0 0-.97-.758zm6.643 10a2.75 2.75 0 0 1-5.41 0H7a.5.5 0 1 1 0-1h2.75a.5.5 0 0 1 .5.5 1.75 1.75 0 1 0 3.5 0 .5.5 0 0 1 .5-.5H17a.5.5 0 0 1 0 1z" clipRule="evenodd"></path>
    </svg>
);

const ProjectHashIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" stroke="currentColor" strokeWidth="1" d="M9 4l-2 16M17 4l-2 16M4 9h16M3 15h16"></path>
    </svg>
);

const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
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

const UpIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 15l-6-6-6 6" /></svg>
);

const DownIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6" /></svg>
);

const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
);

const PlusSmallIconRed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#db4c3f" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
);

const DescIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="1.5" strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" />
    </svg>
);

const PlusSmallIconGray = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
);

const PaperclipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12.646 5.646a3.33 3.33 0 0 1 4.847 4.56l-.14.148-4.824 4.825a2.163 2.163 0 0 1-3.178-2.927l.12-.13 3.325-3.326a.501.501 0 0 1 .765.638l-.057.07-3.325 3.325a1.16 1.16 0 0 0 1.541 1.732l.101-.09 4.825-4.825a2.328 2.328 0 0 0-3.165-3.411l-.127.119-6.175 6.175a3.494 3.494 0 0 0 4.793 5.083l.15-.14 3.674-3.676a.501.501 0 0 1 .765.638l-.057.07-3.675 3.675a4.497 4.497 0 0 1-6.358 0 4.497 4.497 0 0 1-.159-6.19l.16-.168z"></path></svg>
);

const MicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
);

const EmojiIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16m0 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14m2.45 8a.5.5 0 0 1 .49.6 3 3 0 0 1-5.88 0 .5.5 0 0 1 .49-.6zm.05-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2m-5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"></path></svg>
);

const FormatIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
);

const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

const TodayIcon = () => (
    <svg width="15" height="15" viewBox="0 0 12 12">
        <path fill="currentColor" fillRule="evenodd" d="M9.5 1h-7A1.5 1.5 0 0 0 1 2.5v7A1.5 1.5 0 0 0 2.5 11h7A1.5 1.5 0 0 0 11 9.5v-7A1.5 1.5 0 0 0 9.5 1M2 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5zM8.75 8a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0M3.5 4a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z" clipRule="evenodd"></path>
    </svg>
);

const FlagIcon = ({ priority }) => {
    const colors = { 1: "#d1453b", 2: "#eb8909", 3: "#246fe0", 4: "#808080" };
    const color = colors[priority] || colors[4];
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
            {priority < 4 ? (
                <path fill={color} d="M2 3a.5.5 0 0 1 .276-.447C3.025 2.179 4.096 2 5.5 2c.901 0 1.485.135 2.658.526C9.235 2.885 9.735 3 10.5 3c1.263 0 2.192-.155 2.776-.447A.5.5 0 0 1 14 3v6.5a.5.5 0 0 1-.276.447c-.749.375-1.82.553-3.224.553-.901 0-1.485-.135-2.658-.526C6.765 9.615 6.265 9.5 5.5 9.5c-1.08 0-1.915.113-2.5.329V13.5a.5.5 0 0 1-1 0V3z" />
            ) : (
                <path fill={color} fillRule="evenodd" d="M2 3a.5.5 0 0 1 .276-.447C3.025 2.179 4.096 2 5.5 2c.901 0 1.485.135 2.658.526C9.235 2.885 9.735 3 10.5 3c1.263 0 2.192-.155 2.776-.447A.5.5 0 0 1 14 3v6.5a.5.5 0 0 1-.276.447c-.749.375-1.82.553-3.224.553-.901 0-1.485-.135-2.658-.526C6.765 9.615 6.265 9.5 5.5 9.5c-1.08 0-1.915.113-2.5.329V13.5a.5.5 0 0 1-1 0V3m1 5.779v-5.45C3.585 3.113 4.42 3 5.5 3c.765 0 1.265.115 2.342.474C9.015 3.865 9.599 4 10.5 4c1.002 0 1.834-.09 2.5-.279v5.45c-.585.216-1.42.329-2.5.329-.765 0-1.265-.115-2.342-.474C6.985 8.635 6.401 8.5 5.5 8.5c-1.001 0-1.834.09-2.5.279" clipRule="evenodd" />
            )}
        </svg>
    );
};

const ProIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '6px' }}>
        <path fill="#eb8909" fillRule="evenodd" clipRule="evenodd" d="M12 1.5l2.76 1.83 3.12-.9.99 3.1 3.26 1.25-1.4 2.94 1.4 2.94-3.26 1.25-.99 3.1-3.12-.9L12 22.5l-2.76-1.83-3.12.9-.99-3.1-3.26-1.25 1.4-2.94-1.4-2.94 3.26-1.25.99-3.1 3.12.9L12 1.5zm0 14a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
    </svg>
);

const LockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);

const PlusSmallIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
);

const CloseSmallIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
);

const DuplicateIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="11" height="11" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const LinkIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
const EmailIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const ActivityIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const PrintIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const ExtensionIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 11h-2V6h-5V4a2 2 0 0 0-4 0v2H3v5h2a2 2 0 0 1 0 4H3v5h5v-2a2 2 0 0 1 4 0v2h5v-5h2a2 2 0 0 0 0-4z"></path></svg>;
const DeleteIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

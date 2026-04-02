import React, { useState, useRef, useEffect } from 'react';
import './AiAssistant.css';
import { useAuth } from '../../contexts/AuthContext';

const AI_ICON_URL = "https://cdn-icons-png.flaticon.com/512/12188/12188352.png"; // Placeholder for generic AI bot
// Or use an SVG

export default function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your AI assistant. How can I help you manage your tasks today?' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { token } = useAuth();
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
        if (inputRef.current) inputRef.current.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Filter out the initial greeting or any leading assistant messages for Gemini compatibility
            // The history sent to Gemini MUST start with a 'user' role
            const validHistory = messages.filter((msg, index) => {
                if (index === 0 && msg.role === 'assistant') return false;
                return true;
            });

            const history = validHistory.map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMsg.content,
                    history: history
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
                if (data.shouldRefresh) {
                    window.dispatchEvent(new Event('task-updated'));
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error: " + (data.error || "Unknown error") }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I can't connect to the server right now." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button className="ai-fab" onClick={() => setIsOpen(true)} title="Open AI Assistant">
                <BotIcon />
            </button>
        );
    }

    return (
        <div className="ai-chat-window">
            <div className="ai-header">
                <div className="ai-header-title">
                    <BotIcon />
                    <span>AI Assistant</span>
                </div>
                <button className="ai-close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="ai-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.role}`}>
                        <div className="ai-msg-content">
                            {msg.content}
                        </div>
                    </div>
                ))}

                {messages.length === 1 && (
                    <div className="ai-suggestions">
                        <p className="ai-suggestions-label">Bạn có thể thử:</p>
                        <div className="ai-chips">
                            <button onClick={() => handleSuggestionClick("Tạo task đi họp lúc 9h sáng mai")}>📅 Tạo task họp</button>
                            <button onClick={() => handleSuggestionClick("Xem danh sách task chưa hoàn thành")}>📋 Xem task</button>
                            <button onClick={() => handleSuggestionClick("Hoàn thành task đi họp")}>✅ Hoàn thành task</button>
                            <button onClick={() => handleSuggestionClick("Xóa task đi họp")}>🗑️ Xóa task</button>
                            <button onClick={() => handleSuggestionClick("Bạn có thể làm gì?")}>❓ Hướng dẫn</button>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="ai-message assistant">
                        <div className="ai-typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="ai-input-area" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" disabled={!input.trim() || loading}>
                    <SendIcon />
                </button>
            </form>
        </div>
    );
}

const BotIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Robot head */}
        <rect x="4" y="6" width="16" height="14" rx="3" fill="white" />
        {/* Antenna */}
        <circle cx="12" cy="3" r="2" fill="white" />
        <line x1="12" y1="5" x2="12" y2="6" stroke="white" strokeWidth="2" />
        {/* Eyes */}
        <circle cx="8.5" cy="11" r="2" fill="#7C3AED" />
        <circle cx="15.5" cy="11" r="2" fill="#7C3AED" />
        {/* Eye highlights */}
        <circle cx="9" cy="10.5" r="0.5" fill="white" />
        <circle cx="16" cy="10.5" r="0.5" fill="white" />
        {/* Mouth/speaker grille */}
        <rect x="8" y="15" width="8" height="2" rx="1" fill="#7C3AED" />
        {/* Side ears */}
        <rect x="1" y="10" width="3" height="4" rx="1" fill="white" />
        <rect x="20" y="10" width="3" height="4" rx="1" fill="white" />
    </svg>
);

const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

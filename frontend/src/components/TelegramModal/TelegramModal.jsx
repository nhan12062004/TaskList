import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import "./TelegramModal.css";

export default function TelegramModal({ isOpen, onClose }) {
    const { token } = useAuth();
    const [status, setStatus] = useState({ loading: true, connected: false });
    const [linkData, setLinkData] = useState(null);
    const [error, setError] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const apiBaseUrl = "";

    // Check connection status when modal opens
    useEffect(() => {
        if (isOpen && token) {
            checkStatus();
        }
    }, [isOpen, token]);

    const checkStatus = async () => {
        try {
            setStatus({ loading: true, connected: false });
            setError("");

            const response = await fetch(`${apiBaseUrl}/api/telegram/status`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to check status");
            }

            const data = await response.json();
            setStatus({ loading: false, connected: data.connected });
        } catch (err) {
            setError(err.message);
            setStatus({ loading: false, connected: false });
        }
    };

    const generateLink = async () => {
        try {
            setError("");

            const response = await fetch(`${apiBaseUrl}/api/telegram/link`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to generate link");
            }

            const data = await response.json();
            setLinkData(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDisconnectClick = () => {
        setShowConfirm(true);
    };

    const cancelDisconnect = () => {
        setShowConfirm(false);
    };

    const confirmDisconnect = async () => {
        try {
            setError("");
            setDisconnecting(true);

            const response = await fetch(`${apiBaseUrl}/api/telegram/disconnect`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Không thể hủy liên kết. Vui lòng thử lại.");
            }

            setShowConfirm(false);
            setShowSuccess(true);

            // After showing success animation, update status
            setTimeout(() => {
                setShowSuccess(false);
                setStatus({ loading: false, connected: false });
                setLinkData(null);
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setDisconnecting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="telegram-modal-overlay" onClick={onClose}>
            <div className="telegram-modal" onClick={(e) => e.stopPropagation()}>
                <div className="telegram-modal-header">
                    <div className="telegram-header-icon">
                        <svg viewBox="0 0 24 24" fill="#0088cc">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                    </div>
                    <h2>Liên kết Telegram</h2>
                    <button className="telegram-modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="telegram-modal-body">
                    {status.loading ? (
                        <div className="telegram-loading">
                            <div className="spinner"></div>
                            <p>Đang kiểm tra...</p>
                        </div>
                    ) : status.connected ? (
                        <div className="telegram-connected">
                            {showSuccess ? (
                                <div className="disconnect-success">
                                    <div className="success-icon-wrap">
                                        <svg viewBox="0 0 24 24" width="48" height="48">
                                            <circle cx="12" cy="12" r="10" stroke="#4caf50" strokeWidth="2" fill="none" className="success-circle" />
                                            <path d="M8 12l3 3 5-6" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="success-check" />
                                        </svg>
                                    </div>
                                    <p className="success-text">Đã hủy liên kết thành công!</p>
                                </div>
                            ) : showConfirm ? (
                                <div className="disconnect-confirm">
                                    <div className="confirm-icon">
                                        <svg viewBox="0 0 24 24" width="40" height="40">
                                            <circle cx="12" cy="12" r="10" stroke="#e53935" strokeWidth="2" fill="none" />
                                            <path d="M12 8v4M12 16h.01" stroke="#e53935" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <h3 className="confirm-title">Xác nhận hủy liên kết</h3>
                                    <p className="confirm-desc">
                                        Bạn sẽ không thể quản lý task qua Telegram nữa. Bạn có thể liên kết lại bất cứ lúc nào.
                                    </p>
                                    <div className="confirm-actions">
                                        <button
                                            className="telegram-btn secondary"
                                            onClick={cancelDisconnect}
                                            disabled={disconnecting}
                                        >
                                            Hủy bỏ
                                        </button>
                                        <button
                                            className={`telegram-btn danger ${disconnecting ? 'loading' : ''}`}
                                            onClick={confirmDisconnect}
                                            disabled={disconnecting}
                                        >
                                            {disconnecting ? (
                                                <>
                                                    <div className="btn-spinner"></div>
                                                    Đang hủy...
                                                </>
                                            ) : (
                                                <>Xác nhận hủy liên kết</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="status-badge connected">
                                        <svg viewBox="0 0 24 24" width="20" height="20">
                                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        <span>Đã liên kết</span>
                                    </div>
                                    <p className="telegram-info">
                                        Tài khoản Telegram của bạn đã được liên kết. Bạn có thể quản lý task qua bot <strong>@tasklistforbot</strong>
                                    </p>
                                    <div className="telegram-actions">
                                        <a
                                            href="https://t.me/tasklistforbot"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="telegram-btn primary"
                                        >
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                            </svg>
                                            Mở Telegram
                                        </a>
                                        <button className="telegram-btn danger" onClick={handleDisconnectClick}>
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                            Hủy liên kết
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="telegram-not-connected">
                            {!linkData ? (
                                <>
                                    <div className="status-badge not-connected">
                                        <svg viewBox="0 0 24 24" width="20" height="20">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <span>Chưa liên kết</span>
                                    </div>
                                    <p className="telegram-info">
                                        Liên kết tài khoản Telegram để quản lý task mọi lúc mọi nơi với các lệnh đơn giản.
                                    </p>
                                    <div className="telegram-features">
                                        <div className="feature">
                                            <span className="feature-icon">➕</span>
                                            <span>/add - Thêm task mới</span>
                                        </div>
                                        <div className="feature">
                                            <span className="feature-icon">📋</span>
                                            <span>/list - Xem danh sách task</span>
                                        </div>
                                        <div className="feature">
                                            <span className="feature-icon">✅</span>
                                            <span>/done - Hoàn thành task</span>
                                        </div>
                                        <div className="feature">
                                            <span className="feature-icon">✏️</span>
                                            <span>/edit - Sửa task</span>
                                        </div>
                                    </div>
                                    <button className="telegram-btn primary full-width" onClick={generateLink}>
                                        Tạo liên kết
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="link-generated">
                                        <p className="telegram-info">
                                            Click vào nút bên dưới hoặc quét mã QR để liên kết tài khoản:
                                        </p>
                                        <div className="link-box">
                                            <code>{linkData.code}</code>
                                            <span className="link-expire">Hết hạn sau 10 phút</span>
                                        </div>
                                        <a
                                            href={linkData.linkUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="telegram-btn primary full-width"
                                        >
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                            </svg>
                                            Mở Telegram để liên kết
                                        </a>
                                        <button className="telegram-btn secondary full-width" onClick={() => { setLinkData(null); checkStatus(); }}>
                                            Kiểm tra lại trạng thái
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="telegram-error">
                            <span>❌ {error}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

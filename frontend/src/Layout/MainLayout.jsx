import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import Sidebar from "../components/Sidebar/Sidebar.jsx";
import AddTaskModal from "../components/AddTaskModal/AddTaskModal.jsx";
import UserMenuModal from "../components/UserMenuModal/UserMenuModal.jsx";
import TelegramModal from "../components/TelegramModal/TelegramModal.jsx";
import Inbox from "../pages/Inbox/Inbox.jsx";
import Today from "../pages/Today/Today.jsx";
import Upcoming from "../pages/Upcoming/Upcoming.jsx";
import Filters from "../pages/Filters-Labels/Filters.jsx";
import Completed from "../pages/Completed/Completed.jsx";
import Login from "../pages/Login/Login.jsx";
import Register from "../pages/Register/Register.jsx";
import Onboarding from "../pages/Onboarding/Onboarding.jsx";
import Notifications from "../pages/Notifications/Notifications.jsx";
import MyProjects from "../pages/MyProjects/MyProjects.jsx";
import AiAssistant from "../components/AiAssistant/AiAssistant.jsx";

const PAGES = {
  inbox: Inbox,
  today: Today,
  upcoming: Upcoming,
  filters: Filters,
  completed: Completed,
  notifications: Notifications,
  projects: MyProjects
};

const PAGE_LABELS = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
  filters: "Filters & Labels",
  completed: "Completed",
  notifications: "Notifications",
  projects: "My Projects"
};

const API_BASE_URL = "";

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [activePage, setActivePageState] = useState(() => {
    return localStorage.getItem("activePage") || "inbox";
  });

  const setActivePage = (page) => {
    localStorage.setItem("activePage", page);
    setActivePageState(page);
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);
  const [initialTaskTitle, setInitialTaskTitle] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem("justRegistered") === "true"
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const ActiveComponent = PAGES[activePage] ?? Inbox;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      document.title = authMode === "login" ? "TaskList – Sign in" : "TaskList – Sign up";
      return;
    }
    if (showOnboarding) {
      document.title = "TaskList – Profile setup";
      return;
    }
    const label = PAGE_LABELS[activePage] ?? "Inbox";
    document.title = `TaskList – ${label}`;
  }, [loading, isAuthenticated, authMode, activePage, showOnboarding]);

  useEffect(() => {
    if (isAuthenticated && localStorage.getItem("justRegistered") === "true") {
      setShowOnboarding(true);
    }
  }, [isAuthenticated]);

  // Tự động thu gọn sidebar khi màn hình nhỏ (< 900px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    // Chạy ngay khi mount
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleAddTask = () => {
    // Task is already added by AddTaskModal, just trigger refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOpenModal = (title = "") => {
    setInitialTaskTitle(title);
    setIsModalOpen(true);
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div>Đang tải...</div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    return authMode === "login" ? (
      <Login onSwitchToRegister={() => setAuthMode("register")} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode("login")} />
    );
  }

  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.removeItem("justRegistered");
          setShowOnboarding(false);
        }}
      />
    );
  }

  // Show main app if authenticated
  return (
    <div className={`app ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onAddTaskClick={() => handleOpenModal("")}
        onVoiceTaskClick={(transcript) => handleOpenModal(transcript)}
        labels={PAGE_LABELS}
        onOpenUserMenu={() => setIsUserMenuOpen(true)}
        onOpenTelegram={() => setIsTelegramOpen(true)}
        refreshTrigger={refreshTrigger}
      />
      <main className="content">
        <ActiveComponent
          title={PAGE_LABELS[activePage]}
          onAddTaskClick={() => handleOpenModal("")}
          refreshTrigger={refreshTrigger}
          onRefresh={handleAddTask}
        />
      </main>
      <UserMenuModal
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenTelegram={() => setIsTelegramOpen(true)}
      />
      <TelegramModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddTask={handleAddTask}
        initialTitle={initialTaskTitle}
        initialDate={activePage === 'today' ? new Date() : null}
      />
      <AiAssistant />
    </div>
  );
}


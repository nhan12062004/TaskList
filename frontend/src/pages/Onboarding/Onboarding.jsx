import { useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.svg";
import illustration from "../../assets/67e74557ad931ff6.svg";
import "./Onboarding.css";

export default function Onboarding({ onComplete }) {
  const { user, updateUser, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const emailInitial = user?.email?.trim()?.[0]?.toUpperCase();
  const nameInitial = name.trim() ? name.trim()[0].toUpperCase() : null;
  const initials = nameInitial || emailInitial || "U";

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("File too large. Max size is 4MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        setAvatarUrl(dataUrl);
        updateUser({ avatarUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleContinue = () => {
    const nextName = name.trim() || user?.name || "User";
    const payload = { name: nextName };
    if (avatarUrl) {
      payload.avatarUrl = avatarUrl;
    }

    setSaving(true);
    setError("");
    updateProfile(payload).then((result) => {
      setSaving(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      updateUser(payload);
      onComplete();
    });
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-shell">
        <div className="onboarding-left">
          <div className="onboarding-left-inner">
            <div className="onboarding-brand">
              <span className="brand-mark" aria-hidden="true">
                <img src={logo} alt="TaskList logo" />
              </span>
              <span className="brand-text">TaskList</span>
            </div>

            <div className="onboarding-content">
              <h1 className="onboarding-title">What’s your name?</h1>
              <p className="onboarding-subtitle">Finish setting up your profile.</p>

              <label className="onboarding-label" htmlFor="profileName">
                Your name
              </label>
              <input
                id="profileName"
                className="onboarding-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />

              <div className="avatar-row">
                <div className="avatar-circle">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
                </div>
                <input
                  ref={fileInputRef}
                  id="avatarUpload"
                  type="file"
                  accept="image/*"
                  className="avatar-input"
                  onChange={handleFileChange}
                />
                <label className="upload-btn" htmlFor="avatarUpload">
                  Upload photo
                </label>
              </div>
              <p className="avatar-help">
                Choose a photo up to 4MB. Your avatar will be public.
              </p>

            {error && <div className="avatar-help error-text">{error}</div>}
            <button type="button" className="primary-btn" onClick={handleContinue} disabled={saving}>
              {saving ? "Saving..." : "Continue"}
            </button>
            </div>
          </div>
        </div>

        <div className="onboarding-right">
          <div className="onboarding-illustration" aria-hidden="true">
            <img src={illustration} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.svg";
import illustration from "../../assets/67e74557ad931ff6.svg";
import "./Register.css";

export default function Register({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const handleResetPage = () => {
    window.location.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const displayName = email.includes("@") ? email.split("@")[0] : "User";
    const result = await register(email, password, displayName);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <div className="auth-left-inner">
            <button
              type="button"
              className="auth-brand auth-brand-button"
              onClick={handleResetPage}
              aria-label="Reset page"
            >
              <span className="brand-mark" aria-hidden="true">
                <img src={logo} alt="TaskList logo" />
              </span>
              <span className="brand-text">TaskList</span>
            </button>

            <h1 className="auth-title">Sign up</h1>

            <div className="auth-social">
            <button className="social-btn" type="button">
              <span className="social-icon google" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.1-1.4 3.2-5.1 3.2-3.1 0-5.6-2.6-5.6-5.8S8.9 5.4 12 5.4c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 2.7 14.6 1.7 12 1.7 6.9 1.7 2.8 5.8 2.8 11s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.2-1.4H12z" />
                  <path fill="#34A853" d="M4.6 7.1l3 2.2c.8-1.7 2.6-2.9 4.4-2.9 1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 2.7 14.6 1.7 12 1.7c-3.6 0-6.7 2.1-8.1 5.4z" />
                  <path fill="#FBBC05" d="M12 20.3c2.5 0 4.6-.8 6.2-2.3l-3-2.3c-.8.5-1.8.9-3.2.9-2.8 0-5.1-1.9-5.9-4.4l-3.1 2.4C4.6 18.2 8 20.3 12 20.3z" />
                  <path fill="#4285F4" d="M20.6 11.4c0-.6-.1-1-.2-1.4H12v3.6h5.1c-.2 1.2-1 2.2-2.1 2.8l3 2.3c1.8-1.6 2.6-3.9 2.6-6.3z" />
                </svg>
              </span>
              Continue with Google
            </button>
            <button className="social-btn" type="button">
              <span className="social-icon facebook" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M13.5 8.7V7.2c0-.7.4-1.2 1.3-1.2h1.2V3.2h-2c-2.6 0-3.7 1.8-3.7 3.6v1.9H8v2.8h2.3V20h3v-8.5h2.2l.3-2.8h-2.5z"
                    fill="#fff"
                  />
                </svg>
              </span>
              Continue with Facebook
            </button>
            <button className="social-btn" type="button">
              <span className="social-icon apple" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M16.3 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-3-1.6-1.3-.1-2.4.7-3.1.7s-1.7-.7-2.8-.7c-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1.1 8.4.7 1 1.6 2.1 2.7 2 1.1 0 1.5-.6 2.8-.6s1.7.6 2.8.6c1.2 0 2-1 2.6-2 .8-1.2 1.2-2.4 1.2-2.5 0 0-2.3-.9-2.3-3.3zM15.1 5c.6-.8 1-2 1-3-1 .1-2.1.7-2.7 1.5-.6.7-1 1.8-.9 2.8 1 .1 2-.5 2.6-1.3z"
                    fill="#fff"
                  />
                </svg>
              </span>
              Continue with Apple
            </button>
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter your personal or work email..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter your password..."
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Creating account..." : "Sign up with Email"}
              </button>
            </form>

            <p className="auth-terms">
              By continuing with Google, Apple, or Email, you agree to TaskList's{" "}
              <button type="button" className="inline-link">Terms of Service</button> and{" "}
              <button type="button" className="inline-link nowrap">Privacy Policy</button>.
            </p>

            <div className="auth-footer centered">
              <span>Already signed up?</span>
              <button type="button" onClick={onSwitchToLogin} className="link-button">
                Go to login
              </button>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-illustration" aria-hidden="true">
            <img src={illustration} alt="" />
          </div>

          <div className="auth-qr">
            <div className="auth-qr-text">
              <h3>Take TaskList with you</h3>
              <p>
                Stay organized wherever you are with our mobile apps for iOS and Android.
              </p>
            </div>
            <div className="qr-box" aria-hidden="true">
              <div className="qr-placeholder">QR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

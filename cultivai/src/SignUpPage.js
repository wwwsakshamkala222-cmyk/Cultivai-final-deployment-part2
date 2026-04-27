import './Loginpage.css';
import React, { useState } from "react";
import { signUp, confirmSignUp, getCurrentUser, fetchAuthSession, signOut, signInWithRedirect } from "aws-amplify/auth";
import { Eye, EyeOff, Mail, Lock, Leaf, Sprout, Sun, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";
import { motion } from 'framer-motion';

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState("signUp"); // "signUp" | "confirm"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      });
      setStage("confirm");
    } catch (err) {
      setError(err?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      navigate("/login");
    } catch (err) {
      setError(err?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (err) {
      setError(err?.message || "Google sign-in failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="cv-page"
    >
    <div className="cv-page">
      <div className="cv-shell">
        {/* LEFT — Brand panel */}
        <aside className="cv-brand">
          <div className="cv-brand-top">
            <div className="cv-logo">
              <span className="cv-logo-icon">🌿</span>
              <span className="cv-logo-text">CultivAI</span>
            </div>
            <span className="cv-pill">Smart Farming</span>
          </div>

          <div className="cv-brand-mid">
            <h1 className="cv-headline">
              Grow smarter.<br />
              <span className="cv-headline-accent">Harvest better.</span>
            </h1>
            <p className="cv-sub">
              AI-powered crop intelligence that turns your fields into data — and your data into yield.
            </p>
          </div>

          <div className="cv-stats">
            <div className="cv-stat">
              <Leaf className="cv-stat-icon" />
              <div>
                <div className="cv-stat-num">98%</div>
                <div className="cv-stat-label">Detection accuracy</div>
              </div>
            </div>
            <div className="cv-stat">
              <Sprout className="cv-stat-icon" />
              <div>
                <div className="cv-stat-num">40+</div>
                <div className="cv-stat-label">Crop varieties</div>
              </div>
            </div>
            <div className="cv-stat">
              <Sun className="cv-stat-icon" />
              <div>
                <div className="cv-stat-num">24/7</div>
                <div className="cv-stat-label">Field insights</div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — Form card */}
        <main className="cv-form-side">
          <div className="cv-form-wrap">
            <div className="cv-form-head">
              <h2 className="cv-title">
                {stage === "signUp" ? "Create your account" : "Verify your email"}
              </h2>
              <p className="cv-muted">
                {stage === "signUp"
                  ? "Join thousands of growers using CultivAI."
                  : `We sent a 6-digit code to ${email}`}
              </p>
            </div>

            {error && <div className="cv-error">{error}</div>}

            {stage === "signUp" ? (
              <form onSubmit={handleSignUp} className="cv-form">
                <label className="cv-label">Email address</label>
                <div className="cv-input-wrap">
                  <Mail className="cv-input-icon" size={18} />
                  <input
                    type="email"
                    className="cv-input"
                    placeholder="you@farm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <label className="cv-label">Password</label>
                <div className="cv-input-wrap">
                  <Lock className="cv-input-icon" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="cv-input"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="cv-eye"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button type="submit" className="cv-primary" disabled={loading}>
                  {loading ? "Creating account..." : (<>Create account <ArrowRight size={18} /></>)}
                </button>

                <div className="cv-divider"><span>or continue with</span></div>

                <button type="button" className="cv-google" onClick={handleGoogleSignIn}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 7.1 29.4 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 34.9 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C41.3 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
                  Continue with Google
                </button>

                <p className="cv-foot">
                  Already a member? <Link to="/login" className="cv-link">Sign in</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleConfirm} className="cv-form">
                <label className="cv-label">Verification code</label>
                <div className="cv-input-wrap">
                  <input
                    type="text"
                    className="cv-input cv-input-code"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="cv-primary" disabled={loading}>
                  {loading ? "Verifying..." : (<>Verify email <ArrowRight size={18} /></>)}
                </button>

                <p className="cv-foot">
                  Wrong email? <button type="button" className="cv-link cv-linkbtn" onClick={() => setStage("signUp")}>Go back</button>
                </p>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
    </motion.div>
  );
};

export default SignUpPage;

import './Loginpage.css';
import React, { useState } from 'react';
import { signIn, signInWithRedirect } from 'aws-amplify/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Leaf, Sprout, Sun, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsEmailLoading(true);
    try {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn === true) {
        setTimeout(() => navigate('/dashboard'), 300);
      } else {
        const { signInStep } = result.nextStep || {};
        switch (signInStep) {
          case 'CONFIRM_SIGN_UP':
            navigate('/register');
            break;
          case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
            setError('A new password is required.');
            break;
          default:
            setError(`Additional step required: ${signInStep || 'unknown'}`);
        }
      }
    } catch (err) {
      setError(err?.message || 'Sign in failed');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (err) {
      setError(err?.message || 'Google sign-in failed');
      setIsGoogleLoading(false);
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
        {/* LEFT — Brand */}
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
              Welcome back<br />
              <span className="cv-headline-accent">to your fields.</span>
            </h1>
            <p className="cv-sub">
              Sign in to access real-time crop diagnostics, yield forecasts, and AI-driven recommendations.
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

        {/* RIGHT — Form */}
        <main className="cv-form-side">
          <div className="cv-form-wrap">
            <div className="cv-form-head">
              <h2 className="cv-title">Sign in</h2>
              <p className="cv-muted">Enter your credentials to access CultivAI.</p>
            </div>

            {error && <div className="cv-error">{error}</div>}

            <form onSubmit={handleEmailSignIn} className="cv-form">
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
                  type={showPassword ? 'text' : 'password'}
                  className="cv-input"
                  placeholder="Your password"
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

              <button type="submit" className="cv-primary" disabled={isEmailLoading}>
                {isEmailLoading ? 'Signing in...' : (<>Sign in <ArrowRight size={18} /></>)}
              </button>

              <div className="cv-divider"><span>or continue with</span></div>

              <button
                type="button"
                className="cv-google"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 7.1 29.4 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 34.9 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C41.3 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
                {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              <p className="cv-foot">
                New to CultivAI? <Link to="/register" className="cv-link">Create an account</Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
    </motion.div>
  );
};

export default LoginPage;

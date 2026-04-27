// src/RoutesManager.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AnimatePresence } from 'framer-motion'; // Added for transitions

import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import App from './App';
import "./App.css";

const RoutesManager = () => {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(true);
  const [processing, setProcessing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const clearOAuthParams = () => {
    const url = new URL(window.location.href);
    ['code', 'state', 'error', 'error_description', 'iss', 'client_id'].forEach(p =>
      url.searchParams.delete(p)
    );
    const cleaned =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') +
      url.hash;
    window.history.replaceState({}, '', cleaned);
  };

  const setUserFromSession = async () => {
    try {
      const s = await fetchAuthSession();
      const tokens = s?.tokens;
      if (tokens?.idToken || tokens?.accessToken) {
        try {
          const u = await getCurrentUser();
          setUser(u);
        } catch {
          setUser({ username: 'authenticated_user' });
        }
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const tryExchange = async () => {
    setProcessing(true);
    for (let i = 0; i < 6; i++) {
      const ok = await setUserFromSession();
      if (ok) {
        clearOAuthParams();
        setProcessing(false);
        setBusy(false);
        navigate('/dashboard', { replace: true });
        return;
      }
      await new Promise(r => setTimeout(r, 250 + i * 250));
    }
    console.error('OAuth code exchange did not produce tokens');
    clearOAuthParams();
    setProcessing(false);
    setBusy(false);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const unsub = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        setUserFromSession();
      }
      if (payload.event === 'signedOut') {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasError = params.get('error');
    const hasCode = params.get('code');

    if (hasError) {
      clearOAuthParams();
      setBusy(false);
      navigate('/login', { replace: true });
      return;
    }

    if (hasCode) {
      tryExchange();
      return;
    }

    (async () => {
      const ok = await setUserFromSession();
      setBusy(false);
      if (!ok) setUser(null);
    })();
  }, [location.search, location.pathname, navigate]);

  if (busy || processing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: 10,
        fontSize: 18
      }}>
        <div>{processing ? 'Completing Google Sign‑in…' : 'Loading…'}</div>
        {processing && (
          <div style={{ fontSize: 14, color: '#666' }}>
            Processing authentication, please wait…
          </div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!user ? <SignUpPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={user ? <App /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default RoutesManager;
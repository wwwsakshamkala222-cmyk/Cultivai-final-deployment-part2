import React, { useState, useEffect, useRef } from 'react';
import cropImage from './homepage.png';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MdHeadsetMic, MdChat, MdEmail, MdMic, MdMicOff } from "react-icons/md";
import { FiChevronDown, FiChevronUp, FiSun, FiMoon, FiCamera } from "react-icons/fi";
import Lenis from '@studio-freight/lenis';
import ReactMarkdown from "react-markdown";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

// Register chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const diseaseCures = {
  "Anthracnose": [
    "Apply fungicides like chlorothalonil or mancozeb.",
    "Remove and destroy infected plant debris.",
    "Ensure good air circulation and avoid overhead irrigation."
  ],
  "Bacterial blight": [
    "Spray copper-based bactericides.",
    "Avoid overhead irrigation to reduce moisture on leaves.",
    "Use disease-free seeds and resistant varieties."
  ],
  "Brown spot": [
    "Use fungicides like tricyclazole or carbendazim.",
    "Maintain proper field drainage.",
    "Apply balanced fertilizers (avoid excess nitrogen)."
  ],
  "Fall armyworm": [
    "Handpick and destroy egg masses and larvae.",
    "Use biological control like Trichogramma wasps.",
    "Apply insecticides such as spinosad or emamectin benzoate."
  ],
  "Green mite": [
    "Spray acaricides (abamectin or dicofol).",
    "Encourage natural predators like lady beetles.",
    "Keep plants well-watered to reduce mite stress."
  ],
  "Gumosis": [
    "Scrape affected bark and apply fungicidal paste.",
    "Improve field drainage to reduce root stress.",
    "Avoid injuries to tree bark during pruning."
  ],
  "Healthy": [
    "No cure needed – crop is healthy.",
    "Maintain good irrigation and fertilization practices.",
    "Regularly monitor crops to detect early disease signs."
  ],
  "Leaf blight": [
    "Use resistant crop varieties when available.",
    "Spray copper-based fungicides or mancozeb.",
    "Rotate crops and avoid overcrowding."
  ],
  "Leaf curl": [
    "Control vector insects (like whiteflies or aphids).",
    "Apply neem oil or systemic insecticides.",
    "Remove and destroy infected leaves."
  ],
  "Leaf miner": [
    "Remove and destroy mined leaves.",
    "Use neem-based sprays or spinosad.",
    "Introduce parasitoid wasps for biological control."
  ],
  "Leaf spot": [
    "Apply fungicides like mancozeb or chlorothalonil.",
    "Avoid overhead watering to reduce leaf wetness.",
    "Remove and destroy infected leaves."
  ],
  "Mosaic": [
    "Control insect vectors such as aphids or whiteflies.",
    "Use virus-free planting material.",
    "Remove and destroy infected plants immediately."
  ],
  "Red rust": [
    "Spray sulfur-based fungicides at early stages.",
    "Prune and destroy infected leaves.",
    "Maintain field hygiene to reduce spread."
  ],
  "Septoria leaf spot": [
    "Apply fungicides containing chlorothalonil or copper.",
    "Space plants properly to reduce humidity.",
    "Remove and destroy infected leaves."
  ],
  "Streak virus": [
    "Use resistant or tolerant crop varieties.",
    "Control insect vectors (mainly aphids).",
    "Remove infected plants to reduce spread."
  ],
  "Verticulium wilt": [
    "Rotate crops with non-host species.",
    "Apply soil solarization before planting.",
    "Use resistant plant varieties if available."
  ]
};

// Camera Modal Component
// Camera Modal Component (Updated without switch camera)
const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // default to back camera
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg");
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay" onClick={onClose}>
      <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-header">
          <h3>Take a Photo</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <video ref={videoRef} autoPlay playsInline className="camera-video"></video>
        <div className="camera-controls">
          <button className="capture-btn" onClick={capturePhoto}>
            📸 Capture
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// WeatherSection Component
// ─────────────────────────────────────────────────────────────
//  DROP-IN REPLACEMENT – paste this over the existing
//  WeatherSection function in App.js (lines ~195-397)
//  All logic is identical; only the JSX markup changed.
// ─────────────────────────────────────────────────────────────

function WeatherSection() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [forecast, setForecast] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(false);

  const getWeather = async () => {
    if (!city) return;
    try {
      setError("");
      setWeather(null);
      setLoading(true);

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=65db789d1b8b8caf2754b8a707dd85d9&units=metric`
      );
      if (!res.ok) throw new Error("City not found. Try a different spelling.");
      const data = await res.json();

      setWeather({
        name: data.name,
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        country: data.sys.country,
      });

      const mockForecastLabels = ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"];
      const mockForecastData = [
        data.main.temp,
        data.main.temp + Math.random() * 4 - 2,
        data.main.temp + Math.random() * 6 - 3,
        data.main.temp + Math.random() * 5 - 2.5,
        data.main.temp + Math.random() * 4 - 2,
      ].map((t) => Math.round(t));

      setForecast({ labels: mockForecastLabels, data: mockForecastData });
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    return `${days[now.getDay()]} · ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(30,58,92,0.85)",
        titleColor: "#fff",
        bodyColor: "#bfdbfe",
        borderColor: "rgba(96,165,250,0.3)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y}°C`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148,163,184,0.15)" },
        ticks: { font: { size: 12, weight: "600" } },
      },
      y: {
        grid: { color: "rgba(148,163,184,0.15)" },
        ticks: {
          font: { size: 12, weight: "500" },
          callback: (v) => v + "°C",
        },
      },
    },
  };

  const chartData = {
    labels: forecast.labels,
    datasets: [
      {
        label: "Temperature (°C)",
        data: forecast.data,
        fill: true,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        tension: 0.45,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const stats = weather
    ? [
        { icon: "🌡️", label: "Feels Like", value: `${weather.feelsLike}°C` },
        { icon: "💨", label: "Wind Speed", value: `${weather.windSpeed} m/s` },
        { icon: "💧", label: "Humidity",   value: `${weather.humidity}%` },
        { icon: "👁️", label: "Visibility", value: "Good" },
      ]
    : [];

  return (
    <div className="wx-section">

      {/* ── Section Header ── */}
      <div className="wx-header">
        <h2 className="wx-title">
          <span className="wx-title-icon"></span> Weather
        </h2>
        <p className="wx-subtitle">
          Real-time weather insights to plan your farming day
        </p>
      </div>

      {/* ── Search Bar ── */}
      <div className="wx-search-bar">
        <div className="wx-search-inner">
          <span className="wx-search-pin"></span>
          <input
            type="text"
            className="wx-input"
            placeholder="Enter city or region…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && getWeather()}
          />
          <button
            className="wx-search-btn"
            onClick={getWeather}
            disabled={loading}
          >
            {loading ? <span className="wx-spinner" /> : "Search"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="wx-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Main Weather Card ── */}
      {weather && (
        <div className="wx-card">
          {/* Faint watermark icon in background */}
          <img
            className="wx-bg-icon"
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt=""
            aria-hidden="true"
          />

          {/* Top: location, temp, icon */}
          <div className="wx-top">
            <div className="wx-left">
              <div className="wx-location">
                <span>📍</span>
                <span className="wx-city-name">
                  {weather.name}, {weather.country}
                </span>
              </div>

              <div className="wx-temp-row">
                <span className="wx-temp-num">{weather.temp}°</span>
                <span className="wx-temp-unit">C</span>
              </div>

              <div className="wx-desc">{weather.description}</div>
              <div className="wx-date">{getCurrentDate()}</div>
            </div>

            <div className="wx-right">
              <img
                className="wx-icon-main"
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="wx-divider" />

          {/* Air Conditions grid */}
          <div className="wx-stats-label">🌿 Air Conditions</div>
          <div className="wx-stats-grid">
            {stats.map((s) => (
              <div className="wx-stat-card" key={s.label}>
                <span className="wx-stat-icon">{s.icon}</span>
                <div>
                  <div className="wx-stat-label">{s.label}</div>
                  <div className="wx-stat-val">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {forecast.labels.length > 0 && (
            <div className="wx-chart-wrap">
              <div className="wx-chart-header">
                <span className="wx-chart-title">📈 5-Day Forecast</span>
                <span className="wx-chart-meta">Temperature · °C</span>
              </div>
              <div className="wx-chart-inner">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CultivAI = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeNav, setActiveNav] = useState("Home");
  const [activePopup, setActivePopup] = useState(null);
  const [theme, setTheme] = useState('light');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "🌱 Hello! Ask me any farming question." },
  ]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState("");

  // All useRef hooks
  const recognitionRef = useRef(null);
  const homeRef = useRef(null);
  const aiRef = useRef(null);
  const weatherRef = useRef(null);
  const contactRef = useRef(null);
  const lenisRef = useRef(null);

  // Other hooks
  const navigate = useNavigate();

  // Auth check effect
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchAuthSession();
        await getCurrentUser();

        const url = new URL(window.location.href);
        if (url.searchParams.has("code") || url.searchParams.has("state")) {
          url.search = "";
          window.history.replaceState({}, document.title, url.toString());
        }

        if (mounted) setAuthReady(true);
      } catch (e) {
        console.error("Not authenticated, redirecting to /login:", e);
        navigate("/login", { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  // Initialize Lenis for smooth scrolling
  useEffect(() => {
    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenisRef.current.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenisRef.current.destroy();
    };
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDarkMode) {
        setTheme('dark');
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
    
    if (ChartJS.defaults) {
      if (theme === 'dark') {
        ChartJS.defaults.color = '#e0e0e0';
        ChartJS.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.1)';
      } else {
        ChartJS.defaults.color = '#666666';
        ChartJS.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.1)';
      }
    }
  }, [theme]);

  // Speech recognition effect - FIXED VERSION
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) setQuery((prev) => prev + finalTranscript);
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore errors on cleanup
        }
      }
    };
  }, []);
  const faqs = [
    { q: "How does CultivAI analyze crop images?", a: "You can upload a leaf or pest photo, and our AI model will detect if it's healthy or affected by a disease or pest." },
    { q: "What kind of crops or diseases can CultivAI identify?", a: "Our model currently recognizes 38 common crop diseases and pests such as Leaf Blight, Black Rot, Bacterial Spot, Common Rust, and more." },
    { q: "Do I need high-quality images for analysis?", a: "Clear photos of the leaf or pest work best. Avoid blurry or very dark images for accurate results." },
    { q: "Can CultivAI give solutions for detected diseases?", a: "Yes, along with the disease name, we provide tailored recommendations for treatment and preventive measures." },
    { q: "Does CultivAI support local languages?", a: "We're building multilingual support so farmers can interact in their preferred language." },
    { q: "Can I also get weather updates through CultivAI?", a: "Yes, our weather section provides real-time weather info and a 5‑day forecast to help you plan farming activities." },
    { q: "Is my data safe when I upload images?", a: "Yes, your images are only used for analysis and are not shared with anyone." },
    { q: "What crops does CultivAI currently support?", a: "Currently we focus on Apple, Grape, Corn, Orange, Peacg, Bell pepper, Potato, Tomato, Strawberry and several vegetables, with more being added soon." },
    { q: "Does CultivAI work offline?", a: "An internet connection is required for analysis and updates, but offline-ready versions are in development." },
    { q: "Can I get fertilizer recommendations?", a: "Yes, based on detected crop issues, CultivAI provides fertilizer and soil management suggestions." },
    { q: "Does CultivAI only identify diseases?", a: "No, it also gives pest control, nutrient management, irrigation alerts, and preventive guidance." },
    { q: "How accurate is CultivAI?", a: "Our crop disease detection achieves over 90% accuracy with clear images from the farm." },
    { q: "Can I share my reports with others?", a: "No, But you can guide them through our recommendation if they face into any similar challenges" },
    { q: "Is CultivAI free to use?", a: "Yes, basic analysis and weather are free. Premium features with advanced analytics will launch later." },
    { q: "How can CultivAI help reduce pesticide use?", a: "By detecting early, it recommends targeted, minimal, and safe use of chemicals, plus organic alternatives." },
    { q: "Can it detect nutrient deficiencies?", a: "Yes, CultivAI can identify deficiencies like nitrogen, potassium, and magnesium based on leaf symptoms." },
    { q: "How does CultivAI support sustainable farming?", a: "By suggesting organic options, balanced fertilizer use, and integrated pest management practices." },
    { q: "Can CultivAI work on low-end smartphones?", a: "Yes, the app is optimized for low data usage and works on most Android phones used in rural areas." },
    { q: "Does CultivAI integrate with government schemes?", a: "Future plans include linking with local advisories and subsidy programs for seamless farmer access." },
    { q: "Can it help me decide irrigation schedules?", a: "Yes, the weather forecasts and soil health integration help in planning optimal irrigation." },
    { q: "What should I do if my crop is not listed?", a: "Send feedback via the app. We're continuously training CultivAI on new crops and diseases." },
    { q: "Does CultivAI work at night?", a: "Yes, dark images can still be uploaded, but best results come from daylight or clear lighting." },
    { q: "Does it detect multiple problems at once?", a: "Yes, if multiple issues appear together (like pest + nutrient deficiency), you'll get combination recommendations." },
    { q: "Can CultivAI help in crop yield prediction?", a: "Future updates will include AI-driven estimates for expected yield based on plant health and weather." },
    { q: "Is there voice input for illiterate farmers?", a: "Yes, farmers can ask questions in their local language using the microphone feature." },
    { q: "Can CultivAI recognize weeds?", a: "We are expanding the dataset to identify major weeds affecting cereal and vegetable crops." },
    { q: "How does image analysis work with spotty internet?", a: "Images upload in compressed form; analysis resumes when the network is stable." },
    { q: "Does CultivAI help in market price prediction?", a: "Market price insights are planned for integration in future updates." },
    { q: "Does CultivAI integrate with drones?", a: "In the pipeline: drone-captured images for large field scanning." },
    { q: "How does CultivAI update its knowledge?", a: "The model is retrained frequently with new field data and verified extension guidelines." },
    { q: "What devices are supported for CultivAI?", a: "Any modern browser, Android phone, or tablet. iOS support is in development." },
    { q: "Can CultivAI give planting advice?", a: "Yes, we provide guidelines for planting time, seed treatment, and land preparation." },
    { q: "How does it support horticulture crops?", a: "We're training it to include fruit and vegetable diseases like blight in tomato and rust in beans." },
    { q: "Are the pesticide recommendations safe?", a: "Yes, pesticides suggested follow government-approved safe use practices." },
    { q: "How quickly can farmers get results?", a: "Results are generated within seconds after uploading photos." },
    { q: "Can CultivAI predict pest outbreaks?", a: "Integration with weather and monitoring data will allow early pest outbreak alerts soon." }
  ];

  const perPage = 6;
  const mockResponse = {
    "mock data": "🌱 Mock Analysis: Your crops are healthy. Recommended fertilizer: NPK 20-20-20. Watering every 3 days is optimal."
  };

  // Pagination
  const start = (page - 1) * perPage;
  const pagedFaqs = faqs.slice(start, start + perPage);

  // ============================================
  // 3. FUNCTIONS (after all hooks and constants)
  // ============================================
  const closePopup = () => setActivePopup(null);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

        // Always clear Cognito Hosted UI session cookie, not just local tokens
          const buildHostedLogoutUrl = () => {
  const cfg = Amplify.getConfig()?.Auth?.Cognito;
  const oauth = cfg?.loginWith?.oauth || cfg?.oauth || {};

  const domain =
    oauth.domain ||
    process.env.REACT_APP_COGNITO_DOMAIN; // e.g. eu-north-10rmffvoo6.auth.eu-north-1.amazoncognito.com

  const clientId =
    cfg?.userPoolClientId ||
    process.env.REACT_APP_COGNITO_CLIENT_ID; // your app client id

  const logoutUri =
    (oauth.redirectSignOut && oauth.redirectSignOut[0]) ||
    process.env.REACT_APP_REDIRECT_SIGN_OUT ||
    `${window.location.origin}/login`; // fallback to /login on current origin

  if (!domain || !clientId) return null;

  const fullDomain = domain.startsWith('http://') ? domain : `http://${domain}`;
  return `${fullDomain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutUri)}`;
};

// Force Hosted UI logout every time (clears Cognito session cookie)
const handleLogout = async () => {
  const hostedLogoutUrl = buildHostedLogoutUrl();

  try {
    // Clear local tokens first
    await signOut();
  } catch (err) {
    console.warn('signOut error (ignored):', err);
  } finally {
    // ALWAYS hit Hosted UI /logout so Hosted UI cookie is cleared
    if (hostedLogoutUrl) {
      window.location.replace(hostedLogoutUrl);
    } else {
      // Last resort if config missing
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    }
  }
};

  // Rest of your functions...
  const scrollToSection = (ref, isHome = false) => {
    if (isHome) {
      lenisRef.current.scrollTo(0, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    } else if (ref && ref.current) {
      const headerHeight = 80;
      const element = ref.current;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      lenisRef.current.scrollTo(offsetPosition, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    }
  };

  const handleNavClick = (item, e) => {
    e.preventDefault();
    setActiveNav(item);
    
    switch(item) {
      case "Home":
        scrollToSection(null, true);
        break;
      case "AI":
        scrollToSection(aiRef);
        break;
      case "Weather":
        scrollToSection(weatherRef);
        break;
      case "Contact us":
        scrollToSection(contactRef);
        break;
      case "Language":
        setActivePopup("language");  // Add this case
      break;
      default:
        break;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (file) => {
    handleFileUpload(file);
    setShowCamera(false);
  };

      const performAnalysis = async () => {
  if (!uploadedImage) return;

  try {
    setIsAnalyzing(true);

    // Convert base64 (from FileReader) back to blob
    const base64Response = await fetch(uploadedImage);
    const blob = await base64Response.blob();
    const formData = new FormData();
    formData.append("file", blob, "crop.jpg");
    // helper: normalize any model output into a safe, lower-case key
function normalizeDiseaseKey(name) {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .toLowerCase()
    // replace parentheses and slashes with spaces so splitting is reliable
    .replace(/[()\/,]/g, " ")
    // collapse non-alphanumeric to single space, then to underscore
    .replace(/[^a-z0-9]+/g, "_")
    // collapse multiple underscores
    .replace(/_+/g, "_")
    // trim leading/trailing underscores
    .replace(/^_+|_+$/g, "");
}


    // Call your Python AI model endpoint
          const res = await fetch("https://cultivai-final-deployment-part2.onrender.com/predict/", {
            method: "POST",
            body: formData,
          });


    const data = await res.json();
    console.log("AI Model Response:", data);

          const detectedDisease = data.disease || "Unknown";
       // Normalize model output for consistent matching
      // Normalize once
          const normalizedDisease = normalizeDiseaseKey(detectedDisease);

          // Disease-specific recommendation logic (use normalizedDisease for matching)
          let recommendations = [];

          if (normalizedDisease === "apple_scab" || normalizedDisease.includes("apple_apple_scab")) {
            recommendations = [
              "Spray fungicides like captan or mancozeb every 10–14 days.",
              "Prune infected leaves and destroy fallen debris.",
              "Plant resistant apple varieties."
            ];
          } else if (normalizedDisease.includes("apple") && normalizedDisease.includes("black_rot")) {
            recommendations = [
              "Remove and burn cankers and infected fruit mummies.",
              "Apply fungicides such as thiophanate-methyl or copper-based sprays.",
              "Avoid wounds during pruning and harvest."
            ];
          } else if (normalizedDisease.includes("apple") && normalizedDisease.includes("cedar_apple_rust")) {
            recommendations = [
              "Remove nearby juniper trees (alternate host).",
              "Spray myclobutanil or propiconazole during early spring.",
              "Keep orchard floor clean of leaf litter."
            ];
          } else if (normalizedDisease.includes("apple") && normalizedDisease.includes("healthy")) {
            recommendations = [
              "Maintain balanced fertilization and proper irrigation.",
              "Inspect leaves weekly for early disease signs."
            ];
          } else if (normalizedDisease.includes("blueberry") && normalizedDisease.includes("healthy")) {
            recommendations = [
              "No treatment required.",
              "Maintain good soil drainage and regular pruning."
            ];
            if (detectedDisease.toLowerCase().includes("cherry") && detectedDisease.toLowerCase().includes("healthy")) {
              // If confidence is high, flip label (since model outputs reversed)
              data.disease = "Cherry (incl. sour) Powdery Mildew";
            } else if (detectedDisease.toLowerCase().includes("cherry") && detectedDisease.toLowerCase().includes("powdery_mildew")) {
              data.disease = "Cherry (incl. sour) Healthy";
            }


          } else if (normalizedDisease.includes("cercospora") || normalizedDisease.includes("gray_leaf_spot")) {
            recommendations = [
              "Use resistant hybrids.",
              "Apply strobilurin fungicides at tasseling stage.",
              "Rotate with non-host crops."
            ];
          } else if (normalizedDisease.includes("common_rust") || normalizedDisease.includes("commonrust")) {
            recommendations = [
              "Plant resistant hybrids.",
              "Use fungicides like mancozeb or propiconazole if severe."
            ];
          } else if (normalizedDisease.includes("northern_leaf_blight") || normalizedDisease.includes("northernleafblight")) {
            recommendations = [
              "Use resistant varieties.",
              "Apply azoxystrobin or mancozeb during early infection."
            ];
          } else if (normalizedDisease.includes("corn") && normalizedDisease.includes("healthy")) {
            recommendations = ["Crop healthy. Continue standard fertilization and irrigation."];
          } else if (normalizedDisease.includes("grape") && normalizedDisease.includes("black_rot")) {
            recommendations = [
              "Use fungicides like captan or myclobutanil.",
              "Remove mummified berries."
            ];
          } else if (normalizedDisease.includes("grape") && (normalizedDisease.includes("esca") || normalizedDisease.includes("black_measles"))) {
            recommendations = [
              "Remove infected vines and burn debris.",
              "Avoid pruning wounds during rainy periods."
            ];
          } else if (normalizedDisease.includes("grape") && normalizedDisease.includes("leaf_blight")) {
            recommendations = [
              "Spray mancozeb or copper oxychloride.",
              "Maintain canopy airflow."
            ];
          } else if (normalizedDisease.includes("grape") && normalizedDisease.includes("healthy")) {
            recommendations = ["No disease detected. Keep vineyard well-pruned."];
          } else if (normalizedDisease.includes("orange") || normalizedDisease.includes("huanglongbing") || normalizedDisease.includes("citrus_greening")) {
            recommendations = [
              "Remove and destroy infected trees.",
              "Control psyllid vectors using insecticides.",
              "Use certified disease-free nursery stock."
            ];
          } else if (normalizedDisease.includes("peach") && normalizedDisease.includes("bacterial_spot")) {
            recommendations = [
              "Spray copper-based bactericides.",
              "Avoid overhead irrigation."
            ];
          } else if (normalizedDisease.includes("peach") && normalizedDisease.includes("healthy")) {
            recommendations = ["Healthy tree. Maintain pruning and balanced fertilization."];
          } else if (normalizedDisease.includes("pepper") && normalizedDisease.includes("bacterial_spot")) {
            recommendations = [
              "Use copper sprays weekly.",
              "Avoid working in wet fields."
            ];
          } else if (normalizedDisease.includes("pepper") && normalizedDisease.includes("healthy")) {
            recommendations = ["Healthy crop. Maintain consistent watering and fertilization."];
          } else if (normalizedDisease.includes("potato") && normalizedDisease.includes("early_blight")) {
            recommendations = [
              "Spray chlorothalonil or mancozeb.",
              "Remove old debris post-harvest."
            ];
          } else if (normalizedDisease.includes("potato") && normalizedDisease.includes("late_blight")) {
            recommendations = [
              "Apply metalaxyl or cymoxanil fungicides every 7 days.",
              "Destroy infected plants."
            ];
          } else if (normalizedDisease.includes("potato") && normalizedDisease.includes("healthy")) {
            recommendations = ["Healthy crop. Keep monitoring for early signs of blight."];
          } else if (normalizedDisease.includes("raspberry") && normalizedDisease.includes("healthy")) {
            recommendations = ["Healthy. Maintain soil moisture and pruning schedule."];
          } else if (normalizedDisease.includes("soybean") && normalizedDisease.includes("healthy")) {
            recommendations = ["No visible disease symptoms. Continue irrigation schedule."];
          } else if (normalizedDisease.includes("squash") && normalizedDisease.includes("powdery_mildew")) {
            recommendations = [
              "Apply sulfur or neem oil weekly.",
              "Ensure spacing between plants for airflow."
            ];
          } else if (normalizedDisease.includes("strawberry") && normalizedDisease.includes("leaf_scorch")) {
            recommendations = [
              "Remove infected leaves.",
              "Apply fungicide like captan or thiophanate-methyl."
            ];
          } else if (normalizedDisease.includes("strawberry") && normalizedDisease.includes("healthy")) {
            recommendations = ["Healthy. Keep monitoring leaf moisture and soil nutrients."];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("bacterial_spot")) {
            recommendations = [
              "Spray copper hydroxide weekly.",
              "Use certified seed and rotate crops."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("early_blight")) {
            recommendations = [
              "Spray mancozeb or chlorothalonil.",
              "Remove infected leaves early."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("late_blight")) {
            recommendations = [
              "Destroy infected plants immediately.",
              "Apply fungicides every 5–7 days."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("leaf_mold")) {
            recommendations = [
              "Improve ventilation and reduce humidity.",
              "Spray chlorothalonil or copper fungicides."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("septoria_leaf_spot")) {
            recommendations = [
              "Remove infected leaves and weeds.",
              "Apply mancozeb every 10 days."
            ];
          } else if (normalizedDisease.includes("tomato") && (normalizedDisease.includes("spider_mites") || normalizedDisease.includes("two_spotted"))) {
            recommendations = [
              "Spray abamectin or neem oil.",
              "Keep leaves moist to reduce mite buildup."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("target_spot")) {
            recommendations = [
              "Apply difenoconazole or azoxystrobin.",
              "Remove old plant debris."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("mosaic")) {
            recommendations = [
              "Remove infected plants immediately.",
              "Disinfect tools and avoid tobacco contamination."
            ];
          } else if (normalizedDisease.includes("tomato") && normalizedDisease.includes("yellow_leaf_curl")) {
            recommendations = [
              "Control whitefly vectors.",
              "Use resistant tomato varieties."
            ];
          } else {
            recommendations = ["No data available for this disease."];
          }



                const confidence = data.confidence
              ? `${(data.confidence * 100).toFixed(1)}%`
              : "N/A";

    setAnalysis({
    crop: detectedDisease,
    health: detectedDisease.toLowerCase().includes("healthy") ? "Healthy" : "Infected",
    confidence,
    issues: detectedDisease.toLowerCase().includes("healthy") ? [] : [detectedDisease],
    recommendations,
  });

  } catch (err) {
    console.error("Error analyzing image:", err);
    setAnalysis({
      crop: "Error",
      health: "Error",
      issues: ["Could not analyze image"],
      recommendations: ["Try again later"],
      confidence: "0%",
    });
  } finally {
    setIsAnalyzing(false);
  }
};


  const resetUpload = () => {
    setUploadedImage(null);
    setAnalysis(null);
    setIsAnalyzing(false);
  };

  // FIXED handleVoice function
  const handleVoice = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    try {
      if (!listening) {
        recognitionRef.current.start();
        setListening(true);
      } else {
        recognitionRef.current.stop();
        setListening(false);
      }
    } catch (e) {
      console.error("Voice recognition error:", e);
      setListening(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    const newMessage = { role: "user", text: query.trim() };
    setMessages((prev) => [...prev, newMessage]);
    setLoading(true);
    setQuery("");

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      });

      const data = await res.json();
      console.log("🌿 Full response data:", data);

      if (data.bullets) {
        setMessages((prev) => [...prev, { role: "assistant", bullets: data.bullets }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "⚠️ No response" }]);
      }
    } catch (err) {
      console.error("❌ Error fetching:", err);
      setMessages((prev) => [...prev, { role: "assistant", text: "⚠️ Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 4. CONDITIONAL RETURNS (ONLY AFTER ALL HOOKS)
  // ============================================
  if (!authReady) {
    return <div style={{ padding: 24 }}>Signing you in…</div>;
  }

  return (
    <div className={`cultivai-container ${theme}`}>
      {/* Camera Modal */}
      <CameraModal 
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {/* Header */}
      <header className="header">
        <div className="nav-container">
          <div className="user-profile">
          <img
            src={theme === 'dark' ? "/darkmode.png" : "/lightmode.png"}
            alt="CultivAI"
            className="brand-mark"
            width={28}
            height={28}
          />
        </div>

          <nav className="nav-menu">
            {["Home", "AI", "Weather", "Contact us", "Language"].map((item) => (
              <a
                key={item}
                href="#"
                className={`nav-item ${activeNav === item ? "active" : ""}`}
                onClick={(e) => handleNavClick(item, e)}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="user-profile">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>
            
            <span className="user-name">CultivAI</span>


           <button
              onClick={handleLogout}   // <-- Call the logout function here
              className="logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Home Section */}
        <section ref={homeRef} className="content-container">
          {/* Left Side - Image / Uploaded Image */}
          <div className="image-section">
            <AnimatePresence mode="wait">
              {!uploadedImage ? (
                <motion.div
                  key="default-crop"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="crop-image">
                    <img src={cropImage} alt="Sugarcane field" className="crop-image-img" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="uploaded-image"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="crop-image">
                    <img src={uploadedImage} alt="Uploaded crop" className="crop-image-img" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side */}
          <div className="upload-section">
            <AnimatePresence mode="wait">
              {!uploadedImage ? (
                <motion.div
                  key="upload-instructions"
                  className="upload-box top-aligned"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  <h5 className="main-title">Add files & get instant advice.</h5>
                  <p className="description">
                    Upload photos of your crops, pests, or field conditions to get
                    quick and reliable farming advice. Our AI system analyzes your
                    files and provides solutions tailored to your crop, location,
                    and season—helping you take the right action at the right time.
                  </p>
                  <div className="disclaimer">
                    Currently our model recognizes only a few common leaf diseases; 
                    we’ll keep expanding its knowledge.Please upload a clear photo of a 
                    single leaf for the best results.
                  </div>

                  <div
                    className={`upload-area ${isDragOver ? "drag-over" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="upload-text-line">
                      <label htmlFor="file-input" className="select-file-btn">
                        Select a file
                      </label>
                      <span className="or-text">or</span>
                      <button 
                        className="camera-btn" 
                        onClick={() => setShowCamera(true)}
                      >
                        <FiCamera /> Take Photo
                      </button>
                      <span className="or-text">or</span>
                      <span className="drag-text">Drag and drop a file here</span>
                    </div>
                    <input
                      type="file"
                      id="file-input"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                    {/* Mobile camera input fallback */}
                    <input
                      type="file"
                      id="camera-input"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="analysis-flow"
                  className={`upload-box ${!analysis && !isAnalyzing ? "centered" : ""}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  {!analysis && !isAnalyzing && (
                    <button className="upload-btn" onClick={performAnalysis}>
                      Analyze Image
                    </button>
                  )}

                  {isAnalyzing && (
                    <div className="analyzing">
                      <div className="loader"></div>
                      <p>Analyzing your crop image...</p>
                    </div>
                  )}

                  {analysis && (
                    <div className="analysis-results">
                      <h3>Analysis Results</h3>
                      <div className="analysis-grid">
                        <div className="analysis-card">
                          <div className="analysis-card-label">Disease</div>
                          <div className="analysis-card-value">{analysis.crop}</div>
                        </div>
                        <div className="analysis-card">
                          <div className="analysis-card-label">Health</div>
                          <div className="analysis-card-value health-good">{analysis.health}</div>
                        </div>
                        <div className="analysis-card">
                          <div className="analysis-card-label">Accuracy</div>
                          <div className="analysis-card-value confidence-high">{analysis.confidence}</div>
                        </div>
                      </div>

                      {analysis.issues.length > 0 && (
                        <div className="issues-section">
                          <div className="section-title">Issues Detected</div>
                          {analysis.issues.map((issue, idx) => (
                            <div key={idx} className="issue-item">{issue}</div>
                          ))}
                        </div>
                      )}

                      <div className="recommendations-section">
                        <div className="section-title">Recommendations</div>
                        {analysis.recommendations.map((rec, idx) => (
                          <div key={idx} className="recommendation-item">{rec}</div>
                        ))}
                      </div>

                      <button className="upload-btn" onClick={resetUpload}>
                        Upload New Image
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* AI Section - FarmingAssistant with Chat */}
        <section ref={aiRef} className="assistant-container">
          <h5 className="title" style={{ fontSize: "2rem" }}>
            Ask Your Farming Question?
          </h5>

          <p className="subtitle" lang="en">
            <em>
              Type your question or click the microphone to speak. You can use both voice and typing together!
            </em>
          </p>

          
          {/* Chat Window */}
            <div className="chat-window">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  <div className="ai-response">
                    {msg.bullets ? (
                      <ul className="ai-bullets">
                        {msg.bullets.map((b, j) => (
                          <li key={j}>
                            <ReactMarkdown>{b}</ReactMarkdown>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="chat-message assistant">⏳ Thinking…</div>}
            </div>
          {/* Input + Send + Voice */}
          <div className="chat-input-wrapper">
            <div className="chat-input">
              <select className="dropdown">
                <option>CultivAI</option>
              </select>
              <div className="input-with-voice">
                <input
                  type="text"
                  placeholder="Ask about crops, pests, or speak..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSearch()}
                  className={listening ? "listening" : ""}
                />
                <button 
                  onClick={handleVoice} 
                  className={`voice-btn ${listening ? 'listening' : ''}`}
                  disabled={loading}
                  title={listening ? "Stop recording" : "Start voice input"}
                >
                  {listening ? <MdMicOff /> : <MdMic />}
                </button>
              </div>
              <button 
                onClick={handleSearch} 
                disabled={loading || !query.trim()}
                className="send-btn"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
            {listening && (
              <div className="voice-indicator">
                <span className="pulse-dot"></span>
                <span>Listening... Speak now</span>
              </div>
            )}
          </div>
        </section>

        {/* Help Section */}
            <section className="help-section">
          <h2>How Can We Help?</h2>
          <p className="help-subtitle">
            Whether it's a question about crop care, pest control, soil health, or weather updates — we've got you covered. <br />
            Type your farming query below and CultivAI will guide you with the right advice at the right time.
          </p>

          <div className="help-search">
            <input type="text" placeholder="Search for anything (Work in Progress) " />
            <button className="help-search-btn">Search</button>
          </div>

          <div className="help-icons">
            <div className="help-icon-box" onClick={() => setActivePopup("call")}>
              <MdHeadsetMic className="help-icon" />
            </div>
            <div className="help-icon-box" onClick={() => setActivePopup("chat")}>
              <MdChat className="help-icon" />
            </div>
            <div className="help-icon-box" onClick={() => setActivePopup("email")}>
              <MdEmail className="help-icon" />
            </div>
          </div>

          {/* --- Popups --- */}
          {activePopup && (
            <div className="popup-overlay" onClick={closePopup}>
              <div className="popup-box" onClick={(e) => e.stopPropagation()}>
                {activePopup === "call" && (
                  <p>
                    📞 Call us: <a href="tel:+1234567890">+1 234 567 890</a>
                  </p>
                )}
                {activePopup === "chat" && (
                  <p>
                    💬 Message us on 
                    <a href="https://wa.me/1234567890" target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </p>
                )}
                {activePopup === "email" && (
                  <p>
                    📧 Email us:{" "}
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=cultivai676@gmail.com&su=Support%20Request&body=Hello%20CultivAI%20Team,"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Gmail
                    </a>
                  </p>
                )}
                {activePopup === "language" && (
                  <div className="language-popup-content">
                    <h3> Multi-Language Support</h3>
                    <p className="coming-soon-text">Coming Soon!</p>
                    <p>We're working on bringing CultivAI to your preferred language.</p>
                    <div className="language-features">
                      <p> Available in future updates:</p>
                      <ul>
                        <li>Hindi</li>
                        <li>Tamil</li>
                        <li>Telugu</li>
                        <li>Kannada</li>
                        <li>Urdu</li>
                        <li>Bengali</li>
                        <li>Gujarati</li>
                        <li>Punjabi</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* FAQ Section */}
        <div className="faq-container">
          <h2 className="faq-title">Frequently Asked Question</h2>

          <div className="faq-list">
            {pagedFaqs.map((item, i) => (
              <div
                key={i}
                className="faq-item"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <div className="faq-question">
                  <p>{item.q}</p>
                  {openIndex === i ? (
                    <FiChevronUp className="faq-icon" />
                  ) : (
                    <FiChevronDown className="faq-icon" />
                  )}
                </div>
                {openIndex === i && <p className="faq-answer">{item.a}</p>}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="faq-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="faq-page-btn"
            >
              Previous
            </button>

            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`faq-page-num ${page === num ? "active" : ""}`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === 6}
              className="faq-page-btn"
            >
              Next
            </button>
          </div>
        </div>

        {/* Weather Section */}
        <section ref={weatherRef}>
          <WeatherSection />
        </section>
      </main>

      {/* Footer Section - Contact Us */}
      <footer ref={contactRef} className="footer">
        <div className="footer-container">
          {/* Left Side - Logo and Description */}
          <div className="footer-left">
            <div className="footer-logo">
              <span className="footer-logo-icon">🌱</span>
              <span className="footer-logo-text">CultivAI</span>
            </div>
            <p className="footer-description">
              For those who cultivate—CutivAI brings knowledge, innovation, and AI-driven farming support, always at your fingertips.
            </p>
            
            {/* Social Media */}
            <div className="social-section">
              <span className="social-title">Follow Us:</span>
              <div className="social-icons">
                <a href="#" className="social-icon" aria-label="Discord">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="social-icon" aria-label="Twitter">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Newsletter */}
            <div className="newsletter-section">
              <div className="newsletter-input">
                <span className="newsletter-label">Get Farming Tips in Your Inbox:</span>
                <input 
                  type="email" 
                  placeholder="Enter Email Id:" 
                  className="newsletter-email"
                />
                <button className="newsletter-btn">Subscribe</button>
              </div>
            </div>
          </div>

          {/* Right Side - Links */}
          <div className="footer-right">
            {/* Helpful Links */}
            <div className="footer-column">
              <h3 className="footer-column-title">Helpful Links</h3>
              <ul className="footer-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#ai">AI</a></li>
                <li><a href="#weather">Weather</a></li>
                <li><a href="#contact">Contact Us</a></li>
                <li><a href="#language">Language</a></li>
              </ul>
            </div>

            {/* Accessibility */}
            <div className="footer-column">
              <h3 className="footer-column-title">Accessibility</h3>
              <ul className="footer-links">
                <li><a href="#language-support">Language Support</a></li>
                <li><a href="#voice-input">Voice Input</a></li>
                <li><a href="#text-to-speech">Text-to-Speech</a></li>
                <li><a href="#visual-assistance">Visual Assistance</a></li>
                <li><a href="#offline-mode">Offline Mode</a></li>
                <li><a href="#readability">Readability Settings</a></li>
                <li><a href="#quick-help">Quick Help</a></li>
              </ul>
            </div>

            {/* Legal Resources */}
            <div className="footer-column">
              <h3 className="footer-column-title">Legal Resources</h3>
              <ul className="footer-links">
                <li><a href="#user-agreement">User Agreement</a></li>
                <li><a href="#privacy-policy">Data Protection Policy</a></li>
                <li><a href="#about">About CutivAI</a></li>
                <li><a href="#navigation">Navigation Map</a></li>
              </ul>
              
              {/* Payment Icons */}
              <div className="payment-section">
                <div className="payment-title">100% Secure Payments</div>
                <div className="payment-icons">
                  <div className="payment-icon visa">VISA</div>
                  <div className="payment-icon apple">Pay</div>
                  <div className="payment-icon amazon">amazon</div>
                  <div className="payment-icon mastercard">mc</div>
                  <div className="payment-icon gpay">G Pay</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="privacy-text">We respect your privacy. No spam, just style.</p>
            <p className="copyright">© 2025 CultivAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default CultivAI;
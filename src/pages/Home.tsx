import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, MapIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from 'react';
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HeroContent from "../components/HeroContent";
import SectionDivider from "../components/SectionDivider";
import { useTheme } from "../context/ThemeContext";
import { getCurrentWeather, getAirQuality } from "../services/weatherService";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; text: string; icon: string } | null>(null);
  const [airQuality, setAirQuality] = useState<{ value: number; level: string } | null>(null);

  useEffect(() => {
    const fetchData = async (lat: number, lng: number) => {
      const [w, a] = await Promise.all([
        getCurrentWeather(lat, lng),
        getAirQuality(lat, lng)
      ]);
      setWeather(w);
      setAirQuality(a);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchData(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback to Seoul if denied or error
          fetchData(37.5665, 126.978);
        }
      );
    } else {
      // Browser doesn't support geolocation
      fetchData(37.5665, 126.978);
    }
  }, []);

  const menuItems = [
    { name: "홈", target: "section-hero" },
    { name: "흡연구역", target: "section-location" },
    { name: "혼잡도", target: "section-crowd" },
    { name: "산책로", target: "section-guide" },
    { name: "FAQ", target: "section-faq" },
  ];

  const handleScrollToSection = (targetId: string) => {
    if (location.pathname !== "/intro" && targetId !== "section-hero") {
      navigate(`/intro#${targetId}`);
    } else {
      if (location.pathname === "/" && targetId === "section-hero") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
    setMenuOpen(false);
  };
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden transition-colors duration-500 bg-white dark:bg-slate-950">
      <main className="w-full">
        <Navbar hideActions={true} />

        {/* Top Right Environment Info */}
        <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-1.5 pointer-events-none">
          <AnimatePresence>
            {weather && (
              <motion.div
                key="weather"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pl-2.5 pr-3 py-1.5 rounded-[16px] shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-2 pointer-events-auto w-[120px]"
              >
                <span className="text-lg w-5 h-5 flex items-center justify-center">{weather.icon}</span>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase leading-none mb-0.5">날씨</span>
                  <span className="text-[12px] font-black text-gray-800 dark:text-slate-100 leading-none">{Math.round(weather.temp)}° {weather.text}</span>
                </div>
              </motion.div>
            )}
            {airQuality && (
              <motion.div
                key="air-quality"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pl-2.5 pr-3 py-1.5 rounded-[16px] shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-2 pointer-events-auto w-[120px]"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${airQuality.level === '좋음' ? 'bg-blue-500' : airQuality.level === '보통' ? 'bg-green-500' : 'bg-red-500'} shadow-sm shadow-current/50 animate-pulse`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase leading-none mb-0.5">공기질</span>
                  <span className="text-[12px] font-black text-gray-800 dark:text-slate-100 leading-none">{airQuality.level} ({Math.round(airQuality.value)})</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hero Section */}
        <section id="section-hero" className="relative w-full page-section !p-0 z-[1]">
          <Hero />
          <SectionDivider type="wave" position="bottom" color="text-gray-100/60 dark:text-slate-900/40" />
        </section>

        {/* HeroContent Section - Main Landing Message */}
        <section id="section-hero-content" className="relative w-full page-section z-[10] flex items-center justify-center py-20">
          <HeroContent />
        </section>
      </main>

      {/* Mobile Only Fixed Footer (Section A) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden bg-white/90 backdrop-blur-md border-t border-gray-200 pb-[env(safe-area-inset-bottom)] transition-transform duration-300">
        <div className="flex justify-around items-center h-16 px-2">


          <button
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                navigate('/');
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full active:scale-90 transition-all ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <HomeIcon className="w-7 h-7" strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate('/navigation')}
            className={`flex-1 flex flex-col items-center justify-center h-full active:scale-90 transition-all ${location.pathname === '/navigation' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <MapIcon className="w-7 h-7" strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              if (location.pathname === '/intro') {
                const el = document.getElementById('section-servicevideo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/intro#section-servicevideo');
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full active:scale-90 transition-all ${location.pathname === '/intro' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <InformationCircleIcon className="w-7 h-7" strokeWidth={2} />
          </button>

          {/* New Relocated Buttons */}
          <div className="flex items-center gap-2 pr-2">
            <button
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-600 shadow-sm'}`}
            >
              <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Overlay */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-4 py-4 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
            >
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleScrollToSection(item.target)}
                  className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 text-sm font-bold text-gray-700 dark:text-slate-200 active:bg-gray-50 dark:active:bg-slate-700 flex items-center justify-center"
                >
                  {item.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

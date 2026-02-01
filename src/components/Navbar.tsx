import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// 1. 인터페이스에 부모(App.tsx)로부터 받는 함수 타입을 정의합니다.
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ hideActions = false }: { hideActions?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(window.innerWidth >= 1280);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setMenuOpen(false);
      } else {
        setMenuOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const menuItems = [
    { name: "홈", target: "section-hero" },
    { name: "흡연구역", target: "section-location" },
    { name: "혼잡도", target: "section-crowd" },
    { name: "산책로", target: "section-guide" },
    { name: "FAQ", target: "section-faq" },
  ];

  return (
    <>
      {/* Navbar Container */}
      <nav
        className={`fixed top-0 left-0 w-full transition-all duration-300 z-[100000] ${isScrolled ? "bg-black/20 backdrop-blur-md border-b border-white/10" : "bg-transparent"
          }`}
      >
        <div className="flex justify-between items-center px-8 py-6 w-full mx-auto relative">
          {/* Logo & Service Name */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              if (location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                navigate("/");
              }
            }}
          >
            <div className="w-14 h-14 overflow-hidden rounded-full border-2 border-white/20 shadow-lg">
              <img
                src={`${import.meta.env.BASE_URL}image/logo.png`}
                alt="FLOW 로고"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-4xl text-white leading-none tracking-wide drop-shadow-md">
              FLOW
            </span>
          </div>

          {/* Right Side: Theme Toggle & Hamburger */}
          {!hideActions && (
            <div className="flex items-center gap-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all bg-transparent active:scale-95 !p-0 ${theme === 'dark'
                  ? 'border border-white text-white hover:bg-white/20'
                  : 'border border-black text-black hover:bg-black/10'
                  }`}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" fill="white" fillOpacity="0.2"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                ) : (
                  <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.2"></path>
                  </svg>
                )}
              </button>

              {/* Hamburger Button */}
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all bg-transparent active:scale-95 !p-0 ${theme === 'dark'
                  ? 'border border-white text-white hover:bg-white/20'
                  : 'border border-black text-black hover:bg-black/10'
                  }`}
              >
                {menuOpen ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '32px', height: '32px' }}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '32px', height: '32px' }}>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                )}
              </button>
            </div>
          )}



          {/* Dropdown Menu Overlay - Moved inside relative container */}
          {!hideActions && (
            <motion.div
              initial="closed"
              animate={menuOpen ? "open" : "closed"}
              variants={{
                open: {
                  opacity: 1,
                  y: 0,
                  display: "block",
                  transition: { duration: 0.4, ease: "easeOut" }
                },
                closed: {
                  opacity: 0,
                  y: -20,
                  transitionEnd: { display: "none" },
                  transition: { duration: 0.3, ease: "easeIn" }
                }
              }}
              className="absolute top-24 right-8 w-64 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden py-4"
            >
              <ul className="flex flex-col">
                {menuItems.map((item, index) => (
                  <motion.li
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={menuOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleScrollToSection(item.target)}
                    className="px-8 py-4 text-white font-bold text-xl hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    {item.name}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </nav >
    </>
  );
}

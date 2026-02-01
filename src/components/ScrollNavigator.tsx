"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUpIcon, ChevronDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";

export default function ScrollNavigator() {
  const sectionsRef = useRef<HTMLElement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSections, setTotalSections] = useState(0);

  useLayoutEffect(() => {
    // Only select sections that are actual content sections
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(".page-section")
    );
    sectionsRef.current = sections;
    setTotalSections(sections.length);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;

      // Top exception
      if (scrollY < 10) {
        if (currentIndex !== 0) {
          setCurrentIndex(0);
          const sectionId = sectionsRef.current[0]?.id;
          if (sectionId) {
            sessionStorage.setItem('lastSection', sectionId);
          }
        }
        return;
      }

      const triggerPoint = scrollY + window.innerHeight * 0.4;
      const isBottom = window.innerHeight + Math.ceil(window.scrollY) >= document.documentElement.scrollHeight - 50;

      let newIndex = currentIndex;

      if (isBottom) {
        newIndex = totalSections - 1;
      } else {
        sectionsRef.current.forEach((section, index) => {
          const top = section.offsetTop;
          const bottom = top + section.offsetHeight;

          if (triggerPoint >= top && triggerPoint < bottom) {
            newIndex = index;
          }
        });
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        // Persist current section
        const sectionId = sectionsRef.current[newIndex]?.id;
        if (sectionId) {
          sessionStorage.setItem('lastSection', sectionId);
        }
      }
    };

    let scrollTicking = false;
    const handleScroll = () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          onScroll();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentIndex, totalSections]);

  const scrollTo = (index: number) => {
    if (index < 0 || index >= totalSections) return;
    const target = sectionsRef.current[index];
    if (!target) return;

    const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSections - 1;

  if (totalSections === 0) return null;

  // 3D High-Quality Glass Button Styles
  // - "Transparent Glass Bead" concept
  // - High transparency (low opacity bg), strong backdrop blur
  // - Sharp specular highlights (white inset) to define the sphere shape
  const buttonClass = "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_3px_rgba(255,255,255,0.95),0_6px_12px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-300";

  // Arrow Styles
  // - Suspended inside perception
  const iconClass = "w-6 h-6 text-blue-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]";

  // Arrow Spin Animation (Y-axis coin flip)
  const iconVariants = {
    initial: { rotateY: 0 },
    hover: {
      scale: 1.1,
      rotateY: 360,
      transition: { duration: 1.2 }
    },
    tap: {
      scale: 0.9,
      rotateY: 720, // Spin again/more on click
      transition: { duration: 0.6 }
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-4">
        {/* Note: AnimatePresence removed for simple logic or kept if needed for exit animations. 
            Here we just render buttons based on state. */}

        {!isFirst && !isLast && (
          <button
            onClick={() => scrollTo(currentIndex - 1)}
            className={buttonClass}
            aria-label="Previous Section"
          >
            <motion.div
              variants={iconVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="flex items-center justify-center"
            >
              <ChevronUpIcon className={iconClass} />
            </motion.div>
          </button>
        )}

        {!isLast && (
          <button
            onClick={() => scrollTo(currentIndex + 1)}
            className={buttonClass}
            aria-label="Next Section"
          >
            <motion.div
              variants={iconVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="flex items-center justify-center"
            >
              <ChevronDownIcon className={iconClass} />
            </motion.div>
          </button>
        )}

        {isLast && (
          <button
            onClick={scrollToTop}
            className={`${buttonClass} !bg-blue-500/10`}
            aria-label="Scroll to Top"
          >
            <motion.div
              variants={iconVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="flex items-center justify-center"
            >
              <ArrowUpIcon className={iconClass} />
            </motion.div>
          </button>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";

/**
 * FocusScroll Component
 * - Intersection Observer를 사용하여 화면 중앙 섹션 감지
 * - 중앙 섹션: scale(1.0), opacity(1)
 * - 주변 섹션: PC scale(0.85), Mobile scale(0.93), opacity(0.6)
 */
export default function FocusScroll() {
  useEffect(() => {
    const sections = document.querySelectorAll(".page-section");

    if (sections.length === 0) return;

    // Intersection Observer 설정 - 화면 중앙 40% 영역 감지
    const observerOptions: IntersectionObserverInit = {
      root: null, // viewport 기준
      rootMargin: "-30% 0px -30% 0px", // 상하 30%씩 제외 (중앙 40% 영역)
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5], // 다양한 임계값
    };

    const handleIntersection: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        const section = entry.target as HTMLElement;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
          // 중앙에 진입한 섹션
          section.classList.add("in-view");
          section.classList.remove("out-of-view");
        } else {
          // 중앙에서 벗어난 섹션
          section.classList.add("out-of-view");
          section.classList.remove("in-view");
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // 모든 섹션 관찰 시작
    sections.forEach((section) => {
      // 초기 상태: 첫 번째 섹션만 in-view, 나머지는 out-of-view
      if (section.id === "section-hero") {
        section.classList.add("in-view");
      } else {
        section.classList.add("out-of-view");
      }
      observer.observe(section);
    });

    // Cleanup
    return () => {
      sections.forEach((section) => {
        observer.unobserve(section);
      });
      observer.disconnect();
    };
  }, []);

  return null; // 렌더링 요소 없음
}

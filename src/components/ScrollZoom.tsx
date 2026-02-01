import { useEffect } from "react";

export default function ScrollZoom() {
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll<HTMLElement>(".page-section");

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // 섹션이 뷰포트에 들어왔는지 계산
        const sectionTop = rect.top;
        const sectionBottom = rect.bottom;

        // 뷰포트 중앙에 가까울수록 scale이 커짐
        if (sectionTop < windowHeight && sectionBottom > 0) {
          // 섹션의 중앙이 뷰포트 중앙에 얼마나 가까운지 계산
          const sectionCenter = sectionTop + rect.height / 2;
          const viewportCenter = windowHeight / 2;
          const distance = Math.abs(sectionCenter - viewportCenter);
          const maxDistance = windowHeight;

          // 거리를 기반으로 scale 계산 (1.0 ~ 1.05)
          const scale = 1 + (1 - Math.min(distance / maxDistance, 1)) * 0.05;

          // 투명도도 함께 조절 (0.7 ~ 1.0)
          const opacity = 0.7 + (1 - Math.min(distance / maxDistance, 1)) * 0.3;

          section.style.transform = `scale(${scale})`;
          section.style.opacity = opacity.toString();
          section.style.transition = "transform 0.3s ease-out, opacity 0.3s ease-out";
        }
      });
    };

    // 스크롤 이벤트 등록
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // 초기 실행
    handleScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null; // 이 컴포넌트는 시각적 요소를 렌더링하지 않음
}

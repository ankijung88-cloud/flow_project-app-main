import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface MergeScrollAnimationProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "both";
  delay?: number;
  className?: string;
}

/**
 * Merge 스크롤 애니메이션 컴포넌트
 *
 * 요소가 화면에 진입할 때 좌/우에서 중앙으로 모이는 애니메이션을 적용합니다.
 */
export function MergeScrollAnimation({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: MergeScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const getInitialX = () => {
    switch (direction) {
      case "left":
        return -100;
      case "right":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: getInitialX() }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: getInitialX() }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MergeSectionProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  className?: string;
  gap?: string;
}

/**
 * Merge 섹션 컴포넌트
 *
 * 좌우 콘텐츠가 스크롤 시 중앙으로 합쳐지는 효과를 제공합니다.
 */
export function MergeSection({
  leftContent,
  rightContent,
  className = "",
  gap = "gap-8",
}: MergeSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className={`flex flex-col lg:flex-row ${gap} ${className}`}>
      <motion.div
        initial={{ opacity: 0, x: -150 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -150 }}
        transition={{
          duration: 0.8,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="flex-1"
      >
        {leftContent}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 150 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 150 }}
        transition={{
          duration: 0.8,
          delay: 0.1,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="flex-1"
      >
        {rightContent}
      </motion.div>
    </div>
  );
}

interface MergeCardGridProps {
  children: React.ReactNode[];
  columns?: number;
  className?: string;
}

/**
 * Merge 카드 그리드 컴포넌트
 *
 * 그리드의 각 카드가 좌우에서 번갈아가며 중앙으로 모이는 효과를 제공합니다.
 */
export function MergeCardGrid({
  children,
  columns = 2,
  className = "",
}: MergeCardGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const gridCols = columns === 2
    ? "grid-cols-1 md:grid-cols-2"
    : columns === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : columns === 4
        ? "grid-cols-2 md:grid-cols-4"
        : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5";

  return (
    <div ref={ref} className={`grid ${gridCols} gap-6 ${className}`}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{
            opacity: 0,
            x: index % 2 === 0 ? -100 : 100,
            y: 20
          }}
          animate={isInView ? {
            opacity: 1,
            x: 0,
            y: 0
          } : {
            opacity: 0,
            x: index % 2 === 0 ? -100 : 100,
            y: 20
          }}
          transition={{
            duration: 0.7,
            delay: index * 0.1,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * 페이드인 섹션 컴포넌트
 */
export function FadeInSection({
  children,
  className = "",
  delay = 0,
}: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

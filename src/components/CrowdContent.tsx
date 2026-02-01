import { useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

export default function CrowdContent() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Track scroll progress as the section traverses the viewport
    // "start end": Top of section enters bottom of viewport
    // "end start": Bottom of section leaves top of viewport
    // We focus on the entry phase: "start 80%" to "center center" mostly
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "center center"],
    });

    // Animation Transforms mapped to scroll progress
    // 0.1 - 0.4: Video drops from higher up (-150px) and appears
    const videoOpacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
    const videoY = useTransform(scrollYProgress, [0.1, 0.4], [-150, 0]);

    // 0.6 - 0.9: Text drops from above (-100px) after a distinct gap
    const textOpacity = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);
    const textY = useTransform(scrollYProgress, [0.6, 0.9], [-100, 0]);

    return (
        <section ref={containerRef} className="relative w-full bg-transparent py-20 lg:py-32 transition-colors duration-500">
            <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20 px-4">

                {/* Left: Interactive Card Content (Appears Second) */}
                <motion.div
                    style={{ opacity: textOpacity, y: textY }}
                    className="lg:w-[40%] w-full"
                >
                    <div
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`
                            group cursor-pointer p-8 md:p-10 rounded-[2rem] transition-all duration-500
                            ${isExpanded
                                ? "bg-white shadow-2xl border-2 border-primary/40 scale-[1.02] dark:bg-white/10"
                                : "bg-white hover:bg-gray-50 shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-primary/20 dark:bg-white/5 dark:hover:bg-white/10"}
                        `}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className={`
                                    text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full
                                    ${isExpanded ? "bg-primary text-white" : "bg-primary/20 text-primary"}
                                `}>
                                    Smart Monitoring
                                </span>
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    className="text-primary"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </motion.div>
                            </div>

                            <h2 className="flex flex-col gap-1">
                                <span className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight transition-colors duration-300">
                                    실시간 인구 혼잡도
                                </span>
                                <span className="text-3xl md:text-5xl font-black text-primary leading-tight">
                                    스마트 모니터링
                                </span>
                            </h2>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                                        animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
                                        exit={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                                        transition={{ duration: 0.6, ease: "circOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-6 flex flex-col gap-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed word-keep-all border-t border-gray-200 dark:border-white/10 mt-2 transition-colors duration-300">
                                            <p className="font-medium">
                                                AI 기반의 정밀한 분석을 통해 실시간으로 변화하는 도시의 인구 밀집도를 직관적으로 확인하세요.
                                            </p>
                                            <p className="font-medium opacity-80">
                                                복잡한 도심 속에서도 여유로운 이동을 계획할 수 있도록,
                                                데이터 시각화 기술이 가장 최적의 경로와 타이밍을 제안합니다.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Video Content (Appears First) */}
                <motion.div
                    style={{ opacity: videoOpacity, y: videoY }}
                    className="lg:w-[55%] w-full"
                >
                    <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-200 relative group">
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 scale-110"
                            autoPlay
                            muted
                            loop
                            playsInline
                            src={`${import.meta.env.BASE_URL}video/video-03.mp4`}
                        >
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <p className="text-xl">Crowd Analysis Video</p>
                            </div>
                        </video>

                        {/* Play/Pause Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <button
                                onClick={togglePlay}
                                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white/40 transition-all pointer-events-auto active:scale-95"
                            >
                                {isPlaying ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                    </svg>
                                ) : (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}

import { motion } from "framer-motion";

interface SectionDividerProps {
    type: "wave" | "slant" | "curve" | "line";
    position: "top" | "bottom";
    color?: string;
}

export default function SectionDivider({ type, position, color }: SectionDividerProps) {
    const isBottom = position === "bottom";

    const renderSVG = () => {
        switch (type) {
            case "wave":
                return (
                    <svg
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className={`w-full h-[60px] md:h-[100px] lg:h-[120px] fill-current ${isBottom ? "" : "rotate-180"
                            }`}
                    >
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C41.13,38.82,143.25,83.56,321.39,56.44Z"></path>
                    </svg>
                );
            case "slant":
                return (
                    <svg
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className={`w-full h-[60px] md:h-[100px] lg:h-[120px] fill-current ${isBottom ? "" : "scale-x-[-1] rotate-180"
                            }`}
                    >
                        <path d="M1200 120L0 120 0 0z"></path>
                    </svg>
                );
            case "curve":
                return (
                    <svg
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className={`w-full h-[60px] md:h-[100px] lg:h-[120px] fill-current ${isBottom ? "" : "rotate-180"
                            }`}
                    >
                        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113,2,1200,34.74V120H0Z"></path>
                    </svg>
                );
            case "line":
                return (
                    <div className="w-full px-4 md:px-20 lg:px-40">
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-[1px]" />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className={`absolute ${position}-0 left-0 w-full z-10 pointer-events-none drop-shadow-sm ${color || "text-slate-100/70 dark:text-slate-900/50"
                }`}
        >
            {renderSVG()}
        </motion.div>
    );
}

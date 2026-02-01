import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function HeroContent() {
    const navigate = useNavigate();

    return (
        <div className="w-full flex flex-col items-center justify-center text-center">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: false }}
                className="flex flex-col items-center w-full px-4 md:px-8 max-w-[90%] 3xl:max-w-[1600px] 4xl:max-w-[2200px] 5xl:max-w-[3200px] gap-8 4xl:gap-10 5xl:gap-14"
            >
                <h1 className="text-5xl xs:text-6xl md:text-8xl 3xl:text-9xl 4xl:text-[10rem] 5xl:text-[12rem] font-black leading-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Flow
                </h1>
                <p className="text-lg xs:text-xl md:text-3xl 3xl:text-4xl 4xl:text-5xl 5xl:text-6xl max-w-3xl 3xl:max-w-4xl 4xl:max-w-6xl 5xl:max-w-[80rem] font-bold text-gray-700 dark:text-gray-300 opacity-90 break-keep leading-relaxed">
                    흡연부스 회피 내비게이션과<br className="hidden xs:block" /> 실시간 환경 정보를 통해<br />
                    더 쾌적한 도시 생활을 경험하세요.
                </p>
                <div className="flex flex-col gap-5 w-full max-w-[300px] xs:max-w-none items-center">
                    <button
                        onClick={() => navigate("/navigation")}
                        className="w-full xs:w-auto bg-gradient-to-r from-blue-600 to-green-600 text-white font-black py-4 px-10 xs:py-5 xs:px-14 md:py-6 md:px-20 3xl:py-8 3xl:px-28 4xl:py-10 4xl:px-36 5xl:py-12 5xl:px-44 rounded-full text-base xs:text-xl md:text-2xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl shadow-2xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] transition-all duration-300 transform hover:scale-105 active:scale-95"
                    >
                        경로 찾기
                    </button>
                    <button
                        onClick={() => navigate("/intro#section-servicevideo")}
                        className="w-full xs:w-auto bg-gradient-to-r from-blue-600 to-green-600 text-white font-black py-4 px-10 xs:py-5 xs:px-14 md:py-6 md:px-20 3xl:py-8 3xl:px-28 4xl:py-10 4xl:px-36 5xl:py-12 5xl:px-44 rounded-full text-base xs:text-xl md:text-2xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl shadow-2xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] transition-all duration-300 transform hover:scale-105 active:scale-95"
                    >
                        서비스 자세히 보기
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

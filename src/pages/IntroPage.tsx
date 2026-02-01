import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import SmokingMap from "../components/SmokingMap";
import CrowdMap from "../components/CrowdMap";
import WalkCourseList from "../components/WalkCourseList";
import WalkCourseMap from "../components/WalkCourseMap";
import SmokingBooth from "../components/SmokingBooth";
import Crowd from "../components/Crowd";
import SectionDivider from "../components/SectionDivider";
import Guide from "../components/Guide";
import Footer from "../components/footer";
import ScrollNavigator from "../components/ScrollNavigator";
import ScrollZoom from "../components/ScrollZoom";
import LocationService from "../components/LocationService";
import CongestionMonitoring from "../components/CongestionMonitoring";
import WalkRecommendation from "../components/WalkRecommendation";
import RegionDetail from "../components/RegionDetail";
import FocusScroll from "../components/FocusScroll";
import ServiceVideo from "../components/ServiceVideo";
import CrowdContent from "../components/CrowdContent";

interface Course {
    id: number;
    name: string;
    dist: string;
    lat: number;
    lng: number;
    desc: string;
    difficulty: "쉬움" | "보통" | "어려움";
    time: string;
    features: string[];
}

export default function IntroPage() {
    const [showMap, setShowMap] = useState(() => sessionStorage.getItem('showMap') === 'true');
    const [showCrowdMap, setShowCrowdMap] = useState(() => sessionStorage.getItem('showCrowdMap') === 'true');
    const [showWalkList, setShowWalkList] = useState(() => sessionStorage.getItem('showWalkList') === 'true');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(() => {
        const saved = sessionStorage.getItem('selectedCourse');
        return saved ? JSON.parse(saved) : null;
    });
    const [crowdSearchKeyword, setCrowdSearchKeyword] = useState(() => sessionStorage.getItem('crowdSearchKeyword') || "");
    const [showLocationService, setShowLocationService] = useState(() => sessionStorage.getItem('showLocationService') === 'true');
    const [showCongestionMonitoring, setShowCongestionMonitoring] = useState(() => sessionStorage.getItem('showLocationService') === 'true');
    const [showWalkRecommendation, setShowWalkRecommendation] = useState(() => sessionStorage.getItem('showWalkRecommendation') === 'true');
    const [selectedRegion, setSelectedRegion] = useState<string | null>(() => sessionStorage.getItem('selectedRegion'));
    const [isJumping, setIsJumping] = useState(false);
    const isInitialMount = useRef(true);

    // Sync state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('showMap', String(showMap));
        sessionStorage.setItem('showCrowdMap', String(showCrowdMap));
        sessionStorage.setItem('showWalkList', String(showWalkList));
        sessionStorage.setItem('selectedCourse', selectedCourse ? JSON.stringify(selectedCourse) : "");
        sessionStorage.setItem('crowdSearchKeyword', crowdSearchKeyword);
        sessionStorage.setItem('showLocationService', String(showLocationService));
        sessionStorage.setItem('showCongestionMonitoring', String(showCongestionMonitoring));
        sessionStorage.setItem('showWalkRecommendation', String(showWalkRecommendation));
        sessionStorage.setItem('selectedRegion', selectedRegion || "");
    }, [showMap, showCrowdMap, showWalkList, selectedCourse, crowdSearchKeyword, showLocationService, showCongestionMonitoring, showWalkRecommendation, selectedRegion]);

    useEffect(() => {
        if (showWalkList || selectedCourse) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showWalkList, selectedCourse]);

    // URL 해시(#) 감지 및 해당 섹션으로 스크롤
    useEffect(() => {
        const handleHashScroll = (isMount: boolean = false) => {
            const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
            const isReload = navigationEntries.length > 0 && navigationEntries[0].type === "reload";

            if (isMount && (isReload || !window.location.hash)) {
                const lastSection = sessionStorage.getItem('lastSection');
                if (lastSection) {
                    const element = document.getElementById(lastSection);
                    if (element) {
                        setIsJumping(true);
                        setTimeout(() => {
                            element.scrollIntoView({ behavior: "auto", block: "start" });
                            setIsJumping(false);
                        }, 300);
                        isInitialMount.current = false;
                        return;
                    }
                }
                window.scrollTo(0, 0);
                setIsJumping(false);
                isInitialMount.current = false;
                return;
            }

            const hash = window.location.hash;
            if (hash) {
                if (isMount) setIsJumping(true);
                const targetId = hash.split('#').pop();
                const element = targetId ? document.getElementById(targetId) : null;
                if (element) {
                    const delay = isMount ? 300 : 0;
                    const behavior = isMount ? "auto" : "smooth";
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: behavior as ScrollBehavior, block: "start" });
                        if (isMount) {
                            setTimeout(() => setIsJumping(false), 200);
                        }
                    }, delay);
                } else {
                    if (isMount) setIsJumping(false);
                }
            }
        };

        handleHashScroll(true);
        isInitialMount.current = false;
        const onHashChange = () => handleHashScroll(false);
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const handleCloseSmokingMap = () => {
        setShowMap(false);
        setTimeout(() => {
            document.getElementById("section-location")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleCloseCrowdMap = () => {
        setShowCrowdMap(false);
        setCrowdSearchKeyword("");
        setTimeout(() => {
            document.getElementById("section-crowd")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleBackToGuide = () => {
        setShowLocationService(false);
        setShowCongestionMonitoring(false);
        setShowWalkRecommendation(false);
        setSelectedRegion(null);
        setShowWalkList(false);
        setTimeout(() => {
            document.getElementById("section-guide")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    if (selectedCourse) return <WalkCourseMap course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
    if (showWalkList) return <WalkCourseList onBack={handleBackToGuide} onSelect={(course) => setSelectedCourse(course)} />;
    if (showMap) return <SmokingMap onBack={handleCloseSmokingMap} />;
    if (showCrowdMap) return <CrowdMap onBack={handleCloseCrowdMap} initialKeyword={crowdSearchKeyword} />;
    if (showLocationService) return <LocationService onBack={handleBackToGuide} />;
    if (showCongestionMonitoring) return <CongestionMonitoring onBack={handleBackToGuide} />;
    if (showWalkRecommendation) return <WalkRecommendation onBack={handleBackToGuide} onShowWalkList={() => setShowWalkList(true)} />;
    if (selectedRegion) return <RegionDetail region={selectedRegion} onBack={handleBackToGuide} />;

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden">
            <div className="fixed inset-0 z-[-1] transition-colors duration-500
        bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-slate-100 to-teal-200 opacity-80
        dark:bg-none dark:bg-gradient-to-b dark:from-slate-900 dark:via-[#0B1120] dark:to-black dark:opacity-100"
            />

            {isJumping && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">잠시만 기다려주세요...</p>
                    </div>
                </div>
            )}

            <main className="w-full">
                <Navbar />

                {/* ServiceVideo 섹션 - 서비스 소개 영상 */}
                <section id="section-servicevideo" className="relative w-full z-[20] flex flex-col justify-start pt-[150px] pb-20 md:pb-32 scroll-mt-20">
                    <ServiceVideo />
                    <SectionDivider type="wave" position="bottom" color="text-purple-100/60 dark:text-purple-900/30" />
                </section>

                {/* SmokingBooth 섹션 */}
                <section id="section-location" className="relative w-full z-[30] flex flex-col justify-start pb-20 md:pb-32">
                    <SmokingBooth onShowMap={() => setShowMap(true)} onShowCrowdMap={() => setShowCrowdMap(true)} />
                    <SectionDivider type="slant" position="bottom" color="text-green-100/60 dark:text-green-900/30" />
                </section>

                {/* Crowd 섹션 */}
                <section id="section-crowd" className="relative w-full z-[40] flex flex-col justify-start pb-20 md:pb-32">
                    <Crowd onBack={() => { }} onShowRegionDetail={(region: string) => setSelectedRegion(region)} />
                    <SectionDivider type="curve" position="bottom" color="text-indigo-100/60 dark:text-indigo-900/30" />
                </section>

                {/* CrowdContent Section */}
                <section id="section-crowdcontent" className="relative w-full z-[50] flex flex-col justify-start pb-20 md:pb-32">
                    <CrowdContent />
                    <SectionDivider type="slant" position="bottom" color="text-slate-100/60 dark:text-slate-900/30" />
                </section>

                {/* Guide 섹션 */}
                <section id="section-guide" className="relative w-full z-[60] flex flex-col justify-start pb-20 md:pb-32">
                    <Guide
                        onWalkClick={() => setShowWalkList(true)}
                        onLocationServiceClick={() => setShowLocationService(true)}
                        onCongestionMonitoringClick={() => setShowCongestionMonitoring(true)}
                        onWalkRecommendationClick={() => setShowWalkRecommendation(true)}
                        onRegionClick={(region) => setSelectedRegion(region)}
                    />
                    <SectionDivider type="wave" position="bottom" color="text-indigo-100/60 dark:text-gray-800/40" />
                </section>

                {/* FAQ 섹션 */}
                <section id="section-faq" className="relative w-full bg-transparent transition-colors duration-500 z-[70] flex flex-col justify-start pb-20 md:pb-32">
                    <div className="w-full max-w-[1400px] mx-auto pt-[32px] pb-[51px] mb-32">
                        <h2 className="text-4xl md:text-5xl font-black text-center relative -top-[50px] mb-[128px] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                            자주 묻는 질문 (FAQ)
                        </h2>
                        <div className="space-y-[30px]">
                            {[
                                {
                                    q: "Flow 서비스는 무엇인가요?",
                                    a: "Flow는 실시간 보행 혼잡도와 흡연 부스 위치 정보를 결합하여, 사용자에게 가장 쾌적하고 건강한 이동 경로를 제안하는 스마트 어반 가이드 서비스입니다."
                                },
                                {
                                    q: "데이터의 실시간성은 보장되나요?",
                                    a: "네, 전국 주요 요충지의 유동인구 데이터를 1분 단위로 실시간 수집 및 분석하여 매우 정밀한 혼잡도 정보를 제공합니다."
                                },
                                {
                                    q: "흡연 부스 회피 경로는 어떤 원리인가요?",
                                    a: "사용자의 현재 위치와 목적지 사이에 위치한 모든 흡연 시설의 영향 반경을 계산하여, 담배 연기 노출을 최소화할 수 있는 최적의 우회 경로를 실시간으로 길안내합니다."
                                },
                                {
                                    q: "별도의 앱 설치가 필요한가요?",
                                    a: "Flow는 웹 기반 반응형 서비스로 제공되어, 앱 설치 없이 브라우저에서 바로 모든 기능을 이용할 수 있습니다."
                                }
                            ].map((faq, idx) => (
                                <div key={idx} className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl border-2 border-gray-100 dark:border-white/10 p-8 shadow-md hover:shadow-lg transition-all">
                                    <h3 className="text-xl font-bold mb-3 flex gap-3">
                                        <span className="text-blue-600 dark:text-blue-400 font-black">Q.</span>
                                        {faq.q}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium pl-8">
                                        {faq.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <SectionDivider type="slant" position="bottom" color="text-blue-50/60 dark:text-blue-900/30" />
                </section>

                <section id="section-footer" className="relative w-full z-[80]">
                    <Footer />
                </section>

                <ScrollNavigator />
                <ScrollZoom />
                <FocusScroll />
            </main>
        </div>
    );
}

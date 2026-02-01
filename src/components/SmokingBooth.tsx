import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import type { SmokingBooth as SmokingBoothType } from "../services/smokingBoothService";

declare global {
  interface Window {
    naver: any;
  }
}

interface SmokingBoothProps {
  onShowMap: () => void;
  onShowCrowdMap: () => void;
}

interface SmokingCard {
  id: string;
  title: string;
  description: string;
  onClick: () => void;
}

export default function SmokingBooth({ onShowMap, onShowCrowdMap }: SmokingBoothProps) {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stats, setStats] = useState({ within500m: 0, within1km: 0, within2km: 0 });

  const mapContainerRef1 = useRef<HTMLDivElement>(null);
  const mapContainerRef2 = useRef<HTMLDivElement>(null);
  const mapRef1 = useRef<any>(null);
  const mapRef2 = useRef<any>(null);
  const [map1Error, setMap1Error] = useState<string | null>(null);
  const [map1Status, setMap1Status] = useState<string>("준비 중...");
  const [map2Error, setMap2Error] = useState<string | null>(null);
  const [map2Status, setMap2Status] = useState<string>("준비 중...");
  const [nationalBooths, setNationalBooths] = useState<SmokingBoothType[]>([]);

  // 데이터 로드
  useEffect(() => {
    const loadBooths = async () => {
      const booths = await getNationalSmokingBooths();
      setNationalBooths(booths);
    };
    loadBooths();
  }, []);

  const cards: SmokingCard[] = [
    {
      id: "smoking-location",
      title: "내 주변 흡연부스 위치",
      description: "전국 300개 이상의 흡연부스 위치를 실시간으로 확인하세요. 가장 가까운 흡연부스를 빠르게 찾아 불필요한 이동 시간을 줄이고, 더 쾌적한 환경을 경험할 수 있습니다.",
      onClick: onShowMap,
    },
    {
      id: "crowd-monitoring",
      title: "실시간 혼잡도 모니터링",
      description: "전국 주요 지역의 실시간 인구 밀집도를 확인하고 최적의 방문 시간을 찾으세요. 데이터 기반 분석으로 혼잡한 장소를 피하고 쾌적한 환경에서 더 나은 경험을 만들어보세요.",
      onClick: onShowCrowdMap,
    },
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn(`[DEBUG] SmokingBooth geolocation failed: ${err.code} - ${err.message}. Using default fallback.`);
          setUserLocation({ lat: 37.5665, lng: 126.978 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      console.warn("[DEBUG] Geolocation not supported. Using default fallback.");
      setUserLocation({ lat: 37.5665, lng: 126.978 });
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const initializeMaps = () => {
      if (!window.naver || !window.naver.maps) {
        setMap1Error("네이버 맵 SDK를 찾을 수 없습니다.");
        setMap2Error("네이버 맵 SDK를 찾을 수 없습니다.");
        return;
      }

      try {
        // Map 1: Smoking Booths
        if (mapContainerRef1.current) {
          setMap1Status("지도 초기화 중...");
          const center = new window.naver.maps.LatLng(userLocation.lat, userLocation.lng);
          const mapOptions = {
            center: center,
            zoom: 14,
            scaleControl: false,
            logoControl: false,
            mapDataControl: false,
            zoomControl: false,
            mapTypeControl: false,
            scrollWheel: false,
            draggable: false,
            disableDoubleClickZoom: true,
          };
          const map1 = new window.naver.maps.Map(mapContainerRef1.current, mapOptions);
          mapRef1.current = map1;
          setMap1Status("완료");

          // User Marker
          new window.naver.maps.Marker({
            position: center,
            map: map1,
            icon: {
              content: `<img src="${import.meta.env.BASE_URL}image/user-marker.svg" style="width:32px; height:32px;" />`,
              anchor: new window.naver.maps.Point(16, 16)
            }
          });

          // Booth Markers
          const sortedBooths = nationalBooths
            .map((b: SmokingBoothType) => ({
              ...b,
              distance: Math.sqrt(Math.pow(b.latitude - userLocation.lat, 2) + Math.pow(b.longitude - userLocation.lng, 2)) * 111320
            }))
            .sort((a, b) => a.distance - b.distance);

          setStats({
            within500m: sortedBooths.filter(b => b.distance <= 500).length,
            within1km: sortedBooths.filter(b => b.distance <= 1000).length,
            within2km: sortedBooths.filter(b => b.distance <= 2000).length,
          });

          sortedBooths.slice(0, 10).forEach((booth: any) => {
            const markerContent = `
              <div style="position: relative; width: 32px; height: 32px;">
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                  <div class="smoke-marker-ripple"></div>
                  <div class="smoke-marker-ripple"></div>
                  <div class="smoke-marker-ripple"></div>
                  <div class="smoke-marker-ripple"></div>
                  <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="흡연부스" style="width: 28px; height: 28px; position: relative; z-index: 10; mix-blend-mode: multiply; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />
                </div>
              </div>
            `;
            new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(booth.latitude, booth.longitude),
              map: map1,
              icon: {
                content: markerContent,
                anchor: new window.naver.maps.Point(16, 16)
              }
            });
          });
        }
      } catch (err) {
        console.error(err);
        setMap1Error("지도 1 생성 중 오류: " + (err as Error).message);
      }

      try {
        // Map 2: Crowd Monitoring
        if (mapContainerRef2.current) {
          setMap2Status("지도 초기화 중...");
          const center = new window.naver.maps.LatLng(userLocation.lat, userLocation.lng);
          const mapOptions = {
            center: center,
            zoom: 14,
            scaleControl: false,
            logoControl: false,
            mapDataControl: false,
            zoomControl: false,
            mapTypeControl: false,
            scrollWheel: false,
            draggable: false,
            disableDoubleClickZoom: true,
          };
          const map2 = new window.naver.maps.Map(mapContainerRef2.current, mapOptions);
          mapRef2.current = map2;
          setMap2Status("완료");

          // User Marker
          new window.naver.maps.Marker({
            position: center,
            map: map2,
            icon: {
              content: `<img src="${import.meta.env.BASE_URL}image/user-marker.svg" style="width:32px; height:32px;" />`,
              anchor: new window.naver.maps.Point(16, 16)
            }
          });

          // Crowd Markers
          const crowdLocations = [
            { name: "현재 위치", lat: userLocation.lat, lng: userLocation.lng, level: "medium", radius: 60 },
            { name: "북쪽 지역", lat: userLocation.lat + 0.025, lng: userLocation.lng, level: "low", radius: 55 },
            { name: "남쪽 지역", lat: userLocation.lat - 0.025, lng: userLocation.lng, level: "high", radius: 65 },
            { name: "동쪽 지역", lat: userLocation.lat, lng: userLocation.lng + 0.03, level: "very_high", radius: 75 },
            { name: "서쪽 지역", lat: userLocation.lat, lng: userLocation.lng - 0.03, level: "medium", radius: 58 },
            { name: "북동쪽", lat: userLocation.lat + 0.02, lng: userLocation.lng + 0.025, level: "low", radius: 50 },
            { name: "남서쪽", lat: userLocation.lat - 0.02, lng: userLocation.lng - 0.025, level: "high", radius: 62 },
          ];

          crowdLocations.forEach((loc: any) => {
            const color =
              loc.level === "very_high" ? "rgba(239, 68, 68, 0.6)" :
                loc.level === "high" ? "rgba(249, 115, 22, 0.6)" :
                  loc.level === "medium" ? "rgba(234, 179, 8, 0.6)" :
                    "rgba(34, 197, 94, 0.6)";

            const borderColor =
              loc.level === "very_high" ? "rgba(239, 68, 68, 0.8)" :
                loc.level === "high" ? "rgba(249, 115, 22, 0.8)" :
                  loc.level === "medium" ? "rgba(234, 179, 8, 0.8)" :
                    "rgba(34, 197, 94, 0.8)";

            const markerContent = `
              <div style="position: relative; width: ${loc.radius}px; height: ${loc.radius}px;">
                 <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; border: 3px solid ${borderColor}; box-shadow: 0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.3);"></div>
                    <div style="position: absolute; font-size: 11px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); white-space: nowrap;">${loc.name}</div>
                  </div>
              </div>
            `;
            new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(loc.lat, loc.lng),
              map: map2,
              icon: {
                content: markerContent,
                anchor: new window.naver.maps.Point(loc.radius / 2, loc.radius / 2)
              }
            });
          });
        }
      } catch (err) {
        console.error(err);
        setMap2Error("지도 2 생성 중 오류: " + (err as Error).message);
      }
    };

    const timer = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(timer);
        initializeMaps();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [userLocation, nationalBooths]);

  const handleZoomIn1 = () => mapRef1.current && mapRef1.current.setZoom(mapRef1.current.getZoom() + 1);
  const handleZoomOut1 = () => mapRef1.current && mapRef1.current.setZoom(mapRef1.current.getZoom() - 1);
  const handleZoomIn2 = () => mapRef2.current && mapRef2.current.setZoom(mapRef2.current.getZoom() + 1);
  const handleZoomOut2 = () => mapRef2.current && mapRef2.current.setZoom(mapRef2.current.getZoom() - 1);

  return (
    <section className="w-full bg-transparent py-20 px-4 5xl:px-12 flex flex-col items-center justify-start transition-colors duration-500 overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="flex flex-col items-center text-center mb-8 lg:mb-16 gap-3 4xl:gap-10 5xl:gap-16">
          <h2 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl 3xl:text-7xl 4xl:text-8xl 5xl:text-9xl font-bold">
            위치 서비스 안내
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 4xl:gap-16 5xl:gap-24 p-4 overflow-visible">
          {cards.map((card, index) => {
            const mapContainerRef = index === 0 ? mapContainerRef1 : mapContainerRef2;
            const isHovered = hoveredCard === index;

            const isNavigating = navigatingId === card.id;

            return (
              <motion.div
                key={card.id}
                initial={{ x: index === 0 ? "-100%" : "100%", opacity: 0 }}
                animate={isNavigating ? {
                  rotateY: 720,
                  scale: 0,
                  opacity: 0,
                  transition: { duration: 0.8, ease: "easeInOut" }
                } : {}}
                whileInView={{
                  x: [
                    index === 0 ? "-100%" : "100%", // Start
                    index === 0 ? "2.5%" : "-2.5%", // Hit 1
                    index === 0 ? "-2.5%" : "2.5%", // Bounce 1
                    index === 0 ? "1.2%" : "-1.2%", // Hit 2
                    index === 0 ? "-0.8%" : "0.8%", // Bounce 2
                    "0%"                            // Final Settle
                  ],
                  opacity: 1
                }}
                onAnimationComplete={() => {
                  if (isNavigating) {
                    navigate(index === 0 ? "/smoking-booth" : "/crowd");
                  }
                }}
                viewport={{ amount: 0.01 }}
                transition={{
                  duration: 1.4,
                  times: [0, 0.35, 0.55, 0.75, 0.9, 1],
                  ease: ["easeIn", "easeOut", "easeIn", "easeOut", "easeOut"]
                }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative w-full h-[30vh] xs:h-[35vh] sm:h-[550px] md:h-[650px] lg:h-[700px] cursor-pointer"
              >
                <div
                  className="relative w-full h-full overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 rounded-[2rem] border-2 border-white/20"
                >
                  <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105">
                    <div ref={mapContainerRef} className="w-full h-full" style={{ pointerEvents: "none" }} />

                    {index === 0 ? (
                      (map1Error || map1Status !== "완료") && (
                        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 text-center">
                          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-sm font-bold">지도 진단 중...</p>
                          <p className="text-xs text-gray-500">{map1Status}</p>
                        </div>
                      )
                    ) : (
                      (map2Error || map2Status !== "완료") && (
                        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 text-center">
                          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-sm font-bold">지도 진단 중...</p>
                          <p className="text-xs text-gray-500">{map1Status}</p>
                        </div>
                      )
                    )}

                    {index === 0 && (
                      <div className="absolute top-4 left-4 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border-2 border-green-100 dark:border-green-900 min-w-[140px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">📊</span>
                          <h4 className="text-[10px] font-bold">주변 정보</h4>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <span className="text-[8px] font-bold text-green-700 dark:text-green-400">500m</span>
                            <span className="text-xs font-black text-green-900 dark:text-green-100">{stats.within500m}개</span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                            <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400">1km</span>
                            <span className="text-xs font-black text-emerald-900 dark:text-emerald-100">{stats.within1km}개</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 z-40 flex flex-col gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); index === 0 ? handleZoomIn1() : handleZoomIn2(); }}
                        className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 dark:hover:bg-slate-700 transition-all hover:scale-110"
                      >
                        <span className="text-xl font-bold">+</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); index === 0 ? handleZoomOut1() : handleZoomOut2(); }}
                        className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 dark:hover:bg-slate-700 transition-all hover:scale-110"
                      >
                        <span className="text-xl font-bold">-</span>
                      </button>
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  <div className={`absolute bottom-0 left-0 right-0 p-8 z-10 transition-opacity duration-300 ${isHovered ? "opacity-0" : "opacity-100"} pointer-events-none`}>
                    <div className="flex flex-col items-center">
                      <p className="text-sm sm:text-base text-white/90 text-center font-medium">
                        호버하여 자세히 보기
                      </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 sm:p-12 z-20 text-center"
                      >
                        <div className="flex flex-col items-center gap-6 max-w-lg">
                          <h3 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                            {card.title}
                          </h3>
                          <p className="text-white/80 text-base sm:text-lg leading-relaxed">
                            {card.description}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNavigatingId(card.id);
                              }}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold py-4 px-8 rounded-full hover:shadow-2xl transition-all transform hover:scale-105"
                            >
                              상세페이지 보기
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); card.onClick(); }}
                              className="flex-1 bg-white/10 text-white font-bold py-4 px-8 rounded-full border-2 border-white/30 hover:bg-white/20 transition-all transform hover:scale-105"
                            >
                              {index === 0 ? "지도 보기" : "혼잡도 보기"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

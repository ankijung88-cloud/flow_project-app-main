import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MergeSection, MergeCardGrid, FadeInSection } from "../components/MergeScrollAnimation";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

interface HourlyData {
  hour: number;
  population: number;
  level: "매우혼잡" | "혼잡" | "보통" | "여유";
}

interface LocationData {
  name: string;
  lat: number;
  lng: number;
  currentPopulation: number;
  currentLevel: "매우혼잡" | "혼잡" | "보통" | "여유";
  hourlyData: HourlyData[];
}

// Pre-calculate populations for all hours to stay pure during render
// Moved outside component to avoid purity check issues with Math.random during render
const HOURLY_POPULATIONS = Array.from({ length: 24 }, (_, i) => {
  if ((i >= 8 && i < 10) || (i >= 12 && i < 13) || (i >= 18 && i < 20)) {
    return 4000 + Math.random() * 1000;
  } else if (i >= 0 && i < 6) {
    return 500 + Math.random() * 300;
  } else {
    return 1500 + Math.random() * 1000;
  }
});

export default function CrowdDetailPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // 스크롤 잠금 해제
  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 1초마다 현재 시각 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setUserLocation({ lat: 37.5665, lng: 126.978 });
        }
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.978 });
    }
  }, []);

  // 전국 주요 지역 데이터
  const majorLocations = [
    { name: "강남역", lat: 37.4979, lng: 127.0276 },
    { name: "홍대입구역", lat: 37.5572, lng: 126.9247 },
    { name: "명동", lat: 37.5637, lng: 126.9838 },
    { name: "잠실역", lat: 37.5145, lng: 127.0595 },
    { name: "서울역", lat: 37.5547, lng: 126.9707 },
    { name: "신촌역", lat: 37.5219, lng: 126.9245 },
    { name: "건대입구역", lat: 37.5406, lng: 127.0693 },
    { name: "이태원역", lat: 37.5344, lng: 126.9944 },
    { name: "서면역", lat: 35.1796, lng: 129.0756 },
    { name: "해운대해수욕장", lat: 35.1585, lng: 129.1606 },
    { name: "부산역", lat: 35.1150, lng: 129.0403 },
    { name: "광안리해수욕장", lat: 35.1532, lng: 129.1189 },
    { name: "인천공항", lat: 37.4602, lng: 126.4407 },
    { name: "송도센트럴파크", lat: 37.3894, lng: 126.6544 },
    { name: "부평역", lat: 37.4895, lng: 126.7226 },
    { name: "동성로", lat: 35.8714, lng: 128.6014 },
    { name: "반월당역", lat: 35.8580, lng: 128.5944 },
    { name: "대전역", lat: 36.3504, lng: 127.3845 },
    { name: "유성온천", lat: 36.3539, lng: 127.3435 },
    { name: "광주 금남로", lat: 35.1546, lng: 126.9161 },
    { name: "제주 중문관광단지", lat: 33.2541, lng: 126.5603 },
  ];

  // 시간대별 혼잡도 데이터 생성
  const generateHourlyData = (): HourlyData[] => {
    const hourlyData: HourlyData[] = [];
    for (let hour = 0; hour < 24; hour++) {
      let basePopulation = 1000;
      let congestionPercent = 0;

      if (
        (hour >= 8 && hour < 10) ||
        (hour >= 12 && hour < 13) ||
        (hour >= 18 && hour < 20)
      ) {
        congestionPercent = 80 + Math.random() * 30;
        basePopulation = Math.floor((congestionPercent / 100) * 5000);
      } else {
        congestionPercent = 20 + Math.random() * 30;
        basePopulation = Math.floor((congestionPercent / 100) * 5000);
      }

      const variation = (Math.random() - 0.5) * 0.2;
      const population = Math.floor(basePopulation * (1 + variation));

      let level: "매우혼잡" | "혼잡" | "보통" | "여유";
      if (congestionPercent > 100) level = "매우혼잡";
      else if (congestionPercent >= 76) level = "혼잡";
      else if (congestionPercent >= 51) level = "보통";
      else level = "여유";

      hourlyData.push({ hour, population, level });
    }
    return hourlyData;
  };

  // 위치 데이터 생성
  const generateLocationData = (name: string, lat: number, lng: number): LocationData => {
    const hourlyData = generateHourlyData();
    const currentHour = new Date().getHours();
    const currentData = hourlyData[currentHour];

    return {
      name,
      lat,
      lng,
      currentPopulation: currentData.population,
      currentLevel: currentData.level,
      hourlyData,
    };
  };

  // 혼잡도 레벨에 따른 색상
  const getLevelColor = (level: string) => {
    switch (level) {
      case "매우혼잡": return "#DC2626";
      case "혼잡": return "#FF6B6B";
      case "보통": return "#F97316";
      case "여유": return "#10B981";
      default: return "#6B7280";
    }
  };

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case "매우혼잡": return "bg-red-100 text-red-700";
      case "혼잡": return "bg-pink-100 text-pink-700";
      case "보통": return "bg-orange-100 text-orange-700";
      case "여유": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // 지도 초기화
  useEffect(() => {
    if (!userLocation) return;

    const initializeMap = () => {
      const initLogic = () => {
        if (!window.naver || !window.naver.maps) {
          setMapError("네이버 맵 SDK를 찾을 수 없습니다.");
          return;
        }

        try {
          if (mapContainerRef.current) {
            setMapStatus("지도 초기화 중...");
            const center = new window.naver.maps.LatLng(36.5, 127.5);
            const mapOptions = {
              center: center,
              zoom: 7, // Fits South Korea
              scaleControl: false,
              logoControl: false,
              mapDataControl: false,
              zoomControl: false,
              mapTypeControl: false,
              scrollWheel: false,
              draggable: true
            };
            const map = new window.naver.maps.Map(mapContainerRef.current, mapOptions);
            mapRef.current = map;
            setMapStatus("완료");

            // 모든 주요 지역에 혼잡도 마커 표시
            majorLocations.forEach((loc) => {
              const data = generateLocationData(loc.name, loc.lat, loc.lng);
              const color = getLevelColor(data.currentLevel);
              const radius = data.currentLevel === "매우혼잡" ? 50 :
                data.currentLevel === "혼잡" ? 42 :
                  data.currentLevel === "보통" ? 36 : 30;

              const markerContent = `
                <div style="position: relative; width: ${radius}px; height: ${radius}px; cursor: pointer;">
                  <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.3); animation: pulse 2s ease-in-out infinite;"></div>
                    <div style="position: absolute; font-size: 10px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); white-space: nowrap; top: -20px;">${loc.name}</div>
                    <div style="position: absolute; font-size: 9px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.8); bottom: -18px;">${data.currentLevel}</div>
                  </div>
                </div>
              `;

              const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(loc.lat, loc.lng),
                map: map,
                icon: {
                  content: markerContent,
                  anchor: new window.naver.maps.Point(radius / 2, radius / 2)
                }
              });

              window.naver.maps.Event.addListener(marker, 'click', () => {
                setSelectedLocation(data);
                map.setCenter(new window.naver.maps.LatLng(loc.lat, loc.lng));
                map.setZoom(12);
              });
            });
          }
        } catch (err) {
          console.error(err);
          setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
        }
      };

      const timer = setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(timer);
          initLogic();
        }
      }, 100);
      return () => clearInterval(timer);
    };

    initializeMap();
  }, [userLocation]);

  const getCurrentTimeString = () => {
    const year = currentTime.getFullYear();
    const month = String(currentTime.getMonth() + 1).padStart(2, '0');
    const day = String(currentTime.getDate()).padStart(2, '0');
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
  };

  // 줌 컨트롤 핸들러
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() - 1);
    }
  };

  // 통계 계산
  const allLocationsData = majorLocations.map(loc => generateLocationData(loc.name, loc.lat, loc.lng));
  const stats = {
    veryBusy: allLocationsData.filter(l => l.currentLevel === "매우혼잡").length,
    busy: allLocationsData.filter(l => l.currentLevel === "혼잡").length,
    normal: allLocationsData.filter(l => l.currentLevel === "보통").length,
    free: allLocationsData.filter(l => l.currentLevel === "여유").length,
    avgPopulation: Math.round(allLocationsData.reduce((sum, l) => sum + l.currentPopulation, 0) / allLocationsData.length),
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 overflow-x-hidden transition-colors duration-500">
      {/* 헤더 */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/#section-location")}
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-black transition-all shadow-lg"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">실시간 인구 혼잡도</h1>
                <p className="text-sm text-gray-800 dark:text-gray-300 font-bold">전국 지역 실시간 인구 밀집도 모니터링</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-full">
                <span className="text-sm font-bold text-indigo-700">{getCurrentTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 md:px-12 py-8">
        {/* 실시간 표시 (모바일) */}
        <FadeInSection className="md:hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl text-center">
            <p className="text-sm opacity-90">실시간 기준</p>
            <p className="text-2xl font-black">{getCurrentTimeString()}</p>
          </div>
        </FadeInSection>

        {/* 통계 카드 - Merge 애니메이션 적용 */}
        <MergeCardGrid columns={5} className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 sm:p-4 border-2 border-red-200 dark:border-red-900/30 transition-colors text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">매우혼잡</p>
            <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{stats.veryBusy}</p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">개 지역</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 sm:p-4 border-2 border-pink-200 dark:border-pink-900/30 transition-colors text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">혼잡</p>
            <p className="text-2xl sm:text-3xl font-black text-pink-600 dark:text-pink-400">{stats.busy}</p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">개 지역</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 sm:p-4 border-2 border-orange-200 dark:border-orange-900/30 transition-colors text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">보통</p>
            <p className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">{stats.normal}</p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">개 지역</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 sm:p-4 border-2 border-green-200 dark:border-green-900/30 transition-colors text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">여유</p>
            <p className="text-2xl sm:text-3xl font-black text-green-600 dark:text-green-400">{stats.free}</p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">개 지역</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 sm:p-4 border-2 border-indigo-200 dark:border-indigo-900/30 transition-colors text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">전국 평균</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.avgPopulation.toLocaleString()}</p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">명</p>
          </div>
        </MergeCardGrid>

        {/* 검색바 */}
        <div className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="지역을 검색하세요 (예: 강남역, 명동, 해운대)"
              className="flex-1 px-6 py-4 rounded-full border-2 border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none text-lg shadow-md transition-colors"
            />
            <button
              onClick={() => {
                if (!searchKeyword.trim() || !mapRef.current) return;

                if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
                  alert("검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
                  return;
                }

                const ps = new window.kakao.maps.services.Places();
                ps.keywordSearch(searchKeyword, (data: any, status: any) => {
                  if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.y);
                    const lng = parseFloat(result.x);
                    // Naver Map Center Move
                    mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
                    mapRef.current.setZoom(14);
                    const locationData = generateLocationData(result.place_name, lat, lng);
                    setSelectedLocation(locationData);
                  } else {
                    alert("검색 결과가 없습니다.");
                  }
                });
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
            >
              검색
            </button>
          </div>
        </div>
        {/* 메인 컨텐츠 - Merge 애니메이션 적용 */}
        <MergeSection
          className="mb-8"
          gap="gap-8"
          leftContent={
            <div className="space-y-8">
              {/* 지도 */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-indigo-100 dark:border-slate-800 relative group transition-colors">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h2 className="text-white font-bold text-xl">전국 실시간 혼잡도 지도</h2>
                  <p className="text-indigo-100 text-sm">마커를 클릭하여 상세 정보를 확인하세요</p>
                </div>
                <div className="relative">
                  <div ref={mapContainerRef} className="w-full h-[500px]" />

                  {/* 진단 오버레이 */}
                  {(mapError || mapStatus !== "완료") && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                      <p className="text-[11px] text-gray-800 mb-1 font-bold">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
                      {mapError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                          <p className="text-xs text-red-500">{mapError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Zoom Controls (Bottom Left) */}
                <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                  <button
                    onClick={handleZoomIn}
                    className="relative w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                    title="확대"
                  >
                    <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="relative w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                    title="축소"
                  >
                    <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
                  </button>
                </div>
              </div>

              {/* 24시간 평균 혼잡도 */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border-2 border-indigo-100 dark:border-slate-800 transition-colors">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">24시간 평균 혼잡도 추이</h3>
                <div className="space-y-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i * 2;
                    const currentHour = currentTime.getHours();
                    const isCurrentBlock = currentHour >= hour && currentHour < hour + 2;
                    const basePopulation = HOURLY_POPULATIONS[hour];
                    const level = basePopulation > 4000 ? "매우혼잡" : basePopulation > 2500 ? "혼잡" : basePopulation > 1000 ? "보통" : "여유";
                    const color = getLevelColor(level);
                    const maxPopulation = 5000;
                    const barWidth = (basePopulation / maxPopulation) * 100;

                    return (
                      <div
                        key={hour}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all ${isCurrentBlock ? "bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        <div className="w-16 text-sm font-black text-gray-800">
                          {hour.toString().padStart(2, "0")}:00
                          {isCurrentBlock && <span className="text-indigo-600 ml-1">●</span>}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ width: `${barWidth}%`, backgroundColor: color }}
                          >
                            <span className="text-xs font-bold text-white drop-shadow">
                              {Math.round(basePopulation).toLocaleString()}명
                            </span>
                          </div>
                        </div>
                        <div className={`w-16 text-xs font-bold ${getLevelBgColor(level)} px-2 py-1 rounded-full text-center`}>
                          {level}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          }
          rightContent={
            <div className="space-y-6">
              {/* 선택된 지역 정보 */}
              {selectedLocation ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-indigo-100 dark:border-slate-800 sticky top-24 transition-colors">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-white font-bold text-xl">{selectedLocation.name}</h2>
                      <button
                        onClick={() => setSelectedLocation(null)}
                        className="text-white hover:bg-white/20 rounded-full p-1 transition"
                      >
                        <span className="text-xl">×</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* 현재 혼잡도 */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/30 text-center">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">현재 혼잡도</p>
                      <p className="text-5xl font-black" style={{ color: getLevelColor(selectedLocation.currentLevel) }}>
                        {selectedLocation.currentPopulation.toLocaleString()}
                      </p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-400 mt-2">예상 방문객 (명)</p>
                      <span className={`inline-block mt-3 px-6 py-2 rounded-full text-lg font-black ${getLevelBgColor(selectedLocation.currentLevel)}`}>
                        {selectedLocation.currentLevel}
                      </span>
                    </div>

                    {/* 24시간 그래프 */}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3">24시간 혼잡도 추이</h4>
                      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl">
                        <div className="flex items-end justify-between gap-1 h-32">
                          {selectedLocation.hourlyData.map((data) => {
                            const maxPop = Math.max(...selectedLocation.hourlyData.map(d => d.population));
                            const height = (data.population / maxPop) * 100;
                            const color = getLevelColor(data.level);
                            const isCurrentHour = data.hour === currentTime.getHours();

                            return (
                              <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                  className="w-full rounded-t transition-all"
                                  style={{
                                    height: `${height}%`,
                                    backgroundColor: color,
                                    boxShadow: isCurrentHour ? '0 0 10px rgba(99, 102, 241, 0.8)' : 'none',
                                    border: isCurrentHour ? '2px solid #4F46E5' : 'none'
                                  }}
                                />
                                <span className={`text-xs ${isCurrentHour ? 'font-black text-indigo-700' : 'font-bold text-gray-700'}`}>
                                  {data.hour}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 추천 시간 */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-2xl border-2 border-green-200 dark:border-green-800/30">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3">추천 방문 시간</h4>
                      <div className="space-y-2">
                        {selectedLocation.hourlyData
                          .filter(d => d.level === "여유")
                          .slice(0, 3)
                          .map(d => (
                            <div key={d.hour} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                              <span className="text-green-600 font-black">{d.hour}:00</span>
                              <span className="text-sm text-gray-800 font-bold">- {d.population.toLocaleString()}명 예상</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border-2 border-indigo-100 dark:border-slate-800 text-center transition-colors">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">지역을 선택해주세요</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    지도에서 마커를 클릭하거나<br />
                    상단 검색창에서 지역을 검색하세요
                  </p>
                </div>
              )}

              {/* 혼잡도 범례 */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border-2 border-indigo-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">혼잡도 안내</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-red-600"></div>
                    <div>
                      <span className="font-bold text-red-700">매우혼잡</span>
                      <p className="text-xs text-gray-800 font-medium">4,000명 이상</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                    <div>
                      <span className="font-bold text-pink-700">혼잡</span>
                      <p className="text-xs text-gray-800 font-medium">2,500명 ~ 4,000명</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <div>
                      <span className="font-bold text-orange-700">보통</span>
                      <p className="text-xs text-gray-800 font-medium">1,000명 ~ 2,500명</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <div>
                      <span className="font-bold text-green-700">여유</span>
                      <p className="text-xs text-gray-800 font-medium">1,000명 미만</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 혼잡 지역 */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border-2 border-indigo-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">현재 혼잡 지역 Top 5</h3>
                <div className="space-y-3">
                  {allLocationsData
                    .sort((a, b) => b.currentPopulation - a.currentPopulation)
                    .slice(0, 5)
                    .map((loc, index) => (
                      <div
                        key={loc.name}
                        onClick={() => {
                          setSelectedLocation(loc);
                          if (mapRef.current) {
                            mapRef.current.setCenter(new window.naver.maps.LatLng(loc.lat, loc.lng));
                            mapRef.current.setZoom(12);
                          }
                        }}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 transition"
                      >
                        <span className="text-2xl font-black text-gray-300">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 dark:text-white">{loc.name}</p>
                          <p className="text-sm text-gray-800 dark:text-gray-300 font-bold">{loc.currentPopulation.toLocaleString()}명</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelBgColor(loc.currentLevel)}`}>
                          {loc.currentLevel}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          }
        />

        {/* 이용 안내 */}
        <FadeInSection className="mt-8">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-black mb-6">서비스 이용 안내</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="font-bold text-lg mb-2">실시간 데이터</h4>
                <p className="text-sm opacity-100 font-medium">
                  1초 단위로 실시간 업데이트되는 정확한 혼잡도 정보를 제공합니다.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-4">🗺️</div>
                <h4 className="font-bold text-lg mb-2">전국 커버리지</h4>
                <p className="text-sm opacity-100 font-medium">
                  서울, 부산, 대구 등 전국 주요 도시의 혼잡도를 확인할 수 있습니다.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-4xl mb-4">⏰</div>
                <h4 className="font-bold text-lg mb-2">최적 시간 추천</h4>
                <p className="text-sm opacity-100 font-medium">
                  24시간 데이터를 분석하여 가장 여유로운 방문 시간을 추천해드립니다.
                </p>
              </div>
            </div>
          </div>
        </FadeInSection>
      </main>

      {/* 홈으로 돌아가기 버튼 */}
      <div className="w-full flex justify-center mt-12 mb-16 px-4">
        <button
          onClick={() => navigate("/#section-location")}
          className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-12 py-4 rounded-full font-bold text-xl hover:from-gray-900 hover:to-black transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
        >
          홈으로 돌아가기
        </button>
      </div>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 text-center">
          <p className="text-gray-400 font-bold">© 2024 Flow - 실시간 인구 혼잡도 모니터링 서비스</p>
        </div>
      </footer>
    </div>
  );
}

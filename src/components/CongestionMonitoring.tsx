import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

interface CongestionMonitoringProps {
  onBack: () => void;
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

export default function CongestionMonitoring({ onBack }: CongestionMonitoringProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 스크롤 잠금 해제 지원
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "auto";
  }, []);

  // 1분마다 현재 시각 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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

  // 전국 주요 지역
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
  ];

  // 위치 데이터 생성
  const generateLocationData = (name: string, lat: number, lng: number): LocationData => {
    const hourlyData = generateHourlyData();
    const currentHour = currentTime.getHours();
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

  // 지도 초기화
  useEffect(() => {
    const initializeMap = () => {
      if (!mapContainerRef.current) return;
      if (!window.naver || !window.naver.maps) return;

      try {
        setMapStatus("지도 초기화 중...");
        // Center: South Korea approx center
        const center = new window.naver.maps.LatLng(36.5, 127.5);
        const mapOptions = {
          center: center,
          zoom: 7, // Fits South Korea
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false,
          scrollWheel: false, // Zoomable set to false in original
          draggable: true
        };

        const map = new window.naver.maps.Map(mapContainerRef.current, mapOptions);
        mapRef.current = map;
        setMapStatus("완료");

        // 모든 지역에 혼잡도 마커 표시
        majorLocations.forEach((loc) => {
          const data = generateLocationData(loc.name, loc.lat, loc.lng);
          const color = getLevelColor(data.currentLevel);
          const radius = data.currentLevel === "매우혼잡" ? 45 :
            data.currentLevel === "혼잡" ? 38 :
              data.currentLevel === "보통" ? 32 : 28;

          const markerContent = `
            <div style="position: relative; width: ${radius}px; height: ${radius}px; cursor: pointer;">
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 15px ${color}, 0 4px 10px rgba(0,0,0,0.3);"></div>
                <div style="position: absolute; font-size: 10px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${loc.name}</div>
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
            map.setZoom(12); // Detailed view
          });
        });

      } catch (err) {
        console.error(err);
        setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
      }
    };

    // Retry until Naver is loaded (index.html loads it)
    const timer = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(timer);
        initializeMap();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentTime]);

  // 전국 통계
  const allLocations = majorLocations.map(loc => generateLocationData(loc.name, loc.lat, loc.lng));
  const totalPopulation = allLocations.reduce((sum, loc) => sum + loc.currentPopulation, 0);
  const avgPopulation = Math.floor(totalPopulation / allLocations.length);

  const levelCounts = {
    "매우혼잡": allLocations.filter(l => l.currentLevel === "매우혼잡").length,
    "혼잡": allLocations.filter(l => l.currentLevel === "혼잡").length,
    "보통": allLocations.filter(l => l.currentLevel === "보통").length,
    "여유": allLocations.filter(l => l.currentLevel === "여유").length,
  };

  // 최적 방문 시간 추천
  const getOptimalTime = (location: LocationData) => {
    const sortedByPopulation = [...location.hourlyData].sort((a, b) => a.population - b.population);
    const top3 = sortedByPopulation.slice(0, 3);
    return top3;
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

  return (
    <div className="flex flex-col items-center justify-start w-screen min-h-screen bg-transparent transition-colors duration-500 p-4 sm:p-6 md:p-8">
      {/* 헤더 */}
      <div className="w-full w-full mb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4">
            📊 혼잡도 모니터링
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            전국 주요 지역의 실시간 인구 밀집도를 확인하고 최적의 방문 시간을 계획하세요
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="w-full w-full mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">모니터링 지역</p>
            <p className="text-4xl font-black">{majorLocations.length}곳</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">전국 평균 인구</p>
            <p className="text-4xl font-black">{avgPopulation.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">혼잡 지역</p>
            <p className="text-4xl font-black">{levelCounts["매우혼잡"] + levelCounts["혼잡"]}곳</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">여유 지역</p>
            <p className="text-4xl font-black">{levelCounts["여유"]}곳</p>
          </div>
        </div>
      </div>

      {/* 지도 + 선택된 지역 정보 */}
      <div className="w-full w-full mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 지도 */}
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 p-6 relative group">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">실시간 혼잡도 지도</h3>
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full h-[400px] rounded-lg shadow-lg"
                style={{ border: "2px solid #e0e7ff" }}
              />

              {/* 진단 오버레이 */}
              {(mapError || mapStatus !== "완료") && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                  <p className="text-[11px] text-gray-600 mb-1">상태: <span className="font-mono text-indigo-600">{mapStatus}</span></p>
                  {mapError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                      <p className="text-xs text-red-500">{mapError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Zoom Controls (Inside Map Wrapper) */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="확대"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="축소"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              * 지역을 클릭하면 상세 정보를 확인할 수 있습니다
            </p>
          </div>

          {/* 선택된 지역 상세 정보 */}
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-200 p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedLocation ? `${selectedLocation.name} 상세 정보` : "지역을 선택하세요"}
            </h3>
            {selectedLocation ? (
              <div className="space-y-4">
                {/* 현재 혼잡도 */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2 text-center">현재 혼잡도</p>
                  <p className="text-5xl font-black text-center mb-2" style={{ color: getLevelColor(selectedLocation.currentLevel) }}>
                    {selectedLocation.currentPopulation.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 text-center mb-3">예상 방문객 수 (명)</p>
                  <div className="text-center">
                    <span className={`inline-block px-6 py-2 rounded-full text-lg font-black ${selectedLocation.currentLevel === "매우혼잡" ? "bg-red-100 text-red-700" :
                      selectedLocation.currentLevel === "혼잡" ? "bg-orange-100 text-orange-700" :
                        selectedLocation.currentLevel === "보통" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                      }`}>
                      {selectedLocation.currentLevel}
                    </span>
                  </div>
                </div>

                {/* 24시간 혼잡도 그래프 */}
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-3">24시간 혼잡도 추이</p>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-end justify-between gap-1 h-32">
                      {selectedLocation.hourlyData.map((data) => {
                        const maxPop = Math.max(...selectedLocation.hourlyData.map(d => d.population));
                        const height = (data.population / maxPop) * 100;
                        const color = getLevelColor(data.level);
                        const isCurrentHour = data.hour === currentTime.getHours();

                        return (
                          <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t"
                              style={{
                                height: `${height}%`,
                                backgroundColor: color,
                                opacity: isCurrentHour ? 1 : 0.6,
                              }}
                            />
                            {data.hour % 3 === 0 && (
                              <span className="text-xs text-gray-500">{data.hour}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 최적 방문 시간 */}
                <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                  <p className="text-sm font-bold text-gray-900 mb-3">추천 방문 시간 (여유로운 시간대)</p>
                  <div className="flex gap-2 justify-center">
                    {getOptimalTime(selectedLocation).map((time) => (
                      <div key={time.hour} className="bg-white px-4 py-2 rounded-lg border border-green-300">
                        <p className="text-2xl font-black text-green-600">{time.hour}시</p>
                        <p className="text-xs text-gray-600">{time.level}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-400">
                <p className="text-center">
                  지도에서 지역을 선택하면<br />
                  상세한 혼잡도 정보를 확인할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 전체 지역 혼잡도 순위 */}
      <div className="w-full w-full mb-8">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">지역별 혼잡도 순위</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allLocations
              .sort((a, b) => b.currentPopulation - a.currentPopulation)
              .map((location, index) => {
                const color = getLevelColor(location.currentLevel);
                return (
                  <div
                    key={location.name}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer"
                    style={{ borderColor: color }}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black text-gray-400">#{index + 1}</span>
                      <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: color + "22", color }}>
                        {location.currentLevel}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mb-1">{location.name}</p>
                    <p className="text-2xl font-black" style={{ color }}>
                      {location.currentPopulation.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">명</p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="mb-8">
        <button
          onClick={() => {
            onBack();
            navigate("/#section-guide");
          }}
          className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-10 py-3 rounded-full font-bold text-lg hover:from-gray-900 hover:to-black transition-all shadow-xl hover:shadow-2xl hover:scale-105"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

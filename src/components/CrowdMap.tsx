import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

interface CrowdMapProps {
  onBack: () => void;
  initialKeyword?: string;
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
  recommendations: {
    bestTime: string;
    alternativeLocations: string[];
  };
}

export default function CrowdMap({ onBack, initialKeyword }: CrowdMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [keyword, setKeyword] = useState(initialKeyword || "");
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const markersRef = useRef<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 스크롤 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1시간마다 데이터 갱신 (수정: 3,600,000ms)
  useEffect(() => {
    const updateData = () => {
      setLastUpdate(new Date());
      // 마커 새로고침
      if (mapRef.current) {
        renderMajorLocations(mapRef.current);
      }
      // 선택된 위치 데이터 갱신
      if (selectedLocation) {
        const updatedData = generateLocationData(
          selectedLocation.name,
          selectedLocation.lat,
          selectedLocation.lng
        );
        setSelectedLocation(updatedData);
      }
    };

    const interval = setInterval(updateData, 60 * 60 * 1000); // 1시간
    return () => clearInterval(interval);
  }, [selectedLocation]);

  // 시간대별 혼잡도 데이터 생성 (24시간)
  const generateHourlyData = (): HourlyData[] => {
    const hourlyData: HourlyData[] = [];

    // 시간대별 패턴 (출퇴근 시간, 점심시간 등)
    for (let hour = 0; hour < 24; hour++) {
      let basePopulation = 300;

      // 시간대별 패턴 적용
      if (hour >= 7 && hour <= 9) basePopulation = 4500; // 출근 시간
      else if (hour >= 12 && hour <= 13) basePopulation = 3800; // 점심 시간
      else if (hour >= 18 && hour <= 20) basePopulation = 5000; // 퇴근/저녁 시간
      else if (hour >= 21 && hour <= 23) basePopulation = 3200; // 저녁 활동
      else if (hour >= 0 && hour <= 5) basePopulation = 200; // 새벽
      else basePopulation = 2000; // 일반 시간

      // 랜덤 변동 추가 (±20%)
      const variation = (Math.random() - 0.5) * 0.4;
      const population = Math.floor(basePopulation * (1 + variation));

      let level: "매우혼잡" | "혼잡" | "보통" | "여유";
      if (population > 4000) level = "매우혼잡";
      else if (population > 2500) level = "혼잡";
      else if (population > 1000) level = "보통";
      else level = "여유";

      hourlyData.push({ hour, population, level });
    }

    return hourlyData;
  };

  // 전국 주요 지역 데이터
  const majorLocations = [
    // 서울 주요 지역
    { name: "강남역", lat: 37.4979, lng: 127.0276 },
    { name: "홍대입구역", lat: 37.5572, lng: 126.9247 },
    { name: "명동", lat: 37.5637, lng: 126.9838 },
    { name: "잠실역", lat: 37.5145, lng: 127.0595 },
    { name: "서울역", lat: 37.5547, lng: 126.9707 },
    { name: "신촌역", lat: 37.5219, lng: 126.9245 },
    { name: "건대입구역", lat: 37.5406, lng: 127.0693 },
    { name: "이태원역", lat: 37.5344, lng: 126.9944 },

    // 부산 주요 지역
    { name: "서면역", lat: 35.1796, lng: 129.0756 },
    { name: "해운대해수욕장", lat: 35.1585, lng: 129.1606 },
    { name: "부산역", lat: 35.1150, lng: 129.0403 },
    { name: "광안리해수욕장", lat: 35.1532, lng: 129.1189 },

    // 인천 주요 지역
    { name: "인천공항", lat: 37.4602, lng: 126.4407 },
    { name: "송도센트럴파크", lat: 37.3894, lng: 126.6544 },
    { name: "부평역", lat: 37.4895, lng: 126.7226 },

    // 대구
    { name: "동성로", lat: 35.8714, lng: 128.6014 },
    { name: "반월당역", lat: 35.8580, lng: 128.5944 },

    // 대전
    { name: "대전역", lat: 36.3504, lng: 127.3845 },
    { name: "유성온천", lat: 36.3539, lng: 127.3435 },

    // 광주
    { name: "광주 금남로", lat: 35.1546, lng: 126.9161 },

    // 제주
    { name: "제주 중문관광단지", lat: 33.2541, lng: 126.5603 },
  ];

  // 위치 데이터 생성 (시간대별 데이터 포함)
  const generateLocationData = (name: string, lat: number, lng: number): LocationData => {
    const hourlyData = generateHourlyData();
    const currentHour = new Date().getHours();
    const currentData = hourlyData[currentHour];

    // 가장 여유로운 시간대 찾기
    const sortedByPopulation = [...hourlyData].sort((a, b) => a.population - b.population);
    const bestTimeData = sortedByPopulation[0];
    const bestTime = `${bestTimeData.hour}:00 ~ ${bestTimeData.hour + 1}:00 (예상 ${bestTimeData.population.toLocaleString()}명)`;

    // 인근 대체 장소 추천 (거리 기반)
    const nearby = majorLocations
      .filter(loc => {
        const distance = Math.sqrt(
          Math.pow(loc.lat - lat, 2) + Math.pow(loc.lng - lng, 2)
        );
        return loc.name !== name && distance < 0.1; // 약 10km 이내
      })
      .slice(0, 3)
      .map(loc => loc.name);

    return {
      name,
      lat,
      lng,
      currentPopulation: currentData.population,
      currentLevel: currentData.level,
      hourlyData,
      recommendations: {
        bestTime,
        alternativeLocations: nearby.length > 0 ? nearby : ["인근 대체 장소 없음"]
      }
    };
  };

  // 혼잡도 레벨에 따른 색상 반환
  const getLevelColor = (level: string) => {
    switch (level) {
      case "매우혼잡": return "#DC2626";
      case "혼잡": return "#F97316";
      case "보통": return "#FBBF24";
      case "여유": return "#10B981";
      default: return "#6B7280";
    }
  };

  // 주요 지역 마커 표시
  const renderMajorLocations = (map: any) => {
    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    majorLocations.forEach(location => {
      const locationData = generateLocationData(location.name, location.lat, location.lng);
      const color = getLevelColor(locationData.currentLevel);

      // 혼잡도 퍼센트 계산 (0-100%)
      const maxPopulation = 5000;
      const crowdPercent = Math.min(100, Math.round((locationData.currentPopulation / maxPopulation) * 100));

      const markerContent = `
        <div style="cursor: pointer; background: white; border-radius: 16px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); border: 3px solid ${color}; padding: 12px 16px; min-width: 160px; transition: all 0.3s; position: relative;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: 800; font-size: 14px; color: #1f2937; text-align: center;">
              ${location.name}
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span style="font-weight: 700; font-size: 13px; color: ${color}; margin-left: 4px;">
                ${locationData.currentPopulation.toLocaleString()}명
              </span>
            </div>
            <div style="position: relative; height: 24px; background: #f3f4f6; border-radius: 12px; overflow: hidden; border: 2px solid #e5e7eb;">
              <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${crowdPercent}%; background: linear-gradient(90deg, ${color} 0%, ${color}dd 100%); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 11px; font-weight: 800; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3); z-index: 10;">
                  ${locationData.currentLevel}
                </span>
              </div>
            </div>
            <div style="text-align: center; font-size: 10px; color: #6b7280; font-weight: 600;">
              혼잡도 ${crowdPercent}%
            </div>
          </div>
        </div>
      `;

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(location.lat, location.lng),
        map: map,
        icon: {
          content: markerContent,
          anchor: new window.naver.maps.Point(80, 60) //Approx center
        }
      });

      markersRef.current.push(marker);

      // 클릭 이벤트
      window.naver.maps.Event.addListener(marker, 'click', () => {
        setSelectedLocation(locationData);
        map.setCenter(new window.naver.maps.LatLng(location.lat, location.lng));
      });
    });
  };

  useEffect(() => {
    const startApp = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentPosition(position);
            initializeMap(position.lat, position.lng);
          },
          () => {
            const defaultPos = { lat: 37.5665, lng: 126.978 };
            setCurrentPosition(defaultPos);
            initializeMap(defaultPos.lat, defaultPos.lng);
          }
        );
      } else {
        const defaultPos = { lat: 37.5665, lng: 126.978 };
        setCurrentPosition(defaultPos);
        initializeMap(defaultPos.lat, defaultPos.lng);
      }
    };

    const initializeMap = (lat: number, lng: number) => {
      // Use Naver Map
      if (!mapContainerRef.current) return;
      if (!window.naver || !window.naver.maps) {
        // Wait for Naver
        const timer = setInterval(() => {
          if (window.naver && window.naver.maps) {
            clearInterval(timer);
            initializeMap(lat, lng);
          }
        }, 100);
        return;
      }

      try {
        setMapStatus("지도 초기화 중...");
        const mapOptions = {
          center: new window.naver.maps.LatLng(lat, lng),
          zoom: 14, // Roughly equivalent to Kakao Level 8 (which is around 100-200m scale, wait. Kakao L8 is 100m? No. Kakao L1=20m, L2=30m, L3=50m, L4=100m. L8 is large scale. 
          // Let's use Naver Zoom 13-14 for district level.
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false
        };

        const map = new window.naver.maps.Map(mapContainerRef.current, mapOptions);
        mapRef.current = map;
        setMapStatus("완료");

        if (currentPosition) {
          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(currentPosition.lat, currentPosition.lng),
            map: map,
            icon: {
              content: `<div style="width: 14px; height: 14px; background: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
              anchor: new window.naver.maps.Point(7, 7)
            }
          });
        }

        renderMajorLocations(map);

      } catch (err) {
        console.error(err);
        setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
      }
    };

    startApp();

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, []);

  // initialKeyword 처리 - 자동 검색
  useEffect(() => {
    if (initialKeyword && initialKeyword.trim() && mapRef.current) {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(initialKeyword, (data: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.y);
          const lng = parseFloat(result.x);

          // 지도 이동
          const moveLatLng = new window.naver.maps.LatLng(lat, lng);
          mapRef.current.setCenter(moveLatLng);
          mapRef.current.setZoom(15);

          // 해당 위치 데이터 생성 및 표시
          const locationData = generateLocationData(result.place_name, lat, lng);
          setSelectedLocation(locationData);
        }
      });
    }
  }, [initialKeyword, mapRef.current]);

  // 목적지 검색
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !mapRef.current) return;
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert("검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);

        // 지도 이동
        const moveLatLng = new window.naver.maps.LatLng(lat, lng);
        mapRef.current.setCenter(moveLatLng);
        mapRef.current.setZoom(15);

        // 해당 위치 데이터 생성 및 표시
        const locationData = generateLocationData(result.place_name, lat, lng);
        setSelectedLocation(locationData);
      } else {
        alert("검색 결과가 없습니다. 다른 키워드로 검색해주세요.");
      }
    });
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
    <div className="flex flex-col items-center justify-center w-screen min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4 md:p-6">
      {/* (Header omitted for brevity but preserved) */}
      <div className="w-full max-w-[1400px] mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-indigo-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                전국 실시간 혼잡도 모니터링
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg">
                  <p className="text-xs opacity-80">실시간 기준</p>
                  <p className="text-lg font-bold">
                    {currentTime.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} {currentTime.toLocaleTimeString("ko-KR")}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  마지막 갱신: {lastUpdate.toLocaleTimeString("ko-KR")} (1시간마다 자동 갱신)
                </div>
              </div>
            </div>

            {/* 검색창 */}
            <form
              onSubmit={onSearch}
              className="flex gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border-2 border-indigo-200 shadow-sm w-full md:w-auto"
            >
              <input
                className="px-4 py-2 outline-none text-sm bg-white rounded-lg border border-indigo-100 w-full md:w-72 focus:ring-2 focus:ring-indigo-500"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="🔍 목적지 검색 (예: 강남역, 명동, 해운대)"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                검색
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 이용 가이드 */}
      <div className="w-full max-w-[1400px] mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-xl border-2 border-indigo-200">
          <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
            💡 이용 가이드
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <div className="text-white font-bold mb-2 flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <span>검색 방법</span>
              </div>
              <p className="text-white/90 text-sm">
                상단 검색창에 목적지 이름을 입력하세요. 강남역, 명동, 해운대 등 전국 주요 지역을 검색할 수 있습니다.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <div className="text-white font-bold mb-2 flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span>혼잡도 확인</span>
              </div>
              <p className="text-white/90 text-sm">
                지도의 색상 마커를 통해 혼잡도를 확인하세요. 초록색은 여유, 노란색은 보통, 주황색은 혼잡, 빨간색은 매우 혼잡을 나타냅니다.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <div className="text-white font-bold mb-2 flex items-center gap-2">
                <span className="text-xl">📊</span>
                <span>최적 시간 추천</span>
              </div>
              <p className="text-white/90 text-sm">
                지역을 선택하면 24시간 그래프와 함께 가장 여유로운 방문 시간을 추천받을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 전국 24시간 평균 혼잡도 */}
      <div className="w-full max-w-[1400px] mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-indigo-100">
          <h2 className="text-2xl font-black text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 전국 24시간 평균 혼잡도
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            전국 주요 지역의 시간대별 평균 인구 밀집도를 확인하세요. 현재 시간대가 강조 표시됩니다.
          </p>

          <div className="space-y-2">
            {(() => {
              const currentHour = new Date().getHours();

              // 각 시간대별로 전국 평균 계산
              const hourlyAverages = Array.from({ length: 24 }, (_, hour) => {
                // 모든 주요 지역의 해당 시간 인구수 평균 계산
                const avgPopulation = Math.round(
                  majorLocations.reduce((sum) => {
                    const hourlyData = generateHourlyData();
                    return sum + hourlyData[hour].population;
                  }, 0) / majorLocations.length
                );

                // 레벨 판정
                let level: "매우혼잡" | "혼잡" | "보통" | "여유";
                let bgColor: string;
                let textColor: string;

                if (avgPopulation > 4000) {
                  level = "매우혼잡";
                  bgColor = "bg-red-500";
                  textColor = "text-red-700";
                } else if (avgPopulation > 2500) {
                  level = "혼잡";
                  bgColor = "bg-orange-500";
                  textColor = "text-orange-700";
                } else if (avgPopulation > 1000) {
                  level = "보통";
                  bgColor = "bg-yellow-400";
                  textColor = "text-yellow-700";
                } else {
                  level = "여유";
                  bgColor = "bg-green-500";
                  textColor = "text-green-700";
                }

                return { hour, avgPopulation, level, bgColor, textColor };
              });

              // 최대값 찾기 (스케일링용)
              const maxPopulation = Math.max(...hourlyAverages.map(h => h.avgPopulation));

              return hourlyAverages.map(({ hour, avgPopulation, level, bgColor, textColor }) => {
                const isCurrentHour = hour === currentHour;
                const barWidth = (avgPopulation / maxPopulation) * 100;

                return (
                  <div
                    key={hour}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isCurrentHour
                      ? "bg-gradient-to-r from-indigo-100 to-purple-100 ring-2 ring-indigo-500 shadow-md scale-105"
                      : "bg-gray-50 hover:bg-gray-100"
                      }`}
                  >
                    <div className="w-16 text-sm font-bold text-gray-700 flex items-center gap-1">
                      {hour.toString().padStart(2, "0")}:00
                      {isCurrentHour && <span className="text-indigo-600">●</span>}
                    </div>

                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden relative">
                      <div
                        className={`h-full ${bgColor} transition-all duration-500 flex items-center justify-end pr-2`}
                        style={{ width: `${barWidth}%` }}
                      >
                        <span className="text-xs font-semibold text-white drop-shadow">
                          {avgPopulation.toLocaleString()}명
                        </span>
                      </div>
                    </div>

                    <div className={`w-20 text-xs font-bold ${textColor}`}>
                      {level}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 flex items-center gap-2">
              <span className="text-indigo-600 font-bold">●</span>
              현재 시간대는 강조 표시됩니다. 그래프를 참고하여 가장 여유로운 시간대를 선택하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6">
        {/* 지도 영역 */}
        <div className="flex-1 bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 overflow-hidden relative group">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3">
            <h3 className="text-white font-bold text-lg">📍 실시간 혼잡도 지도</h3>
            <p className="text-indigo-100 text-xs mt-1">지도에서 지역을 클릭하여 상세 정보를 확인하세요</p>
          </div>
          <div className="relative w-full h-[600px]">
            <div ref={mapContainerRef} className="w-full" style={{ width: "100%", height: "600px" }} />

            {/* 진단 오버레이 */}
            {(mapError || mapStatus !== "완료") && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                <p className="text-base text-gray-600 mb-2">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
                {mapError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm font-bold text-red-600 mb-1">오류 발생</p>
                    <p className="text-sm text-red-500">{mapError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend (Top Right) */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-indigo-100 z-50 pointer-events-none">
            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
              혼잡도 범례
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600 shadow-sm shadow-red-200"></div>
                <span className="text-[11px] font-semibold text-gray-600">매우혼잡</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></div>
                <span className="text-[11px] font-semibold text-gray-600">혼잡</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm shadow-yellow-200"></div>
                <span className="text-[11px] font-semibold text-gray-600">보통</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>
                <span className="text-[11px] font-semibold text-gray-600">여유</span>
              </div>
            </div>
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

        {/* 상세 정보 패널 */}
        {selectedLocation && (
          <div className="lg:w-[450px] bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold text-xl">{selectedLocation.name}</h3>
                  <p className="text-indigo-100 text-sm">현재 시각: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[550px] overflow-y-auto">
              {/* 현재 혼잡도 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border-2 border-indigo-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">현재 혼잡도</span>
                  <span className={`text-lg font-black px-4 py-2 rounded-full ${selectedLocation.currentLevel === "매우혼잡" ? "bg-red-100 text-red-700" :
                    selectedLocation.currentLevel === "혼잡" ? "bg-orange-100 text-orange-700" :
                      selectedLocation.currentLevel === "보통" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                    }`}>
                    {selectedLocation.currentLevel}
                  </span>
                </div>
                <div className="text-center mt-3">
                  <p className="text-4xl font-black text-indigo-600">
                    {selectedLocation.currentPopulation.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">예상 방문객 수 (명)</p>
                </div>
              </div>

              {/* 시간대별 혼잡도 그래프 */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📊</span> 24시간 혼잡도 추이
                </h4>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-end justify-between gap-1 h-32">
                    {selectedLocation.hourlyData.map((data) => {
                      const maxPop = Math.max(...selectedLocation.hourlyData.map(d => d.population));
                      const height = (data.population / maxPop) * 100;
                      const color = getLevelColor(data.level);
                      const isCurrentHour = data.hour === new Date().getHours();

                      return (
                        <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t transition-all hover:opacity-80 relative group"
                            style={{
                              height: `${height}%`,
                              backgroundColor: color,
                              boxShadow: isCurrentHour ? '0 0 10px rgba(99, 102, 241, 0.8)' : 'none',
                              border: isCurrentHour ? '2px solid #4F46E5' : 'none'
                            }}
                          >
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {data.hour}시: {data.population.toLocaleString()}명
                            </div>
                          </div>
                          <span className={`text-xs ${isCurrentHour ? 'font-bold text-indigo-600' : 'text-gray-500'}`}>
                            {data.hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    * 마우스를 올려 상세 정보 확인
                  </div>
                </div>
              </div>

              {/* AI 추천 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">💡</span> AI 추천
                </h4>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">가장 여유로운 시간대</p>
                    <p className="text-sm font-bold text-green-700">
                      ⏰ {selectedLocation.recommendations.bestTime}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 mb-2">인근 대체 장소</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLocation.recommendations.alternativeLocations.map((alt, idx) => (
                        <span key={idx} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 정보 */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 leading-relaxed">
                  ℹ️ 이 데이터는 과거 방문 패턴과 현재 시간을 기반으로 추정된 값입니다.
                  실제 혼잡도는 날씨, 이벤트 등 다양한 요인에 따라 달라질 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 선택되지 않았을 때 안내 메시지 */}
        {!selectedLocation && (
          <div className="lg:w-[450px] bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">지역을 선택해주세요</h3>
              <p className="text-sm text-gray-600 mb-6">
                지도에서 마커를 클릭하거나<br />
                상단 검색창에서 목적지를 검색하세요
              </p>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-xs text-indigo-800 font-semibold">
                  💡 Tip: 전국 주요 지역의 실시간 혼잡도를 확인하고,<br />
                  방문하기 좋은 시간대를 추천받을 수 있습니다!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 홈으로 돌아가기 버튼 */}
      <button
        onClick={onBack}
        className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-12 py-4 rounded-full text-lg font-bold hover:from-gray-900 hover:to-black transition-all shadow-xl hover:shadow-2xl hover:scale-105"
      >
        🏠 홈으로 돌아가기
      </button>
    </div>
  );
}

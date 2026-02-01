import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import type { SmokingBooth } from "../services/smokingBoothService";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

interface RegionDetailProps {
  region: string;
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

export default function RegionDetail({ region, onBack }: RegionDetailProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const mapContainerRef1 = useRef<HTMLDivElement>(null);
  const mapContainerRef2 = useRef<HTMLDivElement>(null);
  const mapRef1 = useRef<any>(null);
  const mapRef2 = useRef<any>(null);
  const [nationalBooths, setNationalBooths] = useState<SmokingBooth[]>([]);

  // 데이터 로드 & 스크롤 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
    const loadBooths = async () => {
      const booths = await getNationalSmokingBooths();
      setNationalBooths(booths);
    };
    loadBooths();
  }, []);
  const [stats, setStats] = useState({ within500m: 0, within1km: 0, within2km: 0 });

  // 진단 상태 (지도 1: 흡연부스)
  const [map1Error, setMap1Error] = useState<string | null>(null);
  const [map1Status, setMap1Status] = useState<string>("준비 중...");

  // 진단 상태 (지도 2: 혼잡도)
  const [map2Error, setMap2Error] = useState<string | null>(null);
  const [map2Status, setMap2Status] = useState<string>("준비 중...");

  // 거리 계산 유틸리티 (필요시)
  const calculateDist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 지역별 중심 좌표 및 zoom level 설정
  const getRegionInfo = (regionName: string) => {
    const regionMap: { [key: string]: { lat: number; lng: number; level: number; keyword: string } } = {
      "서울": { lat: 37.5665, lng: 126.978, level: 12, keyword: "서울" },
      "경기": { lat: 37.4138, lng: 127.5183, level: 10, keyword: "경기" },
      "인천": { lat: 37.4563, lng: 126.7052, level: 11, keyword: "인천" },
      "부산": { lat: 35.1796, lng: 129.0756, level: 11, keyword: "부산" },
      "대구": { lat: 35.8714, lng: 128.6014, level: 11, keyword: "대구" },
      "광주": { lat: 35.1595, lng: 126.8526, level: 11, keyword: "광주" },
      "대전": { lat: 36.3504, lng: 127.3845, level: 11, keyword: "대전" },
      "제주": { lat: 33.4890, lng: 126.4983, level: 10, keyword: "제주" },
    };
    return regionMap[regionName] || regionMap["서울"];
  };

  const regionInfo = getRegionInfo(region);

  // 해당 지역의 흡연부스 필터링 (주소 기반)
  const getRegionBooths = (): SmokingBooth[] => {
    return nationalBooths.filter(booth =>
      booth.address.includes(regionInfo.keyword)
    );
  };

  const regionBooths = getRegionBooths();

  // 지역별 주요 장소 (혼잡도 모니터링용)
  const getRegionLocations = () => {
    const locationsByRegion: { [key: string]: { name: string; lat: number; lng: number }[] } = {
      "서울": [
        { name: "강남역", lat: 37.4979, lng: 127.0276 },
        { name: "홍대입구역", lat: 37.5572, lng: 126.9247 },
        { name: "명동", lat: 37.5637, lng: 126.9838 },
        { name: "잠실역", lat: 37.5145, lng: 127.0595 },
        { name: "신촌역", lat: 37.5219, lng: 126.9245 },
        { name: "이태원역", lat: 37.5344, lng: 126.9944 },
      ],
      "경기": [
        { name: "수원역", lat: 37.2660, lng: 127.0011 },
        { name: "분당", lat: 37.3595, lng: 127.1052 },
        { name: "일산", lat: 37.6583, lng: 126.7680 },
        { name: "안양", lat: 37.3943, lng: 126.9568 },
      ],
      "인천": [
        { name: "인천공항", lat: 37.4602, lng: 126.4407 },
        { name: "송도센트럴파크", lat: 37.3894, lng: 126.6544 },
        { name: "부평역", lat: 37.4895, lng: 126.7226 },
      ],
      "부산": [
        { name: "서면역", lat: 35.1796, lng: 129.0756 },
        { name: "해운대해수욕장", lat: 35.1585, lng: 129.1606 },
        { name: "광안리해수욕장", lat: 35.1532, lng: 129.1189 },
      ],
      "대구": [
        { name: "동성로", lat: 35.8714, lng: 128.6014 },
        { name: "반월당역", lat: 35.8580, lng: 128.5944 },
      ],
      "광주": [
        { name: "광주 금남로", lat: 35.1546, lng: 126.9161 },
      ],
      "대전": [
        { name: "대전역", lat: 36.3504, lng: 127.3845 },
        { name: "유성온천", lat: 36.3539, lng: 127.3435 },
      ],
      "제주": [
        { name: "제주 중문관광단지", lat: 33.2541, lng: 126.5603 },
      ],
    };
    return locationsByRegion[region] || locationsByRegion["서울"];
  };

  const regionLocations = getRegionLocations();

  // 시간대별 혼잡도 데이터 생성
  const generateHourlyData = (): HourlyData[] => {
    const hourlyData: HourlyData[] = [];
    for (let hour = 0; hour < 24; hour++) {
      let congestionPercent = 0;
      if ((hour >= 8 && hour < 10) || (hour >= 12 && hour < 13) || (hour >= 18 && hour < 20)) {
        congestionPercent = 80 + Math.random() * 30;
      } else {
        congestionPercent = 20 + Math.random() * 30;
      }
      const basePopulation = Math.floor((congestionPercent / 100) * 5000);
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

  // 혼잡도 레벨 색상
  const getLevelColor = (level: string) => {
    switch (level) {
      case "매우혼잡": return "#DC2626";
      case "혼잡": return "#FF6B6B";
      case "보통": return "#F97316";
      case "여유": return "#10B981";
      default: return "#6B7280";
    }
  };

  // 거리 계산 함수 (추후 사용 가능)
  // const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  //   const R = 6371000;
  //   const dLat = ((lat2 - lat1) * Math.PI) / 180;
  //   const dLng = ((lng2 - lng1) * Math.PI) / 180;
  //   const a =
  //     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //     Math.cos((lat1 * Math.PI) / 180) *
  //       Math.cos((lat2 * Math.PI) / 180) *
  //       Math.sin(dLng / 2) *
  //       Math.sin(dLng / 2);
  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //   return R * c;
  // };

  // 흡연부스 지도 초기화
  useEffect(() => {
    const initializeBoothMap = () => {
      if (!mapContainerRef1.current) return;
      if (!window.naver || !window.naver.maps) return;

      try {
        setMap1Status("지도 초기화 중...");
        const center = new window.naver.maps.LatLng(regionInfo.lat, regionInfo.lng);
        const mapOptions = {
          center: center,
          zoom: regionInfo.level,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false,
          scrollWheel: false
        };

        const map = new window.naver.maps.Map(mapContainerRef1.current, mapOptions);
        mapRef1.current = map;
        setMap1Status("완료");

        // 지역 흡연부스 마커 표시
        regionBooths.forEach((booth) => {
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
            map: map,
            icon: {
              content: markerContent,
              anchor: new window.naver.maps.Point(16, 16)
            }
          });
        });

        const updateStats = () => {
          const center = map.getCenter();
          const cLat = center.y;
          const cLng = center.x;

          let ww500 = 0, ww1k = 0, ww2k = 0;
          nationalBooths.forEach(booth => {
            const d = calculateDist(cLat, cLng, booth.latitude, booth.longitude);
            if (d <= 500) ww500++;
            if (d <= 1000) ww1k++;
            if (d <= 2000) ww2k++;
          });
          setStats({ within500m: ww500, within1km: ww1k, within2km: ww2k });
        };

        // 초기 통계
        updateStats();

        // 지도 이동 시 통계 업데이트
        window.naver.maps.Event.addListener(map, 'idle', updateStats);

      } catch (err) {
        console.error(err);
        setMap1Error("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
      }
    };

    // Retry until Naver is loaded (index.html loads it)
    const timer = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(timer);
        initializeBoothMap();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [regionBooths]);

  // 혼잡도 지도 초기화
  useEffect(() => {
    const initializeCrowdMap = () => {
      if (!mapContainerRef2.current) return;
      if (!window.naver || !window.naver.maps) return;

      try {
        setMap2Status("지도 초기화 중...");
        const center = new window.naver.maps.LatLng(regionInfo.lat, regionInfo.lng);
        const mapOptions = {
          center: center,
          zoom: regionInfo.level,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false,
          scrollWheel: false
        };

        const map = new window.naver.maps.Map(mapContainerRef2.current, mapOptions);
        mapRef2.current = map;
        setMap2Status("완료");

        // 지역 혼잡도 마커 표시
        regionLocations.forEach((loc) => {
          const data = generateLocationData(loc.name, loc.lat, loc.lng);
          const color = getLevelColor(data.currentLevel);
          const radius = data.currentLevel === "매우혼잡" ? 45 :
            data.currentLevel === "혼잡" ? 38 :
              data.currentLevel === "보통" ? 32 : 28;

          const markerContent = `
                <div style="position: relative; width: ${radius}px; height: ${radius}px; cursor: pointer;">
                    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 15px ${color}, 0 4px 10px rgba(0,0,0,0.3);"></div>
                        <div style="position: absolute; font-size: 10px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); white-space: nowrap; top: -20px;">${loc.name}</div>
                        <div style="position: absolute; font-size: 8px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.8); bottom: -18px;">${data.currentLevel}</div>
                    </div>
                </div>
                `;

          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(loc.lat, loc.lng),
            map: map,
            icon: {
              content: markerContent,
              anchor: new window.naver.maps.Point(radius / 2, radius / 2)
            }
          });
        });

      } catch (err) {
        console.error(err);
        setMap2Error("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
      }
    };

    const timer = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(timer);
        initializeCrowdMap();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [regionLocations, regionInfo]);

  // 1분마다 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 통계 계산
  const allLocations = regionLocations.map(loc => generateLocationData(loc.name, loc.lat, loc.lng));
  const avgPopulation = Math.floor(
    allLocations.reduce((sum, loc) => sum + loc.currentPopulation, 0) / allLocations.length
  );

  // 줌 컨트롤 핸들러 (지도 1)
  const handleZoomIn1 = () => {
    if (mapRef1.current) {
      mapRef1.current.setZoom(mapRef1.current.getZoom() + 1);
    }
  };

  const handleZoomOut1 = () => {
    if (mapRef1.current) {
      mapRef1.current.setZoom(mapRef1.current.getZoom() - 1);
    }
  };

  // 줌 컨트롤 핸들러 (지도 2)
  const handleZoomIn2 = () => {
    if (mapRef2.current) {
      mapRef2.current.setZoom(mapRef2.current.getZoom() + 1);
    }
  };

  const handleZoomOut2 = () => {
    if (mapRef2.current) {
      mapRef2.current.setZoom(mapRef2.current.getZoom() - 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-screen min-h-screen bg-transparent transition-colors duration-500 overflow-y-auto">
      {/* 헤더 */}
      <div className="w-full w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4">
            🏙️ {region} 지역 정보
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            {region} 지역의 흡연부스 위치, 실시간 혼잡도, 추천 산책코스를 한눈에 확인하세요
          </p>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="w-full w-full px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">흡연부스</p>
            <p className="text-4xl font-black">{regionBooths.length}개</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">모니터링 지점</p>
            <p className="text-4xl font-black">{regionLocations.length}곳</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">평균 인구</p>
            <p className="text-4xl font-black">{avgPopulation.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 지도 섹션 - 가로 배치 */}
      <div className="w-full w-full px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 흡연부스 지도 섹션 */}
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-5">
            <h2 className="text-2xl font-black text-gray-900 mb-3">🗺️ {region} 흡연부스 위치</h2>
            <p className="text-gray-600 mb-3 text-sm">
              {region} 지역의 흡연부스 {regionBooths.length}개가 표시되어 있습니다.
            </p>
            <div className="relative">
              <div
                ref={mapContainerRef1}
                className="w-full rounded-lg shadow-lg mb-3"
                style={{ width: "100%", height: "400px", border: "2px solid #dbeafe" }}
              />

              {/* 진단 오버레이 (지도 1) */}
              {(map1Error || map1Status !== "완료") && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <h3 className="text-xs font-bold text-gray-900 mb-1">지도 1 진단 중...</h3>
                  <p className="text-[10px] text-gray-600 mb-1">상태: <span className="font-mono text-blue-600">{map1Status}</span></p>
                  {map1Error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-[9px] text-red-500">{map1Error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 거리별 흡연구역 수량 박스 (Top Left Overlay) */}
              <div className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-blue-100 min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📍</span>
                  <h4 className="text-xs font-bold text-gray-900">주변 현황</h4>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded-lg">
                    <span className="text-[9px] font-bold text-blue-700">500m</span>
                    <span className="text-xs font-black text-blue-900">{stats.within500m}개</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-indigo-50 rounded-lg">
                    <span className="text-[9px] font-bold text-indigo-700">1km</span>
                    <span className="text-xs font-black text-indigo-900">{stats.within1km}개</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-purple-50 rounded-lg">
                    <span className="text-[9px] font-bold text-purple-700">2km</span>
                    <span className="text-xs font-black text-purple-900">{stats.within2km}개</span>
                  </div>
                </div>
              </div>

              {/* Custom Zoom Controls (Inside Map Wrapper) */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn1}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="확대"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
                </button>
                <button
                  onClick={handleZoomOut1}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="축소"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
                </button>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-700 font-semibold">💡 사용 팁</p>
              <p className="text-xs text-gray-600 mt-1">
                파란색 전파 효과가 있는 아이콘이 흡연부스 위치입니다.
              </p>
            </div>
          </div>

          {/* 혼잡도 모니터링 섹션 */}
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 p-5">
            <h2 className="text-2xl font-black text-gray-900 mb-3">📊 {region} 실시간 혼잡도</h2>
            <p className="text-gray-600 mb-3 text-sm">
              {region} 지역 주요 {regionLocations.length}개 지점의 인구 밀집도입니다.
            </p>
            <div className="relative">
              <div
                ref={mapContainerRef2}
                className="w-full rounded-lg shadow-lg mb-3"
                style={{ width: "100%", height: "400px", border: "2px solid #e0e7ff" }}
              />

              {/* 진단 오버레이 (지도 2) */}
              {(map2Error || map2Status !== "완료") && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <h3 className="text-xs font-bold text-gray-900 mb-1">지도 2 진단 중...</h3>
                  <p className="text-[10px] text-gray-600 mb-1">상태: <span className="font-mono text-indigo-600">{map2Status}</span></p>
                  {map2Error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-[9px] text-red-500">{map2Error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Zoom Controls (Inside Map Wrapper) */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn2}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="확대"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
                </button>
                <button
                  onClick={handleZoomOut2}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="축소"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10B981" }}></div>
                <span className="text-xs font-semibold text-gray-700">여유</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#F97316" }}></div>
                <span className="text-xs font-semibold text-gray-700">보통</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF6B6B" }}></div>
                <span className="text-xs font-semibold text-gray-700">혼잡</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#DC2626" }}></div>
                <span className="text-xs font-semibold text-gray-700">매우혼잡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 추천 산책코스 섹션 */}
      <div className="w-full w-full px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green-200 p-6">
          <h2 className="text-3xl font-black text-gray-900 mb-4">🚶 {region} 추천 산책코스</h2>
          <p className="text-gray-600 mb-6">
            흡연부스를 회피한 쾌적한 산책코스를 추천합니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: `${region} 힐링 숲길`, distance: "1.2km", time: "20분", level: "쉬움" },
              { name: `${region} 강변 산책로`, distance: "2.5km", time: "40분", level: "보통" },
              { name: `${region} 공원 둘레길`, distance: "800m", time: "15분", level: "쉬움" },
              { name: `${region} 전망 트레일`, distance: "3.2km", time: "60분", level: "어려움" },
            ].map((course, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-3">{course.name}</h3>
                <div className="flex gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">거리:</span>
                    <span className="text-sm font-bold text-green-600">{course.distance}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">시간:</span>
                    <span className="text-sm font-bold text-blue-600">{course.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">난이도:</span>
                    <span className="text-sm font-bold text-orange-600">{course.level}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  흡연부스를 회피하여 설계된 쾌적한 산책 코스입니다.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="w-full w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex justify-center">
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
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import type { SmokingBooth } from "../services/smokingBoothService";
import { MergeSection, MergeCardGrid, FadeInSection } from "../components/MergeScrollAnimation";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

export default function SmokingBoothDetailPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Haversine formula
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nationalBooths, setNationalBooths] = useState<SmokingBooth[]>([]);

  // 데이터 로드
  useEffect(() => {
    const loadBooths = async () => {
      const booths = await getNationalSmokingBooths();
      setNationalBooths(booths);
    };
    loadBooths();
  }, []);
  const [selectedBooth, setSelectedBooth] = useState<(SmokingBooth & { distance: number }) | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  // 스크롤 잠금 해제
  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);

  const [mapStatus, setMapStatus] = useState<string>("준비 중...");
  const [mapError, setMapError] = useState<string | null>(null);

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
          setTimeout(() => setUserLocation({ lat: 37.5665, lng: 126.978 }), 0);
        }
      );
    } else {
      setTimeout(() => setUserLocation({ lat: 37.5665, lng: 126.978 }), 0);
    }
  }, []);

  // 가까운 흡연부스 계산
  const nearbyBooths = useMemo(() => {
    if (!userLocation) return [];

    return nationalBooths
      .map((booth) => ({
        ...booth,
        distance: getDistance(userLocation.lat, userLocation.lng, booth.latitude, booth.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [userLocation, nationalBooths]);

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
            const center = new window.naver.maps.LatLng(userLocation.lat, userLocation.lng);
            const mapOptions = {
              center: center,
              zoom: 15,
              scaleControl: false,
              logoControl: false,
              mapDataControl: false,
              zoomControl: false,
              mapTypeControl: false,
              scrollWheel: false,
            };
            const map = new window.naver.maps.Map(mapContainerRef.current, mapOptions);
            mapRef.current = map;
            setMapStatus("완료");

            // 사용자 위치 마커
            new window.naver.maps.Marker({
              position: center,
              map: map,
              icon: {
                content: `<img src="${import.meta.env.BASE_URL}image/user-marker.svg" style="width:40px; height:40px;" />`,
                anchor: new window.naver.maps.Point(20, 20)
              }
            });

            // 흡연부스 마커
            nearbyBooths.forEach((booth: SmokingBooth & { distance: number }) => {
              const markerContent = `
                <div style="position: relative; width: 36px; height: 36px; cursor: pointer;">
                  <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                    <div class="smoke-marker-ripple"></div>
                    <div class="smoke-marker-ripple"></div>
                    <div class="smoke-marker-ripple"></div>
                    <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="흡연부스" style="width: 32px; height: 32px; position: relative; z-index: 10; mix-blend-mode: multiply; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />
                  </div>
                </div>
              `;

              const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(booth.latitude, booth.longitude),
                map: map,
                icon: {
                  content: markerContent,
                  anchor: new window.naver.maps.Point(18, 18)
                }
              });

              window.naver.maps.Event.addListener(marker, 'click', () => {
                setSelectedBooth(booth);
                map.setCenter(new window.naver.maps.LatLng(booth.latitude, booth.longitude));
                map.setZoom(17);
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
  }, [userLocation, nearbyBooths]);


  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
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

  const getCurrentTimeString = () => {
    const year = currentTime.getFullYear();
    const month = String(currentTime.getMonth() + 1).padStart(2, '0');
    const day = String(currentTime.getDate()).padStart(2, '0');
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim() || !mapRef.current) return;

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert("검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(searchKeyword, (data: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const result = data[0];
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);
        // Naver Map Center Move
        mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
        mapRef.current.setZoom(15);
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  // 통계 계산
  const stats = {
    within500m: nearbyBooths.filter(b => b.distance <= 500).length,
    within1km: nearbyBooths.filter(b => b.distance <= 1000).length,
    within2km: nearbyBooths.filter(b => b.distance <= 2000).length,
    total: nationalBooths.length,
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 overflow-x-hidden transition-colors duration-500">
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
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">흡연부스 위치 안내</h1>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">전국 흡연부스 위치 및 피해 경로 안내</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-full">
                <span className="text-sm font-bold text-green-700">{getCurrentTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 md:px-12 py-8">
        {/* 실시간 표시 (모바일) */}
        <FadeInSection className="md:hidden mb-6">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-2xl text-center">
            <p className="text-sm opacity-90">실시간 기준</p>
            <p className="text-2xl font-black">{getCurrentTimeString()}</p>
          </div>
        </FadeInSection>

        {/* 통계 카드 - Merge 애니메이션 적용 */}
        <MergeCardGrid columns={4} className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-green-200 dark:border-green-900/30 transition-colors">
            <p className="text-sm text-gray-800 dark:text-gray-300 mb-1 font-bold">반경 500m</p>
            <p className="text-4xl font-black text-green-600 dark:text-green-400">{stats.within500m}</p>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold">개의 흡연부스</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-emerald-200 dark:border-emerald-900/30 transition-colors">
            <p className="text-sm text-gray-800 dark:text-gray-300 mb-1 font-bold">반경 1km</p>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{stats.within1km}</p>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold">개의 흡연부스</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-teal-200 dark:border-teal-900/30 transition-colors">
            <p className="text-sm text-gray-800 dark:text-gray-300 mb-1 font-bold">반경 2km</p>
            <p className="text-4xl font-black text-teal-600 dark:text-teal-400">{stats.within2km}</p>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold">개의 흡연부스</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-blue-200 dark:border-blue-900/30 transition-colors">
            <p className="text-sm text-gray-800 dark:text-gray-300 mb-1 font-bold">전국 총</p>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.total}</p>
            <p className="text-xs text-gray-700 dark:text-gray-400 font-bold">개의 흡연부스</p>
          </div>
        </MergeCardGrid>

        {/* 검색바 */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="목적지를 검색하세요 (예: 강남역, 서울역)"
              className="flex-1 px-6 py-4 rounded-full border-2 border-green-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none text-lg shadow-md transition-colors"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              검색
            </button>
          </form>
        </div>
        {/* 메인 컨텐츠 - Merge 애니메이션 적용 */}
        <MergeSection
          className="mb-8"
          gap="gap-8"
          leftContent={
            <div className="space-y-8">
              {/* 지도 */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-green-100 dark:border-slate-800 relative group transition-colors">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                  <h2 className="text-white font-bold text-xl">실시간 흡연부스 지도</h2>
                  <p className="text-green-100 text-sm">내 위치 기준 주변 흡연부스가 표시됩니다</p>
                </div>
                <div className="relative">
                  <div ref={mapContainerRef} className="w-full h-[500px]" />

                  {/* 진단 오버레이 */}
                  {(mapError || mapStatus !== "완료") && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                      <p className="text-[11px] text-gray-800 mb-1 font-medium">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
                      {mapError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                          <p className="text-xs text-red-500">{mapError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 거리별 흡연구역 수량 박스 (Top Left Overlay) */}
                <div className="absolute top-[80px] left-4 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-green-100 dark:border-slate-700 min-w-[180px] transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📊</span>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white text-left">주변 흡연구역</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-[10px] font-bold text-green-700 dark:text-green-400">반경 500m</span>
                      <span className="text-sm font-black text-green-900 dark:text-green-100">{stats.within500m}개</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">반경 1km</span>
                      <span className="text-sm font-black text-emerald-900 dark:text-emerald-100">{stats.within1km}개</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">반경 2km</span>
                      <span className="text-sm font-black text-teal-900 dark:text-teal-100">{stats.within2km}개</span>
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

              {/* 피해 경로 안내 */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 text-white shadow-2xl">
                <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                  <span className="text-3xl">🚶</span>
                  흡연부스 피해 경로 안내
                </h3>
                <p className="text-lg opacity-90 mb-6">
                  흡연 구역을 피해서 이동하고 싶으신가요? 아래 기능을 활용해보세요.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30">
                    <h4 className="font-bold text-lg mb-2">실시간 위치 확인</h4>
                    <p className="text-sm opacity-90">
                      현재 위치 기준으로 주변 흡연부스 위치를 확인하고, 해당 지역을 피해 이동할 수 있습니다.
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30">
                    <h4 className="font-bold text-lg mb-2">목적지 검색</h4>
                    <p className="text-sm opacity-90">
                      목적지를 검색하면 해당 지역 주변의 흡연부스 위치를 미리 파악할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
          rightContent={
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-green-100 sticky top-24">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <h2 className="text-white font-bold text-xl">내 주변 흡연부스</h2>
                <p className="text-green-100 text-sm">거리순으로 정렬됩니다</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {nearbyBooths.map((booth, index) => (
                  <div
                    key={booth.id}
                    onClick={() => {
                      setSelectedBooth(booth);
                      if (mapRef.current) {
                        mapRef.current.setCenter(new window.naver.maps.LatLng(booth.latitude, booth.longitude));
                        mapRef.current.setZoom(16);
                      }
                    }}
                    className={`p-4 border-b border-gray-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-green-50 dark:hover:bg-green-900/20 ${selectedBooth?.id === booth.id ? "bg-green-100 dark:bg-green-900/40" : ""
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{booth.name}</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-400 font-medium">{booth.address}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-black ${booth.distance <= 500 ? "text-green-600" :
                          booth.distance <= 1000 ? "text-yellow-600" :
                            "text-orange-600"
                          }`}>
                          {formatDistance(booth.distance)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        {/* 선택된 흡연부스 상세 정보 */}
        {selectedBooth && (
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border-2 border-green-200 dark:border-green-900/30 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">{selectedBooth.name}</h3>
                <p className="text-lg text-gray-800 dark:text-gray-300 font-bold">{selectedBooth.address}</p>
              </div>
              <button
                onClick={() => setSelectedBooth(null)}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-700 transition"
              >
                <span className="text-2xl text-gray-700 dark:text-gray-300">×</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800/30">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-bold">거리</p>
                <p className="text-4xl font-black text-green-600 dark:text-green-400">{formatDistance(selectedBooth.distance)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800/30">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-bold">지역</p>
                <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{selectedBooth.city}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800/30">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-bold">도보 예상 시간</p>
                <p className="text-4xl font-black text-purple-600 dark:text-purple-400">
                  {Math.ceil(selectedBooth.distance / 80)}분
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 이용 안내 */}
        <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-8 text-white">
          <h3 className="text-2xl font-black mb-6">서비스 이용 안내</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-4xl mb-4">📍</div>
              <h4 className="font-bold text-lg mb-2">위치 기반 서비스</h4>
              <p className="text-sm opacity-100 font-medium">
                현재 위치를 기반으로 가장 가까운 흡연부스를 자동으로 찾아드립니다.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-4xl mb-4">🗺️</div>
              <h4 className="font-bold text-lg mb-2">전국 커버리지</h4>
              <p className="text-sm opacity-100 font-medium">
                전국 {stats.total}개 이상의 흡연부스 위치 정보를 제공합니다.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-4xl mb-4">⏱️</div>
              <h4 className="font-bold text-lg mb-2">실시간 업데이트</h4>
              <p className="text-sm opacity-100 font-medium">
                위치 정보는 실시간으로 업데이트되어 정확한 정보를 제공합니다.
              </p>
            </div>
          </div>
        </div>
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
          <p className="text-gray-500 font-medium">© 2024 Flow - 흡연부스 위치 안내 서비스</p>
        </div>
      </footer>
    </div>
  );
}

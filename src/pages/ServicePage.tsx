import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import { findPath, calculatePathDistance } from "../utils/pathfinding";
import { getEnvironmentData } from "../services/weatherService";
import type { SmokingBooth } from "../services/smokingBoothService";
import { calculateDistance } from "../utils/pathfinding";
import type { Point } from "../utils/pathfinding";
import type { EnvironmentData } from "../services/weatherService";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}



/**
 * Merge 스크롤 애니메이션 래퍼 컴포넌트
 */
function MergeAnimation({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const initialX = direction === "left" ? -100 : 100;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: initialX }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: initialX }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ServicePage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [startKeyword, setStartKeyword] = useState("");
  const [destKeyword, setDestKeyword] = useState("");


  const [nationalBooths, setNationalBooths] = useState<SmokingBooth[]>([]);

  // 데이터 로드
  useEffect(() => {
    const loadBooths = async () => {
      const booths = await getNationalSmokingBooths();
      setNationalBooths(booths);
    };
    loadBooths();
  }, []);
  const markersRef = useRef<any[]>([]);
  const pathOverlayRef = useRef<any>(null);

  const [environmentData, setEnvironmentData] = useState<EnvironmentData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyInfo, setNearbyInfo] = useState<{ within500m: number; within1km: number; within2km: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");
  const [showFullMap, setShowFullMap] = useState(false);

  // 스크롤 잠금 관리
  useEffect(() => {
    if (showFullMap) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [showFullMap]);

  /**
   * 실시간 시간 업데이트
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * 환경 데이터 로드
   */
  useEffect(() => {
    const loadEnvironmentData = async () => {
      try {
        const data = await getEnvironmentData();
        setEnvironmentData(data);
      } catch (error) {
        console.error("환경 데이터 로드 실패:", error);
      }
    };

    loadEnvironmentData();
    // 1시간마다 환경 데이터 갱신 (수정: 5분 -> 1시간)
    const interval = setInterval(loadEnvironmentData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 전국 흡연부스 마커 렌더링
   */
  const renderSmokingBooths = useCallback((map: any) => {
    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 전국 흡연부스 마커 생성
    nationalBooths.forEach((booth) => {
      const isUserBooth = booth.type === 'user';
      const markerContent = `
        <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.2); background-color: transparent;">
          <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="${booth.name}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      `;

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(booth.latitude, booth.longitude),
        map: map,
        icon: {
          content: markerContent,
          anchor: new window.naver.maps.Point(16, 16)
        },
        title: isUserBooth ? `[사용자] ${booth.name}` : booth.name
      });

      markersRef.current.push(marker);
    });
  }, [nationalBooths]);

  /**
   * 경로 그리기 (초록색 입체감)
   */
  const drawPath = (map: any, path: Point[]) => {
    // 기존 경로 제거
    if (pathOverlayRef.current) {
      pathOverlayRef.current.setMap(null);
    }

    // Naver Maps LatLng 배열로 변환
    const linePath = path.map(
      (p) => new window.naver.maps.LatLng(p.lat, p.lng)
    );

    // 입체감 있는 초록색 라인
    const polyline = new window.naver.maps.Polyline({
      path: linePath,
      strokeColor: "#10B981", // 초록색
      strokeOpacity: 0.9,
      strokeWeight: 8,
      map: map
    });

    pathOverlayRef.current = polyline;

    // 경로 거리 계산
    calculatePathDistance(path);
  };

  /**
   * 지도 초기화
   */
  useEffect(() => {
    const startApp = () => {
      const initLogic = () => {
        if (!window.naver || !window.naver.maps) {
          setMapError("네이버 맵 SDK를 찾을 수 없습니다.");
          return;
        }

        const handleInit = (lat: number, lng: number) => {
          setUserLocation({ lat, lng });

          try {
            if (mapContainerRef.current) {
              setMapStatus("지도 초기화 중...");
              const center = new window.naver.maps.LatLng(lat, lng);
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
                },
                title: "내 위치"
              });

              // 전국 흡연부스 마커 렌더링
              renderSmokingBooths(map);
            }
          } catch (err) {
            console.error(err);
            setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
          }
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => handleInit(pos.coords.latitude, pos.coords.longitude),
            () => handleInit(37.5665, 126.978)
          );
        } else {
          handleInit(37.5665, 126.978);
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

    startApp();
  }, [nationalBooths, renderSmokingBooths]);

  /**
   * 전체 화면 전환 시 지도 레이아웃 갱신 및 범위 재조정
   */
  /**
   * 전체 화면 전환 시 지도 레이아웃 갱신 및 범위 재조정
   */
  useEffect(() => {
    if (mapRef.current) {
      // 레이아웃 갱신 (Naver Maps needs resize trigger often if container changes)
      mapRef.current.setSize(new window.naver.maps.Size(mapContainerRef.current?.offsetWidth || 0, mapContainerRef.current?.offsetHeight || 0));

      // 경로가 있으면 해당 범위로 다시 맞춤 (꽉 차게 보여주기)
      if (pathOverlayRef.current) {
        const path = pathOverlayRef.current.getPath();
        if (path && path.getLength() > 0) {
          // Naver Polyline 'getPath()' returns MVCArray of LatLng
          // We need to create bounds
          let bounds: any;
          path.forEach((latlng: any, index: number) => {
            if (index === 0) {
              bounds = new window.naver.maps.LatLngBounds(latlng, latlng);
            } else {
              bounds.extend(latlng);
            }
          });
          if (bounds) {
            mapRef.current.fitBounds(bounds);
          }
        }
      }
    }
  }, [showFullMap]);

  /**
   * 장소 검색 및 경로 탐색 (실시간 현재 위치 기준)
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!destKeyword.trim()) {
      alert("목적지를 입력해주세요.");
      return;
    }

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert("검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();

    // 출발지: 사용자가 입력했으면 검색, 아니면 현재 위치 사용
    const processRoute = async (start: Point) => {
      // 목적지 검색 (전국 단위 지원)
      ps.keywordSearch(destKeyword, async (destData: any, destStatus: any) => {
        if (destStatus === window.kakao.maps.services.Status.OK) {
          const dest: Point = {
            lat: parseFloat(destData[0].y),
            lng: parseFloat(destData[0].x),
          };

          // 흡연부스 위치를 Point 배열로 변환
          const obstacles: Point[] = nationalBooths.map((booth) => ({
            lat: booth.latitude,
            lng: booth.longitude,
          }));

          // A* 알고리즘 경로 탐색 (도로 기반 OSRM + 흡연부스 회피)
          const path = await findPath(start, dest, obstacles);

          // 경로 그리기
          drawPath(mapRef.current, path);

          // 지도 중심 이동 (fitBounds)
          if (path.length > 0 && mapRef.current) {
            let bounds: any;
            path.forEach((p, index) => {
              const latlng = new window.naver.maps.LatLng(p.lat, p.lng);
              if (index === 0) {
                bounds = new window.naver.maps.LatLngBounds(latlng, latlng);
              } else {
                bounds.extend(latlng);
              }
            });

            if (bounds) {
              mapRef.current.fitBounds(bounds);
            }
          }


          // 목적지 주변 흡연부스 수량 계산
          let w500 = 0, w1k = 0, w2k = 0;
          nationalBooths.forEach(booth => {
            const dist = calculateDistance(dest, { lat: booth.latitude, lng: booth.longitude });
            if (dist <= 500) w500++;
            if (dist <= 1000) w1k++;
            if (dist <= 2000) w2k++;
          });
          setNearbyInfo({ within500m: w500, within1km: w1k, within2km: w2k });
          setShowFullMap(true); // 경로 탐색 시 전체 화면 지도로 전환
        } else {
          alert("목적지 검색 결과가 없습니다.");
        }
      });
    };

    if (startKeyword.trim()) {
      // 출발지 검색
      ps.keywordSearch(startKeyword, (startData: any, startStatus: any) => {
        if (startStatus === window.kakao.maps.services.Status.OK) {
          const start: Point = {
            lat: parseFloat(startData[0].y),
            lng: parseFloat(startData[0].x),
          };
          processRoute(start);
        } else {
          alert("출발지 검색 결과가 없습니다.");
        }
      });
    } else if (userLocation) {
      // 현재 위치 사용
      processRoute(userLocation);
    } else {
      alert("출발지를 입력하거나 위치 권한을 허용해주세요.");
    }
  };

  /**
   * 현재 위치로 출발지 설정
   */
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStartKeyword("현재 위치");
        },
        () => {
          alert("위치 정보를 가져올 수 없습니다.");
        }
      );
    }
  };

  /**
   * 줌 컨트롤 핸들러
   */
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
    <div className="flex flex-col w-screen h-screen min-h-screen bg-gradient-to-br from-blue-50 to-green-50 overflow-x-hidden overflow-y-auto">
      {/* ========== 섹션 1: 헤더 및 검색 영역 ========== */}
      <section className="w-full px-4 py-6 md:px-8 lg:px-16">
        {/* 상단 헤더 영역 제거 및 레이아웃 조정 */}
        <div className="flex flex-col gap-6">
          {/* 플로팅 홈 버튼 */}
          <button
            onClick={() => navigate("/")}
            className="fixed bottom-8 right-8 z-[100] bg-gray-800/80 hover:bg-black backdrop-blur-md text-white w-14 h-14 rounded-full shadow-2xl transition-all flex items-center justify-center font-bold text-lg hover:scale-110 active:scale-95 border border-white/20"
            title="홈으로"
          >
            홈
          </button>
        </div>

        {/* 실시간 정보 카드 - 높이 최소화 및 레이아웃 최적화 */}
        {!showFullMap && (
          <MergeAnimation direction="right" delay={0.1} className="mb-3">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-blue-100/50">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <p className="text-sm sm:text-base font-bold text-gray-800">
                  {currentTime.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </p>
                <p className="text-sm sm:text-base font-black text-blue-600">
                  {currentTime.toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {environmentData && (
                <div className="flex items-center justify-around text-center gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 mb-0.5">미세먼지</p>
                    <p className="text-sm font-bold text-blue-600 leading-tight">
                      {environmentData.airQuality.value} <span className="text-[9px] font-medium text-gray-400">({environmentData.airQuality.level})</span>
                    </p>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-100" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 mb-0.5">날씨</p>
                    <p className="text-sm font-bold text-green-600 leading-tight">
                      {environmentData.weather.condition}
                    </p>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-100" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 mb-0.5">기온</p>
                    <p className="text-sm font-bold text-orange-600 leading-tight">
                      {environmentData.weather.temp}°C
                    </p>
                  </div>
                </div>
              )}
            </div>
          </MergeAnimation>
        )}

        {/* 검색 폼 - 간격 절반으로 조정 */}
        {!showFullMap && (
          <MergeAnimation direction="left" delay={0.2} className="mb-3">
            <form
              onSubmit={handleSearch}
              className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-green-100/50"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="출발지"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={startKeyword}
                    onChange={(e) => setStartKeyword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    현위치
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="목적지 검색"
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  value={destKeyword}
                  onChange={(e) => setDestKeyword(e.target.value)}
                />
                <button
                  type="submit"
                  className="lg:col-span-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-black py-2 px-6 rounded-xl shadow-md transition-all text-sm active:scale-95"
                >
                  흡연부스 회피 경로 탐색
                </button>
              </div>
            </form>
          </MergeAnimation>
        )}


        {/* 흡연구역 통계 박스 (메인 흐름으로 이동 및 너비 확장) */}
        <MergeAnimation direction="left" delay={0.4} className="mb-3">
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border-2 border-red-100 w-full overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl animate-bounce">📊</span>
              <h4 className="text-lg font-black text-gray-900">목적지 주변 흡연구역 통계</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[10px] font-bold text-red-700 mb-1">반경 500m</span>
                <span className="text-xl font-black text-red-900">{nearbyInfo ? nearbyInfo.within500m : "-"}개</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                <span className="text-[10px] font-bold text-orange-700 mb-1">반경 1km</span>
                <span className="text-xl font-black text-orange-900">{nearbyInfo ? nearbyInfo.within1km : "-"}개</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-700 mb-1">전국 합계</span>
                <span className="text-xl font-black text-gray-900">{nationalBooths.length}개</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center italic">
              {nearbyInfo ? "💡 목적지 주변 쾌적도를 확인하세요" : "전국 데이터가 로드되었습니다"}
            </p>
          </div>
        </MergeAnimation>
      </section>

      {/* ========== 섹션 2: 지도 영역 (항상 렌더링하되 showFullMap일 때만 표시) ========== */}
      <section className={`${showFullMap ? "fixed inset-0 z-[110] bg-white" : "hidden"}`}>
        <div className="relative h-full w-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* 재탐색 버튼 */}
          <button
            onClick={() => setShowFullMap(false)}
            className="fixed bottom-20 right-10 z-[9999] bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all font-bold text-base hover:scale-110 active:scale-95 flex items-center gap-2 border border-white/20"
          >
            <span>🔍</span> 재탐색
          </button>

          {/* Custom Zoom Controls */}
          <div className="fixed bottom-20 left-10 z-[9999] flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="relative w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all z-[10000] !p-0"
            >
              <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
            </button>
            <button
              onClick={handleZoomOut}
              className="relative w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all z-[10000] !p-0"
            >
              <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
            </button>
          </div>

          {/* 진단 오버레이 */}
          {(mapError || mapStatus !== "완료") && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
              <p className="text-[11px] text-gray-600 mb-1">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
              {mapError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                  <p className="text-xs text-red-500">{mapError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>


      {/* ========== 섹션 3: 안내 및 정보 영역 (지도가 전체화면일 때는 숨김) ========== */}
      {!showFullMap && (
        <section className="w-full px-4 py-8 md:px-8 lg:px-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MergeAnimation direction="left" delay={0.5}>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">A* 알고리즘</h3>
                  <p className="text-sm text-gray-600">
                    최적의 경로를 찾는 인공지능 알고리즘으로 흡연부스를 자동으로 회피합니다.
                  </p>
                </div>
              </MergeAnimation>

              <MergeAnimation direction="right" delay={0.6}>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">전국 단위 지원</h3>
                  <p className="text-sm text-gray-600">
                    서울부터 제주까지 전국 어디든 흡연부스 회피 경로를 제공합니다.
                  </p>
                </div>
              </MergeAnimation>

              <MergeAnimation direction="left" delay={0.7}>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">실시간 업데이트</h3>
                  <p className="text-sm text-gray-600">
                    1시간마다 환경 정보가 갱신되어 항상 최신 정보를 제공합니다.
                  </p>
                </div>
              </MergeAnimation>
            </div>

            <MergeAnimation direction="right" delay={0.8}>
              <div className="mt-8 text-center">
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
                  A* 알고리즘을 사용하여 전국 흡연부스를 회피하는 최적의 경로를
                  제공합니다. 초록색 라인을 따라 쾌적한 경로로 이동하세요.
                </p>
              </div>
            </MergeAnimation>
          </div>
        </section>
      )}
    </div>
  );
}

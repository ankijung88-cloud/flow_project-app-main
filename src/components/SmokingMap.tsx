import { useEffect, useRef, useState, useMemo } from "react";
import { getNationalSmokingBooths, addUserSmokingBooth } from "../services/smokingBoothService";
import { calculateDistance } from "../utils/pathfinding";
import type { SmokingBooth } from "../services/smokingBoothService";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}

interface SmokingMapProps {
  onBack: () => void;
}

interface NearbyBoothsInfo {
  destination: string;
  lat: number;
  lng: number;
  within500m: number;
  within1km: number;
  within2km: number;
}

export default function SmokingMap({ onBack }: SmokingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");
  const [keyword, setKeyword] = useState("");
  const markersRef = useRef<any[]>([]);
  const destinationMarkerRef = useRef<any>(null);
  const [nationalBooths, setNationalBooths] = useState<SmokingBooth[]>([]);
  const [nearbyInfo, setNearbyInfo] = useState<NearbyBoothsInfo | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newBoothName, setNewBoothName] = useState("");
  const [clickCoord, setClickCoord] = useState<{ lat: number, lng: number } | null>(null);

  // 데이터 로드 & 스크롤 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
    const loadBooths = async () => {
      const booths = await getNationalSmokingBooths();
      setNationalBooths(booths);
    };
    loadBooths();
  }, []);

  /**
   * 전국 흡연부스 마커 렌더링 함수
   *
   * 전국 단위의 모든 흡연부스를 지도에 표시합니다.
   * 커스텀 아이콘 (/image/smoke_icon.png)을 사용하고 푸른색 전파 효과를 추가합니다.
   */
  /**
   * 전국 흡연부스 마커 렌더링 함수
   *
   * 전국 단위의 모든 흡연부스를 지도에 표시합니다.
   * 커스텀 아이콘 (/image/smoke_icon.png)을 사용하고 푸른색 전파 효과를 추가합니다.
   */
  const renderMarkers = (map: any) => {
    // 기존 마커 제거
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // 전국 흡연부스 마커 생성
    nationalBooths.forEach((booth: SmokingBooth) => {
      const isUserBooth = booth.type === 'user';
      const markerContent = `
        <div style="width: 32px; height: 32px; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div class="smoke-marker-ripple" style="${isUserBooth ? 'background: #10b981;' : ''}"></div>
          <div class="smoke-marker-ripple" style="${isUserBooth ? 'background: #10b981;' : ''}"></div>
          
          <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${isUserBooth ? '#10b981' : '#ef4444'}; background: rgba(255, 255, 255, 0.8); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="흡연부스" style="width: 20px; height: 20px; object-fit: contain;" />
          </div>
        </div>
      `;

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(booth.latitude, booth.longitude),
        map: map,
        icon: {
          content: markerContent,
          anchor: new window.naver.maps.Point(16, 16)
        }
      });

      // 마커 클릭 시 정보창 표시
      const infoWindowContent = `<div style="padding:8px;font-size:12px;font-weight:bold;white-space:nowrap;background:white;border:1px solid #ccc;border-radius:4px;">${booth.name}</div>`;

      const infowindow = new window.naver.maps.InfoWindow({
        content: infoWindowContent,
        borderWidth: 0,
        backgroundColor: "transparent",
        anchorSkew: true
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (infowindow.getMap()) {
          infowindow.close();
        } else {
          infowindow.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    /**
     * 앱 시작 함수
     */
    const startApp = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => initializeMap(pos.coords.latitude, pos.coords.longitude),
          () => {
            console.log("위치 권한이 거부되었지만, 전국 지도를 표시합니다.");
            initializeMap(37.5665, 126.978);
          }
        );
      } else {
        initializeMap(37.5665, 126.978);
      }
    };

    /**
     * 지도 초기화 함수
     */
    const initializeMap = (lat: number, lng: number) => {
      if (!mapContainerRef.current) return;
      if (!window.naver || !window.naver.maps) {
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
          zoom: 15, // Kakao Level 8 approx 13-14? Let's use 15 for detail
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false,
          scrollWheel: false
        };
        const map = new window.naver.maps.Map(mapContainerRef.current, mapOptions);
        mapRef.current = map;
        setMapStatus("완료");

        new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(lat, lng),
          map: map,
          icon: {
            content: `<img src="${import.meta.env.BASE_URL}image/user-marker.svg" style="width:40px; height:40px;" />`,
            anchor: new window.naver.maps.Point(20, 20)
          },
          title: "내 위치"
        });

        renderMarkers(map);

        // 지도를 클릭했을 때 이벤트 리스너 등록
        window.naver.maps.Event.addListener(map, 'click', function (e: any) {
          const latlng = e.coord; // Naver event uses 'coord'
          setClickCoord({ lat: latlng.y, lng: latlng.x }); // Naver Coord .x .y
          setIsRegistering(true);
        });

      } catch (err) {
        console.error(err);
        setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
      }
    };

    startApp();
  }, [nationalBooths]);

  // 상시 통계 계산
  const currentStats = useMemo(() => {
    if (!mapRef.current) return nearbyInfo;

    const center = mapRef.current.getCenter();
    const lat = center.y;
    const lng = center.x;

    let w500 = 0, w1k = 0, w2k = 0;
    nationalBooths.forEach(booth => {
      const dist = calculateDistance({ lat, lng }, { lat: booth.latitude, lng: booth.longitude });
      if (dist <= 500) w500++;
      if (dist <= 1000) w1k++;
      if (dist <= 2000) w2k++;
    });

    return {
      destination: nearbyInfo?.destination || "현재 중심",
      within500m: w500,
      within1km: w1k,
      within2km: w2k
    };
  }, [nearbyInfo, nationalBooths, mapRef.current]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !mapRef.current) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const result = data[0];
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);
        const moveLatLng = new window.naver.maps.LatLng(lat, lng);

        mapRef.current.setCenter(moveLatLng);
        mapRef.current.setZoom(15); // 줌 레벨 조정

        // 기존 목적지 마커 제거
        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.setMap(null);
        }

        // 목적지 마커 생성
        const destMarker = new window.naver.maps.Marker({
          position: moveLatLng,
          map: mapRef.current,
          title: result.place_name,
        });

        // 목적지 라벨 표시
        const destLabel = new window.naver.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:14px;font-weight:bold;background:#ef4444;color:white;border-radius:8px;">${result.place_name}</div>`,
          backgroundColor: "transparent",
          borderWidth: 0,
          disableAnchor: true,
          pixelOffset: new window.naver.maps.Point(0, -35)
        });
        destLabel.open(mapRef.current, destMarker);

        destinationMarkerRef.current = destMarker;

        // 근처 흡연부스 개수 계산
        let within500m = 0;
        let within1km = 0;
        let within2km = 0;

        nationalBooths.forEach((booth: SmokingBooth) => {
          const distance = calculateDistance(
            { lat, lng },
            { lat: booth.latitude, lng: booth.longitude }
          );

          if (distance <= 500) within500m++;
          if (distance <= 1000) within1km++;
          if (distance <= 2000) within2km++;
        });

        // 결과 저장
        setNearbyInfo({
          destination: result.place_name,
          lat,
          lng,
          within500m,
          within1km,
          within2km,
        });
      } else {
        alert("검색 결과가 없습니다.");
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

  const handleRegisterBooth = async () => {
    if (!newBoothName.trim() || !clickCoord) return;

    try {
      await addUserSmokingBooth({
        name: newBoothName,
        latitude: clickCoord.lat,
        longitude: clickCoord.lng,
        address: "사용자 등록 위치",
        city: "사용자 지정"
      });

      // 데이터 다시 로드
      const booths = await getNationalSmokingBooths();
      setNationalBooths(booths);

      // UI 초기화
      setIsRegistering(false);
      setNewBoothName("");
      setClickCoord(null);
      alert("새로운 흡연 구역이 등록되었습니다.");
    } catch (err) {
      console.error(err);
      alert("등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      {/* 1. 상단 검색 바 영역 (지도 프레임 밖) */}
      <div className="w-full mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            전국 흡연부스 위치 확인
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            전국 단위의 흡연부스 위치가 표시됩니다.
          </p>
        </div>
        <form
          onSubmit={onSearch}
          className="flex gap-2 p-2 sm:p-3 bg-white rounded-lg shadow-md w-full sm:w-auto"
        >
          <input
            type="text"
            placeholder="지역 검색 (예: 강남역)"
            className="flex-1 sm:flex-initial sm:w-48 md:w-64 px-3 sm:px-4 py-2 outline-none border rounded-md focus:border-blue-500 text-sm sm:text-base"
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-md font-medium transition-colors text-sm sm:text-base"
          >
            검색
          </button>
        </form>
      </div>

      <div className="w-full mb-4 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs sm:text-sm text-blue-700 font-medium">
        💡 지도의 특정 지점을 클릭하여 새로운 흡연 구역을 직접 등록할 수 있습니다.
      </div>

      {/* 2. 지도 프레임 */}
      <div className="relative shadow-2xl border border-gray-200 rounded-xl overflow-hidden w-full aspect-video sm:aspect-[4/3] md:h-[600px] group">
        <div className="relative w-full h-full">
          <div ref={mapContainerRef} className="w-full" style={{ width: "100%", height: "600px" }} />

          {/* 진단 오버레이 (회색 화면 발생 시 원인 파악용) */}
          {(mapError || mapStatus !== "완료") && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">지도 진단 중...</h3>
              <p className="text-sm text-gray-600 mb-1">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
              {mapError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                  <p className="text-xs text-red-500">{mapError}</p>
                  <p className="text-[10px] text-red-400 mt-2">API 키 도메인 허용 설정이나 네트워크를 확인해주세요.</p>
                </div>
              )}
            </div>
          )}

          {/* Legend (Top Right) */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 z-50 pointer-events-none">
            <p className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              지도 범례
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src={`${import.meta.env.BASE_URL}image/smoke_icon.png`} alt="" className="w-5 h-5 object-contain" />
                <span className="text-[11px] font-medium text-gray-600">흡연부스</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-[11px] font-medium text-gray-600">내 위치</span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-[11px] font-medium text-gray-600">검색 목적지</span>
              </div>
            </div>
          </div>

          {/* 거리별 흡연구역 수량 박스 (Top Left Overlay) */}
          <div className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-blue-100 min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📍</span>
              <h4 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {currentStats?.destination || "위치 분석 중..."}
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-[11px] font-bold text-blue-700">반경 500m</span>
                <span className="text-sm font-black text-blue-900">{currentStats?.within500m || 0}개</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg">
                <span className="text-[11px] font-bold text-indigo-700">반경 1km</span>
                <span className="text-sm font-black text-indigo-900">{currentStats?.within1km || 0}개</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                <span className="text-[11px] font-bold text-purple-700">반경 2km</span>
                <span className="text-sm font-black text-purple-900">{currentStats?.within2km || 0}개</span>
              </div>
            </div>
            {nearbyInfo && (
              <button
                onClick={() => {
                  setNearbyInfo(null);
                  if (destinationMarkerRef.current) {
                    destinationMarkerRef.current.setMap(null);
                    destinationMarkerRef.current = null;
                  }
                  setKeyword("");
                }}
                className="w-full mt-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
              >
                결과 지우기
              </button>
            )}
          </div>

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

          {/* 등록 모달 오버레이 */}
          {isRegistering && (
            <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 animate-in fade-in zoom-in duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-green-500">➕</span> 새 흡연 구역 등록
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">장소 명칭</label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="예: 강남역 11번 출구 앞"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm"
                      value={newBoothName}
                      onChange={(e) => setNewBoothName(e.target.value)}
                    />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">선택된 좌표</p>
                    <p className="text-xs text-gray-600 font-mono">
                      {clickCoord?.lat.toFixed(6)}, {clickCoord?.lng.toFixed(6)}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIsRegistering(false)}
                      className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleRegisterBooth}
                      className="flex-2 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-lg shadow-green-200 transition-all"
                    >
                      등록하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. 하단 버튼 영역 */}
      <div className="mt-4 sm:mt-6 flex justify-center">
        <button
          onClick={onBack}
          className="bg-gray-900 hover:bg-black text-white px-8 sm:px-10 py-2.5 sm:py-3 rounded-full shadow-lg transition-transform active:scale-95 text-sm sm:text-base"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

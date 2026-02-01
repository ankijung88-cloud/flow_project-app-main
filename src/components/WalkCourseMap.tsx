import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    kakao: any;
    naver: any;
  }
}
export default function WalkCourseMap({
  course,
  onBack,
}: {
  course: any;
  onBack: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  useEffect(() => {
    window.scrollTo(0, 0);
    const initMap = () => {
      if (!mapContainerRef.current) return;
      if (!window.naver || !window.naver.maps) return;

      try {
        setMapStatus("지도 초기화 중...");
        const center = new window.naver.maps.LatLng(course.lat, course.lng);
        const options = {
          center: center,
          zoom: 14,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false,
          scrollWheel: false
        };
        const map = new window.naver.maps.Map(mapContainerRef.current, options);
        kakaoMapRef.current = map;
        setMapStatus("완료");

        // 마커 추가
        new window.naver.maps.Marker({
          position: center,
          map: map,
        });

        // 경로(Polyline) 그리기
        if (course.path && Array.isArray(course.path)) {
          const linePath = course.path.map((p: any) => new window.naver.maps.LatLng(p.lat, p.lng));
          new window.naver.maps.Polyline({
            path: linePath,
            strokeWeight: 6,
            strokeColor: "#3B82F6",
            strokeOpacity: 0.8,
            map: map
          });

          // 경로가 있으면 해당 범위에 맞춤
          const bounds = new window.naver.maps.LatLngBounds(linePath[0], linePath[0]);
          linePath.forEach((p: any) => bounds.extend(p));
          map.fitBounds(bounds, { margin: 50 });
        } else {
          // 경로가 없고 단일 좌표만 있는 경우, OSRM으로 주변 경로를 가져올 수도 있지만
          // 여기서는 간단하게 반경 표시나 생략
        }

      } catch (err) {
        console.error(err);
        setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
      }
    };

    const timer = setInterval(() => {
      if (window.naver && window.naver.maps) {
        clearInterval(timer);
        initMap();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [course]);

  // 줌 컨트롤 핸들러
  const handleZoomIn = () => {
    if (kakaoMapRef.current) {
      kakaoMapRef.current.setZoom(kakaoMapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (kakaoMapRef.current) {
      kakaoMapRef.current.setZoom(kakaoMapRef.current.getZoom() - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[10000] flex flex-col items-center">
      <div className="w-full max-w-[1024px] p-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">{course.name} 지도</h2>
        <button onClick={onBack} className="text-gray-500 hover:text-black">
          닫기
        </button>
      </div>

      {/* 지도 컨테이너 */}
      <div className="relative rounded-2xl shadow-2xl border overflow-hidden" style={{ width: "1024px", height: "700px" }}>
        <div className="relative w-full h-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* 진단 오버레이 */}
          {(mapError || mapStatus !== "완료") && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
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
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-600 mb-4">{course.desc}</p>
        <button
          onClick={onBack}
          className="bg-blue-600 text-white px-12 py-3 rounded-full shadow-lg"
        >
          확인 완료
        </button>
      </div>
    </div>
  );
}

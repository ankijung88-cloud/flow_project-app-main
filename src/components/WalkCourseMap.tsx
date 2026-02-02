import { useState, useEffect, useRef } from "react";
import { useSmoothNavigation, type LatLng } from "../hooks/useSmoothNavigation";

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
  const mapInstanceRef = useRef<any>(null); // Naver Map Instance
  const markerRef = useRef<any>(null);      // User Marker
  const polylineRef = useRef<any>(null);    // Route Line

  // Simulation State
  const [simulatedGps, setSimulatedGps] = useState<LatLng | null>(
    course.path && course.path.length > 0 ? { lat: course.path[0].lat, lng: course.path[0].lng } : null
  );
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Initialize Hook
  // Destination is the last point of the course
  const destination = course.path && course.path.length > 0
    ? { lat: course.path[course.path.length - 1].lat, lng: course.path[course.path.length - 1].lng }
    : { lat: 37.5665, lng: 126.9780 }; // Default Seoul

  const { displayPos, routePath, isOffRoute } = useSmoothNavigation({
    currentGpsPos: simulatedGps,
    destination,
    initialPath: course.path ? course.path.map((p: any) => ({ lat: p.lat, lng: p.lng })) : []
  });

  const [mapStatus, setMapStatus] = useState<string>("준비 중...");
  const [mapError, setMapError] = useState<string | null>(null);

  // 2. Initialize Map (Run Once)
  useEffect(() => {
    const initMap = () => {
      if (!mapContainerRef.current || !window.naver) return;

      try {
        setMapStatus("지도 초기화 중...");

        const startPos = simulatedGps || destination;
        const center = new window.naver.maps.LatLng(startPos.lat, startPos.lng);

        const options = {
          center: center,
          zoom: 17, // Zoomed in for navigation
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false,
          mapTypeControl: false,
        };

        const map = new window.naver.maps.Map(mapContainerRef.current, options);
        mapInstanceRef.current = map;
        setMapStatus("완료");

        // Create Marker (Circular Car/User Icon)
        markerRef.current = new window.naver.maps.Marker({
          position: center,
          map: map,
          icon: {
            content: `
              <div style="
                width: 24px; 
                height: 24px; 
                background: #3B82F6; 
                border: 3px solid white; 
                border-radius: 50%; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                position: absolute;
                top: 0; left: 0;
                transform: translate(-50%, -50%);
              "></div>
            `,
            anchor: new window.naver.maps.Point(0, 0), // Anchored at center
          },
        });

      } catch (err) {
        console.error(err);
        setMapError("지도 생성 실패: " + (err as Error).message);
      }
    };

    if (window.naver && window.naver.maps) {
      initMap();
    } else {
      const timer = setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(timer);
          initMap();
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, []); // Run once on mount

  // 3. Update Polyline when routePath changes (from OSRM or Init)
  useEffect(() => {
    if (!mapInstanceRef.current || routePath.length === 0) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const linePath = routePath.map(p => new window.naver.maps.LatLng(p.lat, p.lng));

    polylineRef.current = new window.naver.maps.Polyline({
      path: linePath,
      strokeWeight: 8,
      strokeColor: isOffRoute ? "#EF4444" : "#3B82F6", // Red if off-route, Blue otherwise
      strokeOpacity: 0.8,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      map: mapInstanceRef.current
    });

  }, [routePath, isOffRoute]);

  // 4. Update Marker Position (Animation Frame)
  useEffect(() => {
    if (!markerRef.current || !displayPos) return;

    const newPos = new window.naver.maps.LatLng(displayPos.lat, displayPos.lng);
    markerRef.current.setPosition(newPos);

    // Optional: Pan map to follow user
    // mapInstanceRef.current.panTo(newPos); 
    // Uses panTo for smooth scrolling, but might conflict if user drags. 
    // For navigation, usually we lock center.
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(newPos);
    }

  }, [displayPos]);

  // 5. Simulation Logic
  useEffect(() => {
    let interval: any;
    if (isSimulating && routePath.length > 0) {
      let currentIndex = 0;

      // Find index on route closest to current simulated pos to resume
      if (simulatedGps) {
        // Simple search for closest index
        let minDesc = Infinity;
        routePath.forEach((p, idx) => {
          const dist = Math.sqrt(Math.pow(p.lat - simulatedGps.lat, 2) + Math.pow(p.lng - simulatedGps.lng, 2));
          if (dist < minDesc) {
            minDesc = dist;
            currentIndex = idx;
          }
        });
      }

      interval = setInterval(() => {
        if (currentIndex < routePath.length - 1) {
          currentIndex++;
          // Add some jitter/noise to simulate bad GPS? 
          // For now, perfect following to test interpolation
          setSimulatedGps(routePath[currentIndex]);
        } else {
          setIsSimulating(false);
        }
      }, 1000); // 1Hz updates like real GPS
    }

    return () => clearInterval(interval);
  }, [isSimulating, routePath]);

  return (
    <div className="fixed inset-0 bg-white z-[10000] flex flex-col items-center">
      <div className="w-full max-w-[1024px] p-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">{course.name} 내비게이션</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-transform active:scale-95 ${isSimulating ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              }`}
          >
            {isSimulating ? "시뮬레이션 정지" : "모의 주행 시작"}
          </button>
          <button onClick={onBack} className="text-gray-500 hover:text-black px-4">
            닫기
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl shadow-2xl border overflow-hidden bg-gray-100" style={{ width: "1024px", height: "700px" }}>

        {/* Status Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">📍 상태 모니터</p>
          <div className="text-xs space-y-1 mt-1">
            <p>GPS: <span className="font-mono">{simulatedGps ? `${simulatedGps.lat.toFixed(5)}, ${simulatedGps.lng.toFixed(5)}` : '대기중'}</span></p>
            <p>보정: <span className="font-mono text-blue-600">{displayPos ? `${displayPos.lat.toFixed(5)}, ${displayPos.lng.toFixed(5)}` : '...'}</span></p>
            <p>경로 이탈: <span className={`font-bold ${isOffRoute ? 'text-red-500' : 'text-green-600'}`}>{isOffRoute ? "YES (재탐색)" : "NO"}</span></p>
          </div>
        </div>

        <div ref={mapContainerRef} className="w-full h-full" />

        {(mapError || mapStatus !== "완료") && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
            <span className="text-gray-600">{mapStatus}</span>
            {mapError && <span className="text-red-500 text-sm mt-2">{mapError}</span>}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-600 mb-4 text-sm max-w-2xl px-4">
          * 1초 단위로 업데이트되는 GPS 좌표를 받아, 클라이언트에서 60fps로 부드럽게 보간(Interpolation)하여 이동합니다.
          <br />* 경로에서 벗어나면 자동으로 OSRM API를 호출하여 경로를 재탐색합니다.
        </p>
      </div>
    </div>
  );
}


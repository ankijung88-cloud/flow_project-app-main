
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import { getCongestionData } from "../services/congestionService";
import { findMultiplePaths, calculateDistance, getTransportSpeed, interpolatePoints } from "../utils/pathfinding";
import type { SmokingBooth } from "../services/smokingBoothService";
import type { CongestionLocation } from "../services/congestionService";
import type { Point, PathResult } from "../utils/pathfinding";

import { getNearbyTransitStops } from "../services/transitService";
import type { TransitStop } from "../services/transitService";
import { saveRoute, getSavedRoutes, reportCongestion, shareSmokingBooth, listenToGlobalChanges } from "../services/userService";

// New Services & Context
import { useTheme } from "../context/ThemeContext";
import { getCurrentWeather } from "../services/weatherService";
import { getAddressFromCoords } from "../services/userLocationService";
import { motion } from "framer-motion";
import { useSmoothNavigation } from "../hooks/useSmoothNavigation"; // ADDED

// FullScreenMapPage.tsx

export default function FullScreenMapPage() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const pathOverlaysRef = useRef<any[]>([]);
    const congestionOverlaysRef = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);
    const destMarkerRef = useRef<any>(null);
    const driveIntervalRef = useRef<any>(null);
    const mapContainerParentRef = useRef<HTMLDivElement>(null);
    const [mapRotation, setMapRotation] = useState(0);
    const [arrivalTime, setArrivalTime] = useState<string>("");

    // Turn-by-Turn States
    const [navInstruction, setNavInstruction] = useState("출발");
    const [navNextDist, setNavNextDist] = useState(0);
    const [navIcon, setNavIcon] = useState("⬆️");
    const [remainingDistDisplay, setRemainingDistDisplay] = useState(0);

    // Sensor States
    const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
    const [isOrientationSupported, setIsOrientationSupported] = useState(false);

    // UI States
    const [searchKeyword, setSearchKeyword] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);

    // Environmental Data
    const [weather, setWeather] = useState<{ temp: number; text: string; icon: string } | null>(null);
    const [currentAddress, setCurrentAddress] = useState<string>("위치 확인 중...");
    const lastGeocodeRef = useRef<{ lat: number; lng: number } | null>(null);

    // Voice Search State
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Congestion Alert State
    const [congestionWarning, setCongestionWarning] = useState<{ name: string; level: string } | null>(null);

    // SDK & Debug Status
    const [sdkStat, setSdkStat] = useState<{ naver: string; kakao: string }>({ naver: 'checking', kakao: 'checking' });
    const [lastError, setLastError] = useState<string | null>(null);




    const [nationalBooths, setNationalBooths] = useState<SmokingBooth[]>([]);
    const [congestionzones, setCongestionZones] = useState<CongestionLocation[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapStatus, setMapStatus] = useState<string>("준비 중...");
    const [isSearching, setIsSearching] = useState(false);
    const [isRouteSheetLoading, setIsRouteSheetLoading] = useState(false);

    // Navigation States
    const [pathOptions, setPathOptions] = useState<PathResult[]>([]);
    const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
    const [isNavigating, setIsNavigating] = useState(false);
    const [transportMode, setTransportMode] = useState<"walking" | "cycling" | "transit" | "stroll">("walking");
    const [lastDest, setLastDest] = useState<Point | null>(null);
    const [showRouteList, setShowRouteList] = useState(false);
    const [showSavedRoutes, setShowSavedRoutes] = useState(false);
    const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
    const [showSmokeReg, setShowSmokeReg] = useState(false);
    const [showCongestionReg, setShowCongestionReg] = useState(false);
    const [showEndNavModal, setShowEndNavModal] = useState(false);
    const isNavigatingRef = useRef(false);
    const selectedPathIndexRef = useRef(0);



    // Smooth Navigation Hook
    // Smooth Navigation Hook
    // Smooth Navigation Hook
    const { displayPos, heading } = useSmoothNavigation({
        currentGpsPos: userLocation,
        destination: lastDest || { lat: 0, lng: 0 },
        initialPath: pathOptions[selectedPathIndex]?.path || []
    });

    // Sync Map Marker with Smooth Navigation
    useEffect(() => {
        if (!mapRef.current || !userMarkerRef.current || !displayPos) return;

        // Update Marker Position & Rotation
        const newCenter = new window.naver.maps.LatLng(displayPos.lat, displayPos.lng);
        userMarkerRef.current.setPosition(newCenter);
        userMarkerRef.current.setVisible(true);

        // Update Map Center if Navigating
        if (isNavigating) {
            mapRef.current.setCenter(newCenter);

            // 3D Arrow Marker Logic: Update Rotation via DOM
            const markerEl = document.getElementById('user-nav-marker');
            if (markerEl) {
                // Ensure internal sync if needed, but primarily rotate the div
                markerEl.style.transform = `rotate(${heading}deg)`;
            }

            // Sync Map Rotation (Optional)
            if (isCompassModeRef.current && heading) {
                try {
                    mapRef.current.morph(newCenter, 18, { tilt: 60, heading: heading });
                } catch (e) { }
            }
        } else {
            // Standard Mode: Use Icon Replacment
            if (userMarkerRef.current.setIcon) {
                userMarkerRef.current.setIcon({
                    content: `<img src="${import.meta.env.BASE_URL}image/user-marker.svg" style="width:46px; height:46px; transform: rotate(${heading}deg); transition: transform 0.3s ease-out;" />`,
                    anchor: new window.naver.maps.Point(23, 23)
                });
            }
        }
    }, [displayPos, isNavigating, heading]); // Runs on every animation frame update

    const [transitStops, setTransitStops] = useState<TransitStop[]>([]);
    const transitMarkersRef = useRef<any[]>([]);
    const smokingOverlaysRef = useRef<any[]>([]);
    const strollHighlightMarkersRef = useRef<any[]>([]);

    const menuItems = [
        { name: "홈", target: "section-hero" },
        { name: "흡연구역", target: "section-location" },
        { name: "혼잡도", target: "section-crowd" },
        { name: "산책로", target: "section-guide" },
        { name: "FAQ", target: "section-faq" },
    ];

    const handleMenuNavigation = (targetId: string) => {
        if (targetId === "section-hero") {
            navigate("/");
        } else {
            navigate(`/intro#${targetId}`);
        }
        setMenuOpen(false);
    };

    // Environmental Data Fetcher
    useEffect(() => {
        if (!userLocation) return;

        const fetchEnvData = async () => {
            // Throttling: Only fetch if moved > 200m or first time
            if (lastGeocodeRef.current) {
                const dist = Math.sqrt(
                    Math.pow(lastGeocodeRef.current.lat - userLocation.lat, 2) +
                    Math.pow(lastGeocodeRef.current.lng - userLocation.lng, 2)
                );
                if (dist < 0.002) return; // Approx 200m
            }

            const w = await getCurrentWeather(userLocation.lat, userLocation.lng);
            if (w) setWeather(w);

            const addr = await getAddressFromCoords(userLocation.lat, userLocation.lng);
            if (addr && addr !== "위치 정보 없음") {
                setCurrentAddress(addr);
                lastGeocodeRef.current = { lat: userLocation.lat, lng: userLocation.lng };
            }
        };

        // Delay fetch to avoid blocking render, but don't clear it strictly if we are moving unless necessary
        const timer = setTimeout(fetchEnvData, 3000);
        return () => clearTimeout(timer);
    }, [userLocation?.lat, userLocation?.lng]);


    // Reactive Marker Rendering: Smoking Booths (Official + Global)
    const renderSmokingBooths = () => {
        if (!mapRef.current) return;
        smokingOverlaysRef.current.forEach(o => o.setMap(null));
        smokingOverlaysRef.current = [];

        // Limit rendering to nearby booths (within 5km) to save performance
        const nearby = userLocation
            ? nationalBooths.filter(b => calculateDistance(userLocation, { lat: b.latitude, lng: b.longitude }) < 5000)
            : nationalBooths.slice(0, 50); // Fallback if no location

        nearby.forEach(booth => {
            const isUser = booth.type === 'user';
            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(booth.latitude, booth.longitude),
                map: mapRef.current,
                icon: {
                    content: `
                        <div style="width: 35px; height: 35px; border-radius: 50%; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: ${isUser ? '2px solid #FF9F0A' : 'none'};">
                            <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" style="width: 100%; height: 100%; object-fit: cover;" alt="${booth.name}"/>
                        </div>
                    `,
                    anchor: new window.naver.maps.Point(17.5, 17.5)
                },
                zIndex: isUser ? 100 : 10
            });
            smokingOverlaysRef.current.push(marker);
        });
    };
    useEffect(renderSmokingBooths, [nationalBooths, mapStatus]);

    // Reactive Marker Rendering: Congestion Zones (Official + Global Reports)
    const renderCongestionZones = () => {
        if (!mapRef.current) return;
        congestionOverlaysRef.current.forEach(c => c.setMap(null));
        congestionOverlaysRef.current = [];

        const nearby = userLocation
            ? congestionzones.filter(z => calculateDistance(userLocation, { lat: z.lat, lng: z.lng }) < 5000)
            : congestionzones;

        nearby.forEach(zone => {
            const isReport = zone.name.includes("(제보)");
            const color = zone.currentLevel === "매우혼잡" ? "#DC2626" :
                zone.currentLevel === "혼잡" ? "#F97316" : "#10B981";

            if (isReport) {
                // Render as marker for reports
                const marker = new window.naver.maps.Marker({
                    position: new window.naver.maps.LatLng(zone.lat, zone.lng),
                    map: mapRef.current,
                    icon: {
                        content: `
                            <div class="flex flex-col items-center">
                                <div class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white animate-bounce">실시간 ${zone.currentLevel}</div>
                                <div class="w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
                            </div>
                        `,
                        anchor: new window.naver.maps.Point(30, 20)
                    },
                    zIndex: 200
                });
                congestionOverlaysRef.current.push(marker);
            } else {
                // Render as circle for official zones
                const circle = new window.naver.maps.Circle({
                    map: mapRef.current,
                    center: new window.naver.maps.LatLng(zone.lat, zone.lng),
                    radius: zone.radius,
                    strokeWeight: 1,
                    strokeColor: color,
                    strokeOpacity: 0.8,
                    fillColor: color,
                    fillOpacity: 0.2
                });
                congestionOverlaysRef.current.push(circle);
            }
        });
    };
    useEffect(renderCongestionZones, [congestionzones, mapStatus]);


    const [gpsError, setGpsError] = useState(false);

    // Initial Marker (Hidden)
    const initUserMarker = (map: any, lat: number, lng: number) => {
        if (userMarkerRef.current) return;

        const marker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(lat, lng),
            map: map,
            icon: {
                content: `<img src="${import.meta.env.BASE_URL}image/user-marker.svg" style="width:46px; height:46px;" />`,
                anchor: new window.naver.maps.Point(23, 23)
            },
            visible: false
        });
        userMarkerRef.current = marker;
    };

    const fetchGps = () => {
        setGpsError(false);
        console.log("Starting GPS fetch...");

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    console.log("GPS Success:", pos.coords);
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGpsError(false);
                    // Force update address/weather immediately
                    lastGeocodeRef.current = null; // Reset throttle

                    if (mapRef.current && window.naver && window.naver.maps) {
                        const newCenter = new window.naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                        try {
                            if (mapRef.current && typeof mapRef.current.morph === 'function') {
                                mapRef.current.morph(newCenter, 16); // Smooth transition
                            } else {
                                mapRef.current.setCenter(newCenter);
                                mapRef.current.setZoom(16);
                            }
                        } catch (e) {
                            console.warn("Map morph failed:", e);
                            mapRef.current.setCenter(newCenter);
                            mapRef.current.setZoom(16);
                        }

                        if (userMarkerRef.current) {
                            userMarkerRef.current.setPosition(newCenter);
                            userMarkerRef.current.setVisible(true);
                        } else {
                            // Init if missing
                            initUserMarker(mapRef.current, pos.coords.latitude, pos.coords.longitude);
                            if (userMarkerRef.current) userMarkerRef.current.setVisible(true);
                        }
                    }
                },
                (err) => {
                    console.error("GPS Error:", err);
                    setGpsError(true);
                    if (err.code === 1) {
                        alert("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.");
                    } else if (err.code === 2) {
                        alert("위치 정보를 사용할 수 없습니다. GPS 신호를 확인해주세요.");
                    } else if (err.code === 3) {
                        alert("위치 확인 시간이 초과되었습니다. 다시 시도해주세요.");
                    } else {
                        alert("위치를 찾을 수 없습니다. 다시 시도해주세요.");
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            console.error("Geolocation is not supported by this browser.");
            alert("이 브라우저는 위치 기반 서비스를 지원하지 않습니다.");
            setGpsError(true);
        }
    };

    // Initialization Logic: Decoupled GPS & Map Load
    // ---------------------------------------------------------------------------
    useEffect(() => {
        let isMounted = true;

        const initMap = () => {
            if (!mapContainerRef.current) return;
            if (mapRef.current) return; // Already initialized



            // Default location: Seoul City Hall
            const defaultLat = 37.5665;
            const defaultLng = 126.978;

            const mapOptions = {
                center: new window.naver.maps.LatLng(defaultLat, defaultLng),
                zoom: 15,
                scaleControl: false,
                logoControl: false,
                mapDataControl: false,
                zoomControl: false,
                mapTypeControl: false
            };

            const map = new window.naver.maps.Map(mapContainerRef.current, mapOptions);
            mapRef.current = map;
            setMapStatus("완료");


            // Disable Compass Mode on Drag
            window.naver.maps.Event.addListener(map, 'dragstart', () => {
                setIsCompassMode(false);
            });

            // Init Marker at default (Hidden)
            initUserMarker(map, defaultLat, defaultLng);
        };

        // SDK Status Monitoring
        const sdkCheckInterval = setInterval(() => {
            if (window.sdkStatus) {
                setSdkStat({ ...window.sdkStatus });
            }
        }, 1000);





        // PARALLEL EXECUTION
        // 1. Wait for Naver SDK -> Init Map
        const checkNaver = setInterval(() => {
            if (window.naver && window.naver.maps) {
                clearInterval(checkNaver);
                if (isMounted) {
                    try {
                        initMap();
                    } catch (e: any) {
                        console.error("Map Initialization Failed:", e);
                        setLastError(`Map Init Failed: ${e.message}`);
                    }
                }
            }
        }, 500);

        // 2. Start GPS Fetch (Conditional to avoid Violation)
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'granted') {
                    fetchGps();
                } else {
                    console.log("GPS permission not granted yet. Waiting for user gesture.");
                    // Optional: Show a toast or helper UI here if needed
                }
            }).catch(() => {
                // Fallback for browsers that don't support the query or fail
                // We avoid auto-calling to be safe regarding the violation
            });
        } else {
            // Fallback for older browsers: might trigger violation but functional
            // fetchGps(); 
        }

        // 3. Sensor Initialization & Permissions
        const handleOrientation = (event: any) => {
            let heading = 0;
            if (event.webkitCompassHeading) {
                // iOS
                heading = event.webkitCompassHeading;
            } else if (event.alpha) {
                // Android (usually needs adjustment depending on absolute vs relative)
                heading = 360 - event.alpha;
            }
            setDeviceHeading(heading);
        };

        if (window.DeviceOrientationEvent) {
            setIsOrientationSupported(true);
            window.addEventListener('deviceorientation', handleOrientation, { passive: true, capture: true });
        }

        return () => {
            isMounted = false;
            window.removeEventListener('deviceorientation', handleOrientation, true);
            clearInterval(sdkCheckInterval);
        };
    }, []);



    const requestOrientationPermission = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    // Success: listner already added in useEffect
                }
            } catch (error) {
                console.error("Orientation permission denied:", error);
            }
        }
    };
    // View Controls
    const [isCompassMode, setIsCompassMode] = useState(true);
    const isCompassModeRef = useRef(true);

    useEffect(() => {
        isCompassModeRef.current = isCompassMode;
        if (!isCompassMode && mapRef.current) {
            setMapRotation(0);
        }
    }, [isCompassMode]);



    // Unused toggles removed


    const loadTransitStops = async (center: { lat: number, lng: number }) => {
        try {
            const stops = await getNearbyTransitStops(center.lat, center.lng);
            setTransitStops(stops);
        } catch (e: any) {
            console.error("Transit Stop Loading Failed:", e);
            setLastError(`Transit Load Failed: ${e.message}`);
        }
    };

    const drawPath = (pathPoints: Point[]) => {
        pathOverlaysRef.current.forEach(overlay => overlay.setMap(null));
        pathOverlaysRef.current = [];

        const linePath = pathPoints.map(p => new window.naver.maps.LatLng(p.lat, p.lng));
        const polyline = new window.naver.maps.Polyline({
            path: linePath,
            strokeWeight: 8,
            strokeColor: "#00D668",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
            map: mapRef.current
        });
        pathOverlaysRef.current.push(polyline);

        const bounds = new window.naver.maps.LatLngBounds(linePath[0], linePath[0]);
        linePath.forEach(p => bounds.extend(p));
        mapRef.current.fitBounds(bounds, { margin: 50 });

        // Ensure destination marker is also correctly placed when path is drawn/redrawn
        const finalPoint = pathPoints[pathPoints.length - 1];
        if (destMarkerRef.current) {
            destMarkerRef.current.setPosition(new window.naver.maps.LatLng(finalPoint.lat, finalPoint.lng));
            destMarkerRef.current.setMap(mapRef.current);
        } else {
            // Create a new one if it doesn't exist
            destMarkerRef.current = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(finalPoint.lat, finalPoint.lng),
                map: mapRef.current,
                icon: {
                    content: `
                        <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#FF3B30"/>
                            </svg>
                        </div>
                    `,
                    anchor: new window.naver.maps.Point(20, 38)
                },
                zIndex: 151
            });
        }
    };

    const performSearch = async (dest: Point, isSilent = false) => {
        if (!userLocation || !mapRef.current) return;

        if (!isSilent) {
            setIsSearching(true);
            setIsRouteSheetLoading(true);
            setPathOptions([]);
            setShowRouteList(true);
        }

        const obstacles: Point[] = nationalBooths.map(b => ({ lat: b.latitude, lng: b.longitude }));
        const crowds = congestionzones.map(c => ({ lat: c.lat, lng: c.lng, radius: c.radius, level: c.currentLevel }));

        try {
            const paths = await findMultiplePaths(userLocation, dest, obstacles, crowds, transportMode);

            // Fix: In stroll mode, we don't want the silent walking-recalculation to overwrite the trail list
            if (transportMode === "stroll" && isSilent) {
                // Just draw the path to the selected trail, don't update pathOptions (which contains the parks)
                if (paths && paths.length > 0) {
                    drawPath(paths[0].path);
                }
                return;
            }

            setPathOptions(paths);

            if (!isSilent && transportMode === "transit" && paths.some(p => p.isFallback)) {
                const dist = calculateDistance(userLocation, dest);
                if (dist < 750) {
                    alert("출발지와 목적지가 너무 가까워(약 700m 이내) 대중교통 경로를 찾을 수 없습니다. 도보 경로로 안내합니다.");
                } else {
                    alert("대중교통 경로를 찾을 수 없어 도보 경로를 안내합니다.");
                }
            }

            // Always draw if rerouting or manual search
            if (paths && paths.length > 0) {
                // If silent and navigating, it's a reroute. Update guidance immediately.
                if (isSilent && isNavigatingRef.current) {
                    setSelectedPathIndex(0);
                    selectedPathIndexRef.current = 0;
                    drawPath(paths[0].path);
                } else if (!isSilent) {
                    drawPath(paths[0].path);
                }
            } else if (!isSilent) {
                console.warn("No paths returned from findMultiplePaths");
                alert("경로를 탐색할 수 없습니다.");
            }
        } catch (err) {
            console.error(err);
            if (!isSilent) alert("경로를 찾을 수 없습니다.");
        }

        if (!isSilent) {
            setIsSearching(false);
            setIsRouteSheetLoading(false);
        }
    };

    useEffect(() => {
        // Refresh data from services (which now include global)
        const refreshData = async () => {
            const booths = await getNationalSmokingBooths();
            setNationalBooths(booths);
            const zones = await getCongestionData();
            setCongestionZones(zones);
        };

        // Shared data real-time listener triggers a full refresh
        const unsub = listenToGlobalChanges(() => {
            refreshData();
        });

        // Initial load
        refreshData();
        getSavedRoutes().then(setSavedRoutes);

        return () => unsub();
    }, []);

    const handleSaveRoute = async () => {
        if (selectedPathIndex === -1 || !pathOptions[selectedPathIndex]) return;
        const name = prompt("경로 이름을 입력하세요", "나의 경로 " + new Date().toLocaleDateString());
        if (name) {
            await saveRoute(name, pathOptions[selectedPathIndex]);
            const updated = await getSavedRoutes();
            setSavedRoutes(updated);
            alert("경로가 저장되었습니다.");
        }
    };

    const handleReportCongestion = async (level: "매우혼잡" | "혼잡") => {
        if (!userLocation) return;
        await reportCongestion(userLocation.lat, userLocation.lng, level);
        setShowCongestionReg(false);
        alert("혼잡 상황이 제보되었습니다.");
    };

    const handleRegisterSmoke = async () => {
        if (!userLocation) return;
        const addr = currentAddress || "현재 위치";
        await shareSmokingBooth({
            name: "사용자 등록 흡연소",
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            city: addr.split(' ')[0],
            address: addr
        });
        setShowSmokeReg(false);
        alert("흡연구역이 글로벌 등록되었습니다.");
    };

    // Highlight zones near the selected path for Stroll Mode
    useEffect(() => {
        if (!mapRef.current || !window.naver || transportMode !== "stroll") {
            strollHighlightMarkersRef.current.forEach(m => m.setMap(null));
            strollHighlightMarkersRef.current = [];
            return;
        }

        const currentPath = pathOptions[selectedPathIndex]?.path;
        if (!currentPath) return;

        // Clear previous highlights
        strollHighlightMarkersRef.current.forEach(m => m.setMap(null));
        strollHighlightMarkersRef.current = [];

        const highlights: any[] = [];
        const threshold = 150; // 150m radius to consider 'near'

        // 1. Smoking Booths Highlights
        nationalBooths.forEach(booth => {
            const isNear = currentPath.some(pt => calculateDistance(pt, { lat: booth.latitude, lng: booth.longitude }) < threshold);
            if (isNear) {
                const marker = new window.naver.maps.Marker({
                    position: new window.naver.maps.LatLng(booth.latitude, booth.longitude),
                    map: mapRef.current,
                    icon: {
                        content: `<div class="w-8 h-8 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-xs animate-bounce">🚬</div>`,
                        anchor: new window.naver.maps.Point(16, 16)
                    },
                    zIndex: 1000
                });
                highlights.push(marker);
            }
        });

        // 2. Congestion Zones Highlights
        congestionzones.forEach(zone => {
            const isNear = currentPath.some(pt => calculateDistance(pt, { lat: zone.lat, lng: zone.lng }) < (zone.radius + threshold));
            if (isNear) {
                const marker = new window.naver.maps.Marker({
                    position: new window.naver.maps.LatLng(zone.lat, zone.lng),
                    map: mapRef.current,
                    icon: {
                        content: `<div class="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold border border-white shadow-md animate-pulse">혼잡지역</div>`,
                        anchor: new window.naver.maps.Point(30, 0)
                    },
                    zIndex: 1000
                });
                highlights.push(marker);
            }
        });

        strollHighlightMarkersRef.current = highlights;
    }, [selectedPathIndex, pathOptions, transportMode, nationalBooths, congestionzones]);


    useEffect(() => {
        if (transportMode === "transit" && userLocation) {
            loadTransitStops(userLocation);
        } else {
            setTransitStops([]);
        }

        // AUTO-SEARCH logic: DISABLED to prevent constant re-routing
        // Trigger manually or via drag events only
        /* 
        if (lastDest && userLocation && !isNavigatingRef.current && !isSearching) {
            performSearch(lastDest, true); // Use silent for background updates
        } 
        */
        if (transportMode === "stroll" && userLocation && !lastDest) {
            findNearbyTrails();
        }
    }, [transportMode, userLocation?.lat, userLocation?.lng, lastDest]);

    // Clear park markers when leaving stroll mode
    useEffect(() => {
        if (transportMode !== "stroll") {
            strollHighlightMarkersRef.current.forEach(m => m.setMap(null));
            strollHighlightMarkersRef.current = [];
        }
    }, [transportMode]);

    useEffect(() => {
        if (!mapRef.current || !window.naver) return;
        transitMarkersRef.current.forEach(m => m.setMap(null));
        transitMarkersRef.current = [];

        transitStops.forEach(stop => {
            const content = document.createElement('div');
            content.className = 'custom-overlay flex flex-col items-center';
            content.innerHTML = `
                <div class="px-2 py-1 bg-white border border-gray-400 rounded-md shadow-md text-[11px] font-bold text-gray-900 whitespace-nowrap mb-1">
                    ${stop.name} (${stop.lines.join(',')})
                </div>
                <div class="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center border-2 ${stop.type === 'subway' ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}">
                    ${stop.type === 'subway' ? '🚇' : '🚌'}
                </div>
            `;

            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(stop.lat, stop.lng),
                map: mapRef.current,
                icon: {
                    content: `
                    <div class="custom-overlay flex flex-col items-center">
                        <div class="px-2 py-1 bg-white border border-gray-400 rounded-md shadow-md text-[11px] font-bold text-gray-900 whitespace-nowrap mb-1">
                            ${stop.name} (${stop.lines.join(',')})
                        </div>
                        <div class="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center border-2 ${stop.type === 'subway' ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}">
                            ${stop.type === 'subway' ? '🚇' : '🚌'}
                        </div>
                    </div>`,
                    anchor: new window.naver.maps.Point(12, 12) // Approximate center
                }
            });
            transitMarkersRef.current.push(marker);
        });

    }, [transitStops]);

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            const [booths, crowd] = await Promise.all([
                getNationalSmokingBooths(),
                getCongestionData()
            ]);
            setNationalBooths(booths);
            setCongestionZones(crowd);
        };
        loadData();
    }, []);

    // Voice Recognition Logic
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "ko-KR";

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') alert("마이크 권한이 거부되었습니다.");
            };
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setSearchKeyword(transcript);
                setIsListening(false);
                // Trigger search with the transcript
                handleVoiceSearchResult(transcript);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const handleVoiceSearchResult = (transcript: string) => {
        if (!userLocation || !mapRef.current) return;
        setIsSearching(true);
        setIsNavigating(false);

        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(transcript, async (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const dest = { lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) };
                setLastDest(dest);


                // performSearch will handle drawing the path and the destination marker
                performSearch(dest);
            } else {
                alert("검색 결과가 없습니다.");
                setIsSearching(false);
            }
        });
    };

    const toggleVoiceSearch = () => {
        if (!recognitionRef.current) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    const findNearbyTrails = () => {
        const searchBase = lastDest || userLocation;
        if (!searchBase || !mapRef.current) {
            if (!userLocation) fetchGps();
            return;
        }
        setIsSearching(true);
        setIsRouteSheetLoading(true);

        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
            console.warn("Kakao maps services not available.");
            setIsSearching(false);
            setIsRouteSheetLoading(false);
            return;
        }

        const ps = new window.kakao.maps.services.Places();
        strollHighlightMarkersRef.current.forEach(m => m.setMap(null));
        strollHighlightMarkersRef.current = [];

        const searchOptions = {
            location: new window.kakao.maps.LatLng(searchBase.lat, searchBase.lng),
            radius: 5000,
            sort: window.kakao.maps.services.SortBy.DISTANCE
        };

        const keywords = ['공원', '놀이터'];
        let combinedResults: any[] = [];
        let completedSearches = 0;

        const handleSearchResult = (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                combinedResults = [...combinedResults, ...data];
            }
            completedSearches++;

            if (completedSearches === keywords.length) {
                if (combinedResults.length > 0) {
                    processTrailResults(combinedResults);
                } else {
                    alert("주변에서 산책할 만한 공원이나 놀이터를 찾지 못했습니다.");
                    setIsSearching(false);
                    setIsRouteSheetLoading(false);
                }
            }
        };

        const processTrailResults = (data: any[]) => {
            const sortedData = data.sort((a, b) => {
                const dA = calculateDistance(userLocation!, { lat: parseFloat(a.y), lng: parseFloat(a.x) });
                const dB = calculateDistance(userLocation!, { lat: parseFloat(b.y), lng: parseFloat(b.x) });
                return dA - dB;
            }).slice(0, 15);

            const trailOptions: PathResult[] = sortedData.map((item: any) => ({
                type: "STROLL",
                path: interpolatePoints(userLocation!, { lat: parseFloat(item.y), lng: parseFloat(item.x) }, 10),
                distance: calculateDistance(userLocation!, { lat: parseFloat(item.y), lng: parseFloat(item.x) }),
                time: calculateDistance(userLocation!, { lat: parseFloat(item.y), lng: parseFloat(item.x) }) / getTransportSpeed("stroll"),
                score: 95,
                mode: "stroll",
                name: item.place_name,
                destPoint: { lat: parseFloat(item.y), lng: parseFloat(item.x) }
            }));

            setPathOptions(trailOptions);
            setSelectedPathIndex(0);
            setShowRouteList(true);
            setIsSearching(false);
            setIsRouteSheetLoading(false);

            const markers: any[] = sortedData.slice(0, 10).map((item: any) => {
                const isPlayground = item.place_name.includes('놀이터') || item.category_name.includes('놀이터');
                return new window.naver.maps.Marker({
                    position: new window.naver.maps.LatLng(parseFloat(item.y), parseFloat(item.x)),
                    map: mapRef.current,
                    icon: {
                        content: `<div class="w-10 h-10 bg-white rounded-full border-2 ${isPlayground ? 'border-orange-400' : 'border-emerald-500'} shadow-xl flex items-center justify-center text-xl animate-bounce-subtle">${isPlayground ? '🎡' : '🌳'}</div>`,
                        anchor: new window.naver.maps.Point(20, 20)
                    },
                    title: item.place_name,
                    zIndex: 500
                });
            });
            strollHighlightMarkersRef.current = markers;

            if (trailOptions.length > 0) {
                const firstDest = trailOptions[0].destPoint!;
                setLastDest(firstDest);
                performSearch(firstDest, true);
            }
        };

        keywords.forEach(kw => ps.keywordSearch(kw, handleSearchResult, searchOptions));
    };

    // Search & Pathfinding
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchKeyword.trim() || !userLocation || !mapRef.current) return;

        setIsSearching(true);
        setIsNavigating(false);

        if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
            alert("검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            setIsSearching(false);
            return;
        }

        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(searchKeyword, async (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const dest = { lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) };
                setLastDest(dest);


                // performSearch will handle drawing the path and the destination marker
                performSearch(dest);
            } else {
                alert("검색 결과가 없습니다.");
                setIsSearching(false);
            }
        });
    };

    // Real-time Navigation
    const stopNavigation = () => {
        if (driveIntervalRef.current) navigator.geolocation.clearWatch(driveIntervalRef.current);
        setIsNavigating(false);
        isNavigatingRef.current = false;
        setMapRotation(0);
        alert("안내를 종료합니다.");

        if (mapRef.current) {
            try {
                mapRef.current.morph(mapRef.current.getCenter(), 15, { tilt: 0, heading: 0 });
            } catch (e) {
                console.warn("Map morph failed:", e);
            }
        }
    };

    // Removed redundant useEffect for performSearch on transportMode

    const handleAltRoute = async () => {
        if (!lastDest || !userLocation) return;

        // If we have multiple options, cycle to the next one
        if (pathOptions.length > 1) {
            const nextIdx = (selectedPathIndex + 1) % pathOptions.length;
            setSelectedPathIndex(nextIdx);
            selectedPathIndexRef.current = nextIdx;
            drawPath(pathOptions[nextIdx].path);
            console.log("DEBUG: Switched to next available path index:", nextIdx);
        } else {
            // If only one path, force a fresh search to see if OSRM gives a different result
            // (In a production app, we might apply a 'diversion' constraint here)
            console.log("DEBUG: Only one path found. Re-calculating divergent path...");
            setIsRouteSheetLoading(true);
            await performSearch(lastDest, true);
        }
    };

    const showPathOverview = () => {
        if (!mapRef.current || !pathOptions[selectedPathIndex]) return;
        const path = pathOptions[selectedPathIndex].path;
        if (path.length === 0) return;

        const linePath = path.map(p => new window.naver.maps.LatLng(p.lat, p.lng));
        const bounds = new window.naver.maps.LatLngBounds(linePath[0], linePath[0]);
        linePath.forEach(p => bounds.extend(p));

        mapRef.current.fitBounds(bounds, { margin: 100 });
        setIsCompassMode(false); // Switch to 2D view for overview
    };

    const startNavigation = () => {
        setIsNavigating(true);
        isNavigatingRef.current = true;
        selectedPathIndexRef.current = selectedPathIndex;
        setShowRouteList(false);

        if (!mapRef.current) return;

        // Native 3D View
        const currentCenter = mapRef.current.getCenter();
        try {
            // "Bird's eye view": Increased tilt for better 3D depth
            mapRef.current.morph(currentCenter, 18, { tilt: 60, heading: mapRotation });
        } catch (e) {
            console.warn("Map morph failed:", e);
        }

        if (driveIntervalRef.current) navigator.geolocation.clearWatch(driveIntervalRef.current);


        if (userMarkerRef.current) {
            userMarkerRef.current.setMap(null);
        }

        // Arrow Marker (User) using 방향키.jpg with 3D transform
        const arrowMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(userLocation?.lat || 37.5665, userLocation?.lng || 126.978),
            map: mapRef.current,
            icon: {
                content: `
                    <div id="user-nav-marker" style="
                        width: 100px; 
                        height: 100px; 
                        perspective: 1000px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), left 0.5s linear, top 0.5s linear;
                    ">
                        <div style="
                            width: 60px;
                            height: 60px;
                            filter: drop-shadow(0 12px 20px rgba(0,0,0,0.4));
                            transform: rotateX(35deg);
                            transform-style: preserve-3d;
                        ">
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M50 5L90 95L50 75L10 95L50 5Z" fill="url(#navGrad)" stroke="white" stroke-width="4" stroke-linejoin="round"/>
                                <defs>
                                    <linearGradient id="navGrad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#3B82F6"/>
                                        <stop offset="1" stop-color="#1D4ED8"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>
                `,
                anchor: new window.naver.maps.Point(40, 40)
            }
        });

        userMarkerRef.current = arrowMarker;

        const lastNavUpdateRef = { current: 0 };

        const handleNavigationUpdate = (latitude: number, longitude: number, heading: number | null) => {
            // Throttle navigation updates to ~2Hz (500ms) for smoother visual flow
            const now = Date.now();
            if (now - lastNavUpdateRef.current < 500) return;
            lastNavUpdateRef.current = now;

            const currentPos = new window.naver.maps.LatLng(latitude, longitude);
            const currentPathPoints = pathOptions[selectedPathIndex].path;

            let closestIdx = 0;
            let minDist = Infinity;

            currentPathPoints.forEach((p, i) => {
                const dist = Math.sqrt(Math.pow(p.lat - latitude, 2) + Math.pow(p.lng - longitude, 2));
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = i;
                }
            });

            if (minDist > 0.001) { // ~100m threshold for rerouting (relaxed for smoothness)
                console.log("DEBUG: Off route detected (dist:", minDist, "). Silent re-calculating...");
                if (lastDest) {
                    performSearch(lastDest, true).then(() => {
                        console.log("DEBUG: Rerouting complete.");
                    });
                }
            }

            // Check for nearby congestion zones
            const nearbyCongestion = congestionzones.find(zone => {
                const dist = Math.sqrt(Math.pow(zone.lat - latitude, 2) + Math.pow(zone.lng - longitude, 2)) * 111000;
                return dist < (zone.radius + 50); // Warning buffer of 50m
            });

            if (nearbyCongestion && (nearbyCongestion.currentLevel === "매우혼잡" || nearbyCongestion.currentLevel === "혼잡")) {
                setCongestionWarning({ name: nearbyCongestion.name, level: nearbyCongestion.currentLevel });
            } else {
                setCongestionWarning(null);
            }

            const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
                const startLatRad = startLat * (Math.PI / 180);
                const startLngRad = startLng * (Math.PI / 180);
                const destLatRad = destLat * (Math.PI / 180);
                const destLngRad = destLng * (Math.PI / 180);

                const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
                const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
                    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
                const brng = Math.atan2(y, x);
                return (brng * 180 / Math.PI + 360) % 360;
            };

            let rot = heading;

            if (!rot && currentPathPoints.length > 1) {
                const p1 = currentPathPoints[Math.min(closestIdx, currentPathPoints.length - 2)];
                const p2 = currentPathPoints[Math.min(closestIdx + 1, currentPathPoints.length - 1)];
                if (p1 && p2) {
                    rot = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
                }
            }

            rot = rot || 0;

            if (isCompassModeRef.current) {
                // Native Map Rotation
                // mapRef.current.setOptions({ heading: rot }); // Option 1: Rotate Map

                // Option 2: Keep Map North-Up but rotate Camera? No, Navigation usually rotates map.
                // Naver 'morph' can animate heading.
            } else {
                // setMapRotation(0); 
            }

            if (userMarkerRef.current) {
                userMarkerRef.current.setPosition(currentPos);

                // Smoothly rotate the internal DIV of the marker
                const markerEl = document.getElementById('user-nav-marker');
                if (markerEl) {
                    markerEl.style.transform = `rotate(${rot}deg)`;
                }
            }

            if (mapRef.current) {
                if (isCompassModeRef.current) {
                    // Rotating Map Mode (Heading Follows User)
                    // Sync with physical device heading if available
                    const finalHeading = deviceHeading !== null ? deviceHeading : rot;
                    try {
                        mapRef.current.morph(currentPos, 18, { tilt: 60, heading: finalHeading });
                        setMapRotation(finalHeading); // Sync UI state
                    } catch (e) {
                        mapRef.current.setCenter(currentPos);
                    }
                } else {
                    // Static North Up Mode
                    try {
                        mapRef.current.morph(currentPos, 18, { tilt: 0, heading: 0 });
                    } catch (e) {
                        mapRef.current.setCenter(currentPos);
                    }
                }
            }

            setUserLocation({ lat: latitude, lng: longitude });

            const newDisplayPath = [
                new window.naver.maps.LatLng(latitude, longitude),
                ...currentPathPoints.slice(closestIdx).map(p => new window.naver.maps.LatLng(p.lat, p.lng))
            ];

            if (pathOverlaysRef.current.length > 0) {
                pathOverlaysRef.current[0].setPath(newDisplayPath);
            }

            if (pathOptions.length > 0 && pathOptions[selectedPathIndex]) {
                const currentPathResult = pathOptions[selectedPathIndex];
                let distToRest = 0;
                for (let i = closestIdx; i < currentPathPoints.length - 1; i++) {
                    const p1 = currentPathPoints[i];
                    const p2 = currentPathPoints[i + 1];
                    const d = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
                    distToRest += (d * 111000);
                }
                if (isNaN(distToRest)) distToRest = 0;
                setRemainingDistDisplay(Math.floor(distToRest));

                const steps = currentPathResult.navigationSteps || [];

                if (steps.length > 0) {
                    let distToTurn = 0;
                    let targetStepIndex = 0;
                    for (let i = 0; i < steps.length; i++) {
                        const s = steps[i];
                        const d = Math.sqrt(Math.pow(s.location.lat - latitude, 2) + Math.pow(s.location.lng - longitude, 2)) * 111000;
                        if (d > 30) {
                            targetStepIndex = i;
                            distToTurn = d;
                            break;
                        }
                    }

                    if (steps[targetStepIndex]) {
                        const step = steps[targetStepIndex];
                        setNavNextDist(Math.floor(distToTurn));

                        const m = step.maneuver;
                        let icon = "⬆️";
                        let text = "직진";
                        if (m.type === 'turn') {
                            if (m.modifier?.includes('left')) { icon = "Kv"; text = "좌회전"; }
                            else if (m.modifier?.includes('right')) { icon = "Kw"; text = "우회전"; }
                        } else if (m.type === 'new name') {
                            text = "직진";
                        } else if (m.type === 'arrive') {
                            icon = "🏁"; text = "도착";
                        } else if (m.type === 'merge') {
                            icon = "Y"; text = "합류";
                        }
                        if (m.modifier === 'sharp left') { icon = "Kv"; text = "급좌회전"; }
                        if (m.modifier === 'sharp right') { icon = "Kw"; text = "급우회전"; }
                        if (m.modifier === 'uturn') { icon = "U"; text = "유턴"; }

                        setNavInstruction(`${text} (${step.name || '도로'})`);
                        setNavIcon(icon);
                    } else {
                        // Fallback instruction if no steps found or reached end
                        if (distToRest < 50) {
                            setNavInstruction("목적지 부근입니다");
                            setNavIcon("🏁");
                        } else {
                            setNavInstruction("경로를 따라 이동하세요");
                            setNavIcon("⬆️");
                        }
                    }
                } else {
                    setNavInstruction("경로를 따라 이동하세요");
                    setNavIcon("⬆️");
                }

                const now = new Date();
                const originalTotalDist = currentPathResult.distance || 1;
                const progress = Math.max(0, Math.min(1, 1 - (distToRest / originalTotalDist)));
                const baseTime = currentPathResult.time;
                const remainingMins = Math.max(0, Math.ceil(baseTime * (1 - progress)));

                const arrivalCalc = new Date(now.getTime() + remainingMins * 60000);
                const hours = arrivalCalc.getHours();
                const minutes = arrivalCalc.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                setArrivalTime(`${displayHours}:${minutes.toString().padStart(2, '0')}|${ampm}`);
            }

            const dest = currentPathPoints[currentPathPoints.length - 1];
            const distToDest = Math.sqrt(Math.pow(dest.lat - latitude, 2) + Math.pow(dest.lng - longitude, 2));

            if (distToDest < 0.0003) {
                if (driveIntervalRef.current) navigator.geolocation.clearWatch(driveIntervalRef.current);
                setShowEndNavModal(true);
            }
        };

        driveIntervalRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                handleNavigationUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.heading);
            },
            (err) => {
                console.error("DEBUG: GPS Tracking Error", err);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 3000,
                timeout: 15000
            }
        );

        if (userLocation) {
            handleNavigationUpdate(userLocation.lat, userLocation.lng, null);
        }
    };

    const getFormattedDistance = (m: number) => {
        if (m >= 1000) {
            return { val: (m / 1000).toFixed(1), unit: "km" };
        }
        return { val: Math.round(m).toString(), unit: "m" };
    };

    return (
        <div className="relative w-full h-[100dvh] overflow-hidden bg-gray-100">


            {/* Map Container (Native 3D) */}
            <div
                ref={mapContainerParentRef}
                className="w-full h-full relative overflow-hidden bg-gray-200"
            >
                <div
                    ref={mapContainerRef}
                    className="w-full h-full z-0 outline-none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        touchAction: 'none'
                    }}
                />
            </div>

            {/* Top Search (Hidden during navigation) */}
            {!isNavigating && (
                <div
                    className="absolute z-[999] pointer-events-none"
                    style={{
                        top: 'calc(env(safe-area-inset-top) + 16px)',
                        left: 'calc(env(safe-area-inset-left) + 16px)',
                        right: 'calc(env(safe-area-inset-right) + 16px)'
                    }}
                >
                    <div className="bg-white rounded-full shadow-xl p-1 flex items-center gap-1.5 border border-gray-200 pointer-events-auto relative z-30 h-12">
                        <button onClick={() => navigate(-1)} className="flex-shrink-0 relative z-20 w-10 h-10 bg-gray-50 hover:bg-gray-100 text-black rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center border border-gray-100 !p-0 ml-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" style={{ fill: 'black' }}>
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                        </button>
                        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-0 group/search h-full">
                            <input
                                id="search-input"
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder={isListening ? "말씀해 주세요..." : "어디로 갈까요?"}
                                className={`flex-1 min-w-0 h-full pl-1.5 pr-0 outline-none text-[15px] text-gray-900 placeholder-gray-500 bg-transparent font-medium transition-colors ${isListening ? 'placeholder-blue-500 animate-pulse' : ''}`}
                            />
                            <div className="flex-shrink-0 flex items-center gap-1.5 pr-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log("DEBUG: Mic clicked, isListening:", isListening);
                                        toggleVoiceSearch();
                                    }}
                                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all relative z-50 !p-0 ${isListening ? 'bg-red-500 text-white ring-4 ring-red-100 shadow-lg' : 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm hover:bg-blue-100'}`}
                                    title="음성 검색"
                                >
                                    {isListening && (
                                        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />
                                    )}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 relative z-10" style={{ display: 'block' }}>
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                    </svg>
                                </button>
                                <button
                                    type="submit"
                                    className="flex-shrink-0 h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[13.5px] font-black shadow-lg shadow-blue-100 active:scale-95 transition-all whitespace-nowrap flex items-center justify-center relative z-40"
                                >
                                    {isSearching ? "..." : "검색"}
                                </button>
                            </div>
                        </form>
                    </div>




                    {/* Control Panel */}
                    {/* Control Panel */}
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide pointer-events-auto items-center">
                        {/* Transport Modes */}
                        {["stroll", "my_routes", "walking", "cycling", "transit"].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => {
                                    if (mode === "my_routes") {
                                        setShowSavedRoutes(true);
                                        return;
                                    }
                                    if (mode === "stroll" && transportMode !== "stroll") {
                                        setLastDest(null);
                                        setPathOptions([]);
                                        setSearchKeyword("");
                                    }
                                    setTransportMode(mode as any);
                                }}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm transition-all flex items-center gap-1 border ${transportMode === mode
                                    ? "bg-gray-800 text-white border-gray-800"
                                    : "bg-white text-gray-500 border-gray-200"
                                    }`}
                            >
                                <span>{mode === "stroll" ? "👣" : mode === "my_routes" ? "⭐" : mode === "walking" ? "🏃" : mode === "cycling" ? "🚲" : "🚌"}</span>
                                <span className="text-[10px] font-bold">
                                    {mode === "stroll" ? "산책로" : mode === "my_routes" ? "나의 경로" : mode === "walking" ? "도보" : mode === "cycling" ? "자전거" : "대중교통"}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* NAV HUD: Top Left - Turn By Turn & Congestion Alert */}
            {
                isNavigating && (
                    <div className="absolute top-4 left-4 z-30 pointer-events-none flex flex-col gap-2">
                        {/* Turn Card */}
                        <div className="bg-white/95 backdrop-blur-md rounded-[1.8rem] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.1)] flex flex-col items-start min-w-[170px] animate-slide-in-left border-[5px] border-slate-200 relative">
                            <div className="absolute inset-[-3.5px] rounded-[1.6rem] border border-white/60 pointer-events-none" />
                            <div className="flex items-center gap-3 mb-1.5 relative z-10">
                                <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner border border-slate-100">
                                    <span className="text-3xl text-emerald-600 font-bold">
                                        {navIcon === "Kv" ? "↰" : navIcon === "Kw" ? "↱" : navIcon === "U" ? "↶" : navIcon}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                                        {getFormattedDistance(navNextDist).val}{getFormattedDistance(navNextDist).unit}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[15px] font-bold text-slate-600 leading-tight relative z-10 pl-1">
                                {navInstruction}
                            </span>
                        </div>

                        {/* Congestion Warning Alert */}
                        {congestionWarning && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-3 rounded-2xl shadow-lg border-2 flex items-center gap-2 ${congestionWarning.level === "매우혼잡"
                                    ? "bg-red-50 border-red-200 text-red-600"
                                    : "bg-orange-50 border-orange-200 text-orange-600"
                                    }`}
                            >
                                <span className="text-lg">⚠️</span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase opacity-70">주의: 혼잡 구역</span>
                                    <span className="text-xs font-bold">{congestionWarning.name} ({congestionWarning.level})</span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )
            }

            {/* NAV HUD: Top Right - Controls & Compass */}
            {
                isNavigating && (
                    <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-3 pointer-events-auto">
                        {/* Premium White/Silver Compass */}
                        <div
                            className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-200 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.15),inset_0_-2px_6px_rgba(0,0,0,0.05)] transition-all duration-300 relative cursor-pointer group hover:scale-105 active:scale-95"
                            onClick={() => {
                                if (!deviceHeading) requestOrientationPermission();
                                setIsCompassMode(!isCompassMode);
                            }}
                        >
                            {/* Metallic Silver Rim Detail */}
                            <div className="absolute inset-[-4px] rounded-full border border-white/40 pointer-events-none" />
                            <div className="absolute inset-[-6px] rounded-full border border-slate-300/30 pointer-events-none" />

                            {/* Degree markings (subtle dark) */}
                            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                                <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" strokeDasharray="1 19" />
                                <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeDasharray="1 89" />
                            </svg>

                            {/* Cardinal Directions */}
                            <div className="absolute inset-0 p-2 flex flex-col items-center justify-between text-[11px] font-black pointer-events-none">
                                <span className="text-red-600 drop-shadow-sm">N</span>
                                <span className="text-slate-400">S</span>
                            </div>
                            <div className="absolute inset-0 p-2 flex items-center justify-between text-[11px] font-black pointer-events-none px-1.5">
                                <span className="text-slate-400">W</span>
                                <span className="text-slate-400">E</span>
                            </div>

                            {/* Compass Dial/Needle tied to hardware sensor if available, else mapRotation */}
                            <div
                                className="w-full h-full relative flex items-center justify-center transition-transform duration-300 ease-out"
                                style={{ transform: `rotate(${deviceHeading !== null ? -deviceHeading : mapRotation}deg)` }}
                            >
                                {/* Realistic Metallic Needle */}
                                <div className="relative w-2 h-14 flex flex-col items-center">
                                    {/* Top Half (North - Red) */}
                                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[28px] border-b-red-600 filter drop-shadow(0 2px 3px rgba(0,0,0,0.2))" />
                                    {/* Bottom Half (South - Silver/Gray) */}
                                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[28px] border-t-slate-300 filter drop-shadow(0 -2px 3px rgba(0,0,0,0.1))" />

                                    {/* Center Hub Pin */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md border border-slate-200 z-10 flex items-center justify-center">
                                        <div className="w-1 h-1 bg-slate-400 rounded-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Hardware Sensor Status Marker */}
                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${deviceHeading !== null ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />

                            {/* Mode Indicator Text */}
                            {!deviceHeading && isOrientationSupported && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded-full shadow-sm">
                                    센서 클릭 필요
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* NAV HUD: Bottom Footer (Replaces Original Footer) */}
            {
                isNavigating && (
                    <>
                        {/* Standalone Path Overview Button */}
                        <button
                            onClick={showPathOverview}
                            className="absolute bottom-[200px] right-4 z-40 bg-white/95 border border-slate-200 w-11 h-11 rounded-full shadow-xl active:scale-90 transition-all flex items-center justify-center hover:bg-white group"
                        >
                            <div className="flex flex-col items-center gap-0.5">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-[8px] font-black text-blue-600 leading-none">VIEW</span>
                            </div>
                        </button>

                        <div className="absolute bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.1)] rounded-t-2xl overflow-hidden pb-[env(safe-area-inset-bottom)] animate-slide-up">
                            <div className="p-2 flex flex-col gap-2 relative">
                                {/* Row 1: Enhanced Stats with progress bar */}
                                <div className="flex flex-col">
                                    {/* Environmental Context Bar (Subtle) */}
                                    <div className="flex items-center justify-between px-2 mb-1 opacity-70">
                                        {/* Left: Address */}
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{currentAddress}</span>
                                        </div>

                                        {/* Right: Weather & SDK Status */}
                                        <div className="flex items-center gap-2">
                                            {/* SDK Badges */}
                                            <div className="flex gap-1 mr-1">
                                                <div className={`px-1 py-0.5 rounded-md text-[7px] font-black flex items-center gap-0.5 ${sdkStat.naver === 'ready' ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}>
                                                    <span>N</span>{sdkStat.naver === 'ready' ? '✅' : '⏳'}
                                                </div>
                                                <div className={`px-1 py-0.5 rounded-md text-[7px] font-black flex items-center gap-0.5 ${sdkStat.kakao === 'ready' ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50'}`}>
                                                    <span>K</span>{sdkStat.kakao === 'ready' ? '✅' : '⏳'}
                                                </div>
                                            </div>

                                            {weather && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs">{weather.icon}</span>
                                                    <span className="text-[10px] font-black text-slate-500">{Math.round(weather.temp)}°C</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Single Row Unified Dashboard (Restored Style) */}
                                    <div className="grid grid-cols-5 gap-1.5 p-1.5 mt-0.5">
                                        {/* Combined Stats: Distance & Arrival (Spans 3 Columns) */}
                                        <div className="col-span-3 bg-slate-50 border border-slate-200/50 rounded-2xl px-4 flex items-center justify-between shadow-inner h-[58px]">
                                            <div className="flex flex-col justify-center">
                                                <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Dist</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-mono font-black text-slate-900 tracking-tighter leading-none">
                                                        {getFormattedDistance(remainingDistDisplay).val}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                        {getFormattedDistance(remainingDistDisplay).unit}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-[1px] h-7 bg-slate-200 mx-2" />

                                            <div className="flex flex-col items-end justify-center">
                                                <span className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1">Arrival</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-2xl font-mono font-black text-blue-600 tracking-tighter leading-none">
                                                        {arrivalTime ? (
                                                            // Convert to 24-hour format if needed, or ensure HH:mm
                                                            arrivalTime.split('|')[0].replace(/(AM|PM)/i, '').trim()
                                                        ) : "--:--"}
                                                    </span>
                                                    <div className="px-1.5 py-1 bg-blue-100/40 rounded shadow-sm leading-none border border-blue-100/50">
                                                        <span className="text-[9px] font-black text-blue-600">
                                                            {Math.floor(pathOptions[selectedPathIndex]?.time || 0)}m
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Smoking Button (Spans 1 Column) */}
                                        <button
                                            onClick={() => setShowSmokeReg(true)}
                                            className="col-span-1 h-[58px] flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-orange-50 rounded-2xl shadow-sm border border-orange-100/50 transition-all active:scale-95 group"
                                        >
                                            <span className="text-base leading-none">🚬</span>
                                            <span className="text-[9px] font-black text-gray-700">흡연</span>
                                        </button>

                                        {/* Congestion Button (Spans 1 Column) */}
                                        <button
                                            onClick={() => setShowCongestionReg(true)}
                                            className="col-span-1 h-[58px] flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-red-50 rounded-2xl shadow-sm border border-red-100/50 transition-all active:scale-95 group"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)] mb-0.5"></div>
                                            <span className="text-[9px] font-black text-gray-700">혼잡</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Unified Controls Row (5 Buttons) */}
                                <div className="grid grid-cols-5 gap-1.5 p-1.5">
                                    {/* Button 1: Stop Guidance (Stop Icon) */}
                                    <button
                                        onClick={stopNavigation}
                                        className="h-[58px] flex items-center justify-center bg-red-50 text-red-600 rounded-2xl border border-red-100/50 shadow-sm active:scale-95 transition-all"
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="6" y="6" width="12" height="12" rx="1.5" />
                                        </svg>
                                    </button>

                                    {/* Button 2: Change Route (Swap/Route Icon) */}
                                    <button
                                        onClick={() => setShowRouteList(true)}
                                        className="h-[58px] flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 active:scale-95 transition-all"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-4-4m0 0l4-4m-4 4h18M15 4l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </button>

                                    {/* Button 3: Alt Route (Recycle/Alternative Icon) */}
                                    <button
                                        onClick={handleAltRoute}
                                        className="h-[58px] flex items-center justify-center bg-blue-600 text-white rounded-2xl shadow-lg border border-blue-500 active:scale-95 transition-all"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>

                                    {/* Button 4: Theme Toggle */}
                                    <button
                                        onClick={toggleTheme}
                                        className={`h-[58px] flex flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                                    >
                                        <span className="text-xl leading-none">{theme === 'dark' ? '🌙' : '☀️'}</span>
                                    </button>

                                    {/* Button 5: Menu */}
                                    <button
                                        onClick={() => setMenuOpen(!menuOpen)}
                                        className={`h-[58px] flex flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                                    >
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 6h16M4 12h16M4 18h16" stroke={theme === 'dark' ? '#fff' : '#334155'} strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Footer Menu Overlay */}
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="bg-gray-50 px-4 py-4 grid grid-cols-2 gap-2 border-t border-gray-100"
                                >
                                    {menuItems.map((item) => (
                                        <button
                                            key={item.name}
                                            onClick={() => handleMenuNavigation(item.target)}
                                            className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 text-sm font-bold text-gray-700 active:bg-gray-50 flex items-center justify-center"
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                    {/* Stop Guidance Button in Grid */}
                                    {isNavigating && (
                                        <button
                                            onClick={stopNavigation}
                                            className="p-3 bg-red-50/80 rounded-xl shadow-sm border border-red-100 text-sm font-bold text-red-600 active:bg-red-100 flex items-center justify-center gap-2"
                                        >
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            안내종료
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </>
                )
            }

            {/* Loading Overlay */}
            {
                mapStatus !== "완료" && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-auto">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <div className="text-gray-800 font-bold text-lg animate-pulse">{mapStatus}</div>
                    </div>
                )
            }

            {/* Persistent Debug Overlay (Error & GPS) */}
            <div className="absolute top-20 left-4 z-[99999] flex flex-col gap-2 max-w-[80vw] pointer-events-auto">
                {/* Error Banner */}
                {lastError && (
                    <div className="bg-red-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-[10px] font-medium shadow-xl border border-red-400/30 flex justify-between items-center transition-all animate-in fade-in slide-in-from-left-4">
                        <span className="truncate mr-2">{lastError}</span>
                        <button onClick={() => setLastError(null)} className="opacity-70 hover:opacity-100 font-black">✕</button>
                    </div>
                )}

                {/* GPS Retry Button (Only when error) */}
                {gpsError && (
                    <button
                        onClick={fetchGps}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg font-bold text-xs flex items-center gap-2 animate-bounce transition-all active:scale-95"
                    >
                        <span>📍</span> 위치 찾기 재시도
                    </button>
                )}
            </div>




            {/* Relocated Reporting Buttons (Hidden during navigation as they are now integrated in the footer) */}
            {
                !isNavigating && (
                    <div
                        className="absolute right-4 z-[9999] flex flex-col gap-2 pointer-events-auto transition-all duration-300"
                        style={{
                            bottom: (pathOptions.length > 0 || isSearching)
                                ? (showRouteList ? '62vh' : '96px') // Above Bottom Sheet
                                : 'calc(env(safe-area-inset-bottom) + 20px)' // Default bottom
                        }}
                    >
                        {/* My Location Button (Floating) */}
                        <button
                            onClick={fetchGps}
                            className="w-[62px] h-[52px] flex items-center justify-center gap-1.5 bg-white/95 backdrop-blur-sm hover:bg-blue-50 rounded-[22px] shadow-lg border border-blue-100 transition-all active:scale-95 mb-2"
                        >
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setShowSmokeReg(true)}
                            className="w-[62px] h-[52px] flex items-center justify-center gap-1.5 bg-white/95 backdrop-blur-sm hover:bg-orange-50 rounded-[22px] shadow-lg border border-orange-100 transition-all active:scale-95"
                        >
                            <div className="w-6 flex justify-center">
                                <span className="text-lg">🚬</span>
                            </div>
                            <div className="flex flex-col items-center leading-[1.1] text-[12px] font-black text-gray-700">
                                <span>등</span>
                                <span>록</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setShowCongestionReg(true)}
                            className="w-[62px] h-[52px] flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm hover:bg-red-50 rounded-[22px] shadow-lg border border-red-100 transition-all active:scale-95"
                        >
                            <div className="w-3 flex justify-center items-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                            </div>
                            <div className="flex flex-col items-center leading-[1.1] text-[12px] font-black text-gray-700">
                                <span>제</span>
                                <span>보</span>
                            </div>
                        </button>
                    </div>
                )
            }

            {/* Path Selection Bottom Sheet */}
            {
                (!isNavigating || (isNavigating && showRouteList)) && (isSearching || pathOptions.length > 0) && (
                    <div
                        className={`absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out flex flex-col ${showRouteList ? 'translate-y-0' : 'translate-y-[calc(100%_-_80px)]'}`}
                        style={{
                            maxHeight: '60vh',
                            paddingBottom: 'env(safe-area-inset-bottom)'
                        }}
                    >
                        {/* Handle / Header */}
                        <div
                            className="w-full pt-3 pb-2 flex flex-col items-center cursor-pointer active:bg-gray-50 rounded-t-3xl"
                            onClick={() => setShowRouteList(!showRouteList)}
                        >
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-3"></div>
                            {isRouteSheetLoading ? (
                                <div className="w-full px-6 py-4 flex flex-col gap-2 animate-pulse">
                                    <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                                </div>
                            ) : pathOptions[selectedPathIndex] ? (
                                <div className="w-full px-6 flex justify-between items-center">
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-gray-800">
                                                {pathOptions[selectedPathIndex].type === "RECOMMENDED" ? "추천 경로"
                                                    : pathOptions[selectedPathIndex].type === "FASTEST" ? "최단 경로"
                                                        : pathOptions[selectedPathIndex].type === "AVOID_SMOKE" ? "피해가는 경로"
                                                            : pathOptions[selectedPathIndex].type === "AVOID_CONGESTION" ? "피해가는 경로"
                                                                : pathOptions[selectedPathIndex].type === "AVOID_ALL" ? "피해가는 경로"
                                                                    : pathOptions[selectedPathIndex].type === "STROLL" ? (pathOptions[selectedPathIndex].name || "추천 산책로")
                                                                        : "쾌적 경로"}
                                            </span>
                                            {pathOptions[selectedPathIndex].transitInfo && (
                                                <span
                                                    className="text-[10px] text-white px-2 py-0.5 rounded-full font-bold"
                                                    style={{ backgroundColor: pathOptions[selectedPathIndex].transitInfo.color }}
                                                >
                                                    {pathOptions[selectedPathIndex].transitInfo.line}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {transportMode === "transit" && (
                                                <>
                                                    {pathOptions[selectedPathIndex].fare ? (
                                                        <span className="text-xs text-blue-500 font-bold">
                                                            {pathOptions[selectedPathIndex].fare.toLocaleString()}원
                                                        </span>
                                                    ) : null}
                                                    {pathOptions[selectedPathIndex].transferCount !== undefined && (
                                                        <span className="text-[10px] text-gray-400">
                                                            환승 {pathOptions[selectedPathIndex].transferCount}회
                                                        </span>
                                                    )}
                                                    {pathOptions[selectedPathIndex].walkingDistance !== undefined && (
                                                        <span className="text-[10px] text-gray-400">
                                                            도보 {Math.round(pathOptions[selectedPathIndex].walkingDistance)}m
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <span className="text-2xl font-black text-blue-600">
                                            {pathOptions[selectedPathIndex].time > 60
                                                ? `${Math.floor(pathOptions[selectedPathIndex].time / 60)}시간 ${Math.round(pathOptions[selectedPathIndex].time % 60)}분`
                                                : `${Math.round(pathOptions[selectedPathIndex].time)}분`}
                                        </span>
                                        <span className="text-sm text-gray-500 mb-1">
                                            {(pathOptions[selectedPathIndex].distance / 1000).toFixed(1)}km
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full px-6 text-center text-gray-500 font-bold">
                                    {isRouteSheetLoading ? "경로 데이터를 불러오는 중..." : "경로를 찾을 수 없습니다."}
                                </div>
                            )}
                        </div>

                        {/* Route List (Scrollable) */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                            {isRouteSheetLoading ? (
                                // Skeleton Loader
                                [1, 2, 3].map(i => (
                                    <div key={i} className="w-full h-24 bg-gray-50 rounded-xl animate-pulse"></div>
                                ))
                            ) : (
                                pathOptions.map((opt, idx) => (
                                    <button
                                        key={`${opt.type}-${idx}`}
                                        onClick={() => {
                                            if (opt.destPoint && transportMode === "stroll") {
                                                setLastDest(opt.destPoint);
                                                performSearch(opt.destPoint);
                                            } else {
                                                setSelectedPathIndex(idx);
                                                if (isNavigating) setShowRouteList(false);
                                            }
                                        }}
                                        className={`w-full p-4 rounded-xl border transition-all flex justify-between items-center ${selectedPathIndex === idx
                                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                            : 'bg-white border-gray-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opt.type === "RECOMMENDED" ? "bg-blue-100 text-blue-700"
                                                    : opt.type === "FASTEST" ? "bg-red-100 text-red-700 hover:bg-red-200"
                                                        : opt.type === "AVOID_SMOKE" ? "bg-orange-100 text-orange-700"
                                                            : opt.type === "AVOID_CONGESTION" ? "bg-amber-100 text-amber-700"
                                                                : opt.type === "AVOID_ALL" ? "bg-emerald-100 text-emerald-700"
                                                                    : opt.type === "STROLL" ? "bg-emerald-100 text-emerald-700"
                                                                        : "bg-green-100 text-green-700"
                                                    }`}>
                                                    {opt.type === "RECOMMENDED" ? "추천"
                                                        : opt.type === "FASTEST" ? "최단"
                                                            : opt.type === "AVOID_SMOKE" ? "흡연회피"
                                                                : opt.type === "AVOID_CONGESTION" ? "혼잡회피"
                                                                    : opt.type === "AVOID_ALL" ? "모두회피"
                                                                        : opt.type === "STROLL" ? "산책로"
                                                                            : (transportMode === "walking" ? "피해가는 추천" : "쾌적")}
                                                </span>
                                                {opt.type === "STROLL" && opt.name && <span className="text-[11px] font-black text-gray-700">{opt.name}</span>}
                                                {opt.type === "COMFORTABLE" && <span className="text-[10px] text-gray-400">⚡ 회피 적용</span>}
                                            </div>
                                            <p className="text-gray-500 text-sm">
                                                {(opt.distance / 1000).toFixed(1)}km
                                            </p>
                                            {transportMode === "transit" && opt.transitSteps && opt.transitSteps.length > 0 ? (
                                                <div className="mt-3 flex flex-col gap-3 border-l-2 border-gray-100 ml-2 pl-4 py-1">
                                                    {opt.transitSteps.map((step, sIdx) => {
                                                        const isSelected = selectedPathIndex === idx;
                                                        if (!isSelected && step.type === 'walk') return null; // Skip walks in compact view

                                                        return (
                                                            <div key={sIdx} className={`relative flex items-start gap-3 ${!isSelected ? 'inline-flex' : ''}`}>
                                                                {/* Step Dot - Only show if selected or first/last transit */}
                                                                {isSelected && (
                                                                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${step.type === 'walk' ? 'bg-gray-300' : (step.color || '#000')
                                                                        }`} />
                                                                )}

                                                                <div className={`flex flex-col ${!isSelected ? 'items-center' : 'flex-1'}`}>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {step.type !== 'walk' ? (
                                                                            <span
                                                                                className={`px-1.5 py-0.5 rounded font-bold transition-all ${isSelected ? 'text-[11px]' : 'text-[9px]'
                                                                                    }`}
                                                                                style={{
                                                                                    backgroundColor: isSelected ? 'white' : (step.color || '#000'),
                                                                                    color: isSelected ? 'gray-800' : 'white',
                                                                                    border: isSelected ? `1px solid ${step.color || '#ddd'}` : 'none'
                                                                                }}
                                                                            >
                                                                                {step.type === 'subway' ? '🚇' : '🚌'} {step.line}
                                                                            </span>
                                                                        ) : isSelected && (
                                                                            <span className="text-[11px] font-black text-gray-800">도보</span>
                                                                        )}
                                                                        {isSelected && <span className="text-[10px] font-bold text-gray-400">{step.time}분</span>}
                                                                    </div>

                                                                    {isSelected && (
                                                                        <>
                                                                            {(step.startName || step.endName) && (
                                                                                <div className="mt-0.5 text-[9px] text-gray-400 flex items-center gap-1">
                                                                                    <span className="font-medium">{step.startName}</span>
                                                                                    {step.endName && <>
                                                                                        <span className="opacity-50">→</span>
                                                                                        <span className="font-medium">{step.endName}</span>
                                                                                    </>}
                                                                                </div>
                                                                            )}

                                                                            {step.stationCount && step.stationCount > 0 && (
                                                                                <div className="text-[9px] text-blue-500/70 font-bold mt-0.5">
                                                                                    {step.stationCount}개 정류장 이동
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                                {!isSelected && sIdx < opt.transitSteps!.length - 1 && opt.transitSteps![sIdx + 1].type !== 'walk' && (
                                                                    <span className="text-gray-300 text-[10px] self-center">&gt;</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : transportMode === "transit" && (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <p className="text-[10px] text-gray-500 font-bold">도보로 직접 이동</p>
                                                    {opt.isFallback && <span className="text-[9px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded border border-amber-100 italic">대중교통 데이터 부족</span>}
                                                </div>
                                            )}
                                            {opt.fare && opt.fare > 0 && (
                                                <p className="text-[10px] text-blue-500 font-bold mt-1">
                                                    예상 요금 {opt.fare.toLocaleString()}원
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-gray-800">
                                                {opt.time > 60
                                                    ? `${Math.floor(opt.time / 60)}시간 ${Math.floor(opt.time % 60)}분`
                                                    : `${Math.floor(opt.time)}분`}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Footer Actions (Save & Start) */}
                        <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                            <button
                                onClick={handleSaveRoute}
                                disabled={isRouteSheetLoading || pathOptions.length === 0}
                                className="flex-shrink-0 w-14 h-14 bg-gray-50 text-gray-400 rounded-xl flex flex-col items-center justify-center border border-gray-100 active:scale-95 transition-all disabled:opacity-50"
                                title="경로 저장"
                            >
                                <span className="text-xl">⭐</span>
                                <span className="text-[10px] font-bold whitespace-nowrap">저장</span>
                            </button>
                            <button
                                onClick={startNavigation}
                                disabled={isRouteSheetLoading || pathOptions.length === 0}
                                className={`flex-1 py-4 rounded-xl font-bold text-lg shadow-lg active:scale-98 transition-transform flex items-center justify-center gap-2 ${isRouteSheetLoading || pathOptions.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                <span>{isRouteSheetLoading ? '경로 탐색 중...' : '안내 시작'}</span>
                                {!isRouteSheetLoading && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Modal: End of Navigation Confirmation */}
            {
                showEndNavModal && (
                    <div className="absolute inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white w-full max-w-xs rounded-[40px] overflow-hidden shadow-2xl p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-[#FFF3E0] rounded-[24px] flex items-center justify-center mx-auto mb-6 transform rotate-3">
                                <span className="text-4xl">⭐</span>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">나의 경로 저장</h3>

                            <p className="text-[15px] text-slate-500 font-bold leading-relaxed mb-8">
                                안내 완료된 경로를<br />
                                <span className="text-[#FF6D00]">나의 경로</span>로 저장할까요?<br />
                                언제든지 다시 확인할 수 있습니다.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowEndNavModal(false);
                                        stopNavigation();
                                        // Removed home navigation per user request: "취소버튼클릭시 지도창이 나오도록"
                                    }}
                                    className="flex-1 h-16 bg-[#F1F3F5] hover:bg-[#E9ECEF] text-slate-600 rounded-2xl font-black text-lg transition-all active:scale-95"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        handleSaveRoute();
                                        setShowEndNavModal(false);
                                        stopNavigation();
                                    }}
                                    className="flex-1 h-16 bg-[#FF6D00] hover:bg-[#E65100] text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-100 transition-all active:scale-95"
                                >
                                    저장하기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Modal: Saved Routes */}
            {
                showSavedRoutes && (
                    <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                    <span className="text-xl">⭐</span> 나의 저장된 경로
                                </h3>
                                <button onClick={() => setShowSavedRoutes(false)} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300">✕</button>
                            </div>
                            <div className="max-h-[60dvh] overflow-y-auto p-4 space-y-3">
                                {savedRoutes.length === 0 ? (
                                    <div className="py-20 text-center flex flex-col items-center gap-3">
                                        <span className="text-4xl opacity-20">🗺️</span>
                                        <p className="text-gray-400 text-sm font-bold">저장된 경로가 없습니다.<br />자주 가는 길을 저장해 보세요!</p>
                                    </div>
                                ) : (
                                    savedRoutes.map((route) => (
                                        <button
                                            key={route.id}
                                            onClick={() => {
                                                setTransportMode(route.mode);
                                                setLastDest(route.endPoint);
                                                setSearchKeyword(route.name);
                                                setPathOptions([route]);
                                                setSelectedPathIndex(0);
                                                setShowRouteList(true);
                                                setShowSavedRoutes(false);
                                                drawPath(route.path);
                                            }}
                                            className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-blue-200 transition-all text-left flex justify-between items-center group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate mb-1">{route.name}</p>
                                                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold uppercase">{route.mode}</span>
                                                    <span>{(route.distance / 1000).toFixed(1)}km</span>
                                                    <span>•</span>
                                                    <span>{route.time}분</span>
                                                </div>
                                            </div>
                                            <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Modal: Smoke Registration Confirmation */}
            {
                showSmokeReg && (
                    <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl p-6 text-center"
                        >
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🚬</div>
                            <h3 className="text-xl font-black text-gray-800 mb-2">흡연구역 등록</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                현재 위치({currentAddress})를<br />
                                <span className="font-bold text-orange-600">글로벌 흡연구역</span>으로 등록할까요?<br />
                                모든 사용자에게 공유됩니다.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSmokeReg(false)}
                                    className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-600 font-bold"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleRegisterSmoke}
                                    className="flex-1 h-12 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-100"
                                >
                                    등록하기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Modal: Congestion Registration Confirmation (Image 1 Style) */}
            {
                showCongestionReg && (
                    <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl p-6 text-center"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
                            <h3 className="text-xl font-black text-gray-800 mb-2">혼잡 상황 제보</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                현재 위치({currentAddress})를<br />
                                <span className="font-bold text-red-600">실시간 혼잡 지역</span>으로 제보할까요?<br />
                                모든 사용자에게 공유됩니다.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCongestionReg(false)}
                                    className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-600 font-bold"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => handleReportCongestion("혼잡")}
                                    className="flex-1 h-12 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-100 active:scale-95 transition-transform"
                                >
                                    제보하기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
}

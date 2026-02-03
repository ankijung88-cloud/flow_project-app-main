
import { useState, useEffect, useRef, useCallback } from 'react';
import * as turf from '@turf/turf';

// Types
export interface LatLng {
    lat: number;
    lng: number;
}

interface UseSmoothNavigationProps {
    currentGpsPos: LatLng | null;
    destination: LatLng;
    initialPath?: LatLng[]; // If we already have a path
}

interface UseSmoothNavigationReturn {
    displayPos: LatLng | null; // The position to show on map (interpolated/snapped)
    routePath: LatLng[];       // The full route path
    isOffRoute: boolean;
    heading: number;           // Bearing/Rotation
    debugInfo?: string;        // For visual debugging
}

const MIN_OFF_ROUTE_THRESHOLD = 30; // Minimum meters
const ANIMATION_DURATION_MS = 1000;
const LOOKAHEAD_SECONDS = 3; // Look ahead 3 seconds when rerouting
const OFF_ROUTE_DEBOUNCE_COUNT = 3; // Require 3 consecutive fails

export function useSmoothNavigation({
    currentGpsPos,
    destination,
    initialPath,
}: UseSmoothNavigationProps): UseSmoothNavigationReturn {
    const [routePath, setRoutePath] = useState<LatLng[]>(initialPath || []);
    const [displayPos, setDisplayPos] = useState<LatLng | null>(currentGpsPos);
    const [isOffRoute, setIsOffRoute] = useState(false);
    const [heading, setHeading] = useState(0);
    const [debugInfo, setDebugInfo] = useState("");

    // Animation Refs
    const animationRef = useRef<number>(undefined);
    const startTimeRef = useRef<number>(0);
    const startPosRef = useRef<LatLng | null>(null);
    const targetPosRef = useRef<LatLng | null>(null);
    const hasFetchedRef = useRef(false);

    // Speed Calculation Refs
    const prevGpsRef = useRef<LatLng | null>(null);
    const prevGpsTimeRef = useRef<number>(0);
    const currentSpeedRef = useRef<number>(0); // m/s
    const offRouteCounterRef = useRef<number>(0);

    // Helper: Convert LatLng to [lon, lat] for Turf
    const toTurfPoint = (pos: LatLng) => turf.point([pos.lng, pos.lat]);

    // 1. Fetch OSRM Route
    // supports 'projectedStart' for lookahead
    const fetchRoute = useCallback(async (start: LatLng, end: LatLng, isReroute = false) => {
        try {
            if (start.lat === 0 && start.lng === 0) return;
            if (end.lat === 0 && end.lng === 0) return;

            // Lookahead Logic: If moving fast, project start point forward
            let requestStart = start;
            if (isReroute && currentSpeedRef.current > 2) {
                // Moving > 2m/s (~7km/h)
                const bearing = heading; // Use current heading
                const distance = currentSpeedRef.current * LOOKAHEAD_SECONDS; // projected meters
                const pt = toTurfPoint(start);
                const projected = turf.destination(pt, distance / 1000, bearing); // distance in km
                const coords = projected.geometry.coordinates;
                requestStart = { lat: coords[1], lng: coords[0] };
                console.log(`🚀 Lookahead Reroute! Speed: ${currentSpeedRef.current.toFixed(1)}m/s. Jumping ${distance.toFixed(0)}m ahead.`);
            }

            console.log("Fetching OSRM route...", requestStart);

            // Using public OSRM demo server - REPLACE with your own if needed
            // Note: OSRM uses [lon, lat]
            const url = `https://router.project-osrm.org/route/v1/foot/${requestStart.lng},${requestStart.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates;
                // Convert [lon, lat] to {lat, lng}
                let path = coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));

                // Approach Path Logic:
                // If the OSRM start point is far from the REAL User GPS (or projected start),
                // we must CONNECT them to avoid immediate off-route.
                if (path.length > 0) {
                    const snapStart = path[0];
                    const distToSnap = turf.distance(toTurfPoint(start), toTurfPoint(snapStart), { units: 'meters' });

                    // If snap is far (e.g. > 10m), inject linear segment
                    // Note: 'start' here is the REAL USER POS (or projected), 'snapStart' is ROUGH ROAD
                    if (distToSnap > 10) {
                        console.log(`🔗 Connecting Approach Path (${distToSnap.toFixed(1)}m gap)`);
                        path.unshift(start); // Prepend the request start point
                    }
                }

                setRoutePath(path);
                setIsOffRoute(false);
                offRouteCounterRef.current = 0; // Reset counter
            }
        } catch (error) {
            console.error("OSRM Fetch Error:", error);
        }
    }, [heading]);

    // Track previous destination to detect changes
    const prevDestRef = useRef<LatLng | null>(null);

    // Sync state with prop if initialPath changes (e.g. parent search completes)
    useEffect(() => {
        if (initialPath && initialPath.length > 0) {
            setRoutePath(initialPath);
            // If we have an initial path, assume we don't need to fetch immediately
            hasFetchedRef.current = true;
        }
    }, [initialPath]);

    // Initial Route Fetch & Refetch on Destination Change
    useEffect(() => {
        const isValidDest = destination && (destination.lat !== 0 || destination.lng !== 0);
        if (!isValidDest) return;

        // Check if destination changed physically
        const destChanged = !prevDestRef.current ||
            (Math.abs(prevDestRef.current.lat - destination.lat) > 0.0001 ||
                Math.abs(prevDestRef.current.lng - destination.lng) > 0.0001);

        if (destChanged) {
            hasFetchedRef.current = false; // Reset fetch status
            prevDestRef.current = destination;
        }

        if (currentGpsPos && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchRoute(currentGpsPos, destination);
        }
    }, [destination, currentGpsPos]);

    // 2. Map Matching & Off-route Detection (When GPS updates)
    useEffect(() => {
        if (!currentGpsPos || routePath.length === 0) return;

        const now = performance.now();

        // Calculate Speed
        if (prevGpsRef.current && prevGpsTimeRef.current > 0) {
            const dt = (now - prevGpsTimeRef.current) / 1000; // seconds
            if (dt > 0) {
                const movedDist = turf.distance(toTurfPoint(prevGpsRef.current), toTurfPoint(currentGpsPos), { units: 'meters' });
                const rawSpeed = movedDist / dt; // m/s

                // Simple Low-pass filter for speed
                currentSpeedRef.current = (currentSpeedRef.current * 0.7) + (rawSpeed * 0.3);
            }
        }
        prevGpsRef.current = currentGpsPos;
        prevGpsTimeRef.current = now;


        // Convert route to Turf LineString
        const lineString = turf.lineString(routePath.map(p => [p.lng, p.lat]));
        const pt = toTurfPoint(currentGpsPos);

        // Snap to line
        const snapped = turf.nearestPointOnLine(lineString, pt);
        const snappedCoords = snapped.geometry.coordinates;
        const snappedLatLng = { lat: snappedCoords[1], lng: snappedCoords[0] };

        // Calculate distance
        const distance = turf.distance(pt, snapped, { units: 'meters' });

        // Dynamic Threshold Logic
        // Allow user to be off by (Speed * 3s) or 30m, whichever is larger.
        // e.g. 60km/h = 16.6m/s -> 50m threshold
        const dynamicThreshold = Math.max(MIN_OFF_ROUTE_THRESHOLD, currentSpeedRef.current * 3);

        setDebugInfo(`Dist: ${distance.toFixed(1)}m / Thr: ${dynamicThreshold.toFixed(1)}m / Spd: ${currentSpeedRef.current.toFixed(1)}m/s`);

        if (distance > dynamicThreshold) {
            offRouteCounterRef.current += 1;
            console.warn(`⚠️ Off-route Warning ${offRouteCounterRef.current}/${OFF_ROUTE_DEBOUNCE_COUNT}: ${distance.toFixed(1)}m > ${dynamicThreshold.toFixed(1)}m`);

            if (offRouteCounterRef.current >= OFF_ROUTE_DEBOUNCE_COUNT) {
                setIsOffRoute(true);
                console.log("🚨 CONFIRMED OFF-ROUTE -> Rerouting with Lookahead");

                // Trigger Re-routing with Lookahead
                fetchRoute(currentGpsPos, destination, true); // true = isReroute
                offRouteCounterRef.current = 0; // Reset

                // For now, jump to GPS pos to avoid weird snapping during re-route
                targetPosRef.current = currentGpsPos;
            } else {
                // Still counted as "on route" for display until confirmed
                targetPosRef.current = snappedLatLng;
            }
        } else {
            // Back on track / Normal
            if (offRouteCounterRef.current > 0) {
                console.log("✅ Recovered to route");
                offRouteCounterRef.current = 0;
            }
            setIsOffRoute(false);
            // Set new target for animation
            targetPosRef.current = snappedLatLng;
        }

        // Calculate Heading (Bearing) using turf
        if (displayPos) {
            // Calculate bearing from current display pos to target
            const bearing = turf.bearing(toTurfPoint(displayPos), toTurfPoint(targetPosRef.current!));
            setHeading(bearing);
        }

        // Start Animation
        startPosRef.current = displayPos || currentGpsPos; // Start from current display env
        startTimeRef.current = performance.now();

        // Cancel previous animation
        if (animationRef.current) cancelAnimationFrame(animationRef.current);

        const animate = (time: number) => {
            const elapsed = time - startTimeRef.current;
            const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

            if (startPosRef.current && targetPosRef.current) {
                // Interpolate
                const lat = startPosRef.current.lat + (targetPosRef.current.lat - startPosRef.current.lat) * progress;
                const lng = startPosRef.current.lng + (targetPosRef.current.lng - startPosRef.current.lng) * progress;

                setDisplayPos({ lat, lng });

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                }
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };

    }, [currentGpsPos]); // Runs whenever raw GPS updates (1Hz)

    return {
        displayPos,
        routePath,
        isOffRoute,
        heading,
        debugInfo
    };
}

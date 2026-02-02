
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
}

const OFF_ROUTE_THRESHOLD_METERS = 30;
const ANIMATION_DURATION_MS = 1000;

export function useSmoothNavigation({
    currentGpsPos,
    destination,
    initialPath,
}: UseSmoothNavigationProps): UseSmoothNavigationReturn {
    const [routePath, setRoutePath] = useState<LatLng[]>(initialPath || []);
    const [displayPos, setDisplayPos] = useState<LatLng | null>(currentGpsPos);
    const [isOffRoute, setIsOffRoute] = useState(false);
    const [heading, setHeading] = useState(0);

    // Animation Refs
    const animationRef = useRef<number>(undefined);
    const startTimeRef = useRef<number>(0);
    const startPosRef = useRef<LatLng | null>(null);
    const targetPosRef = useRef<LatLng | null>(null);
    const hasFetchedRef = useRef(false);

    // Helper: Convert LatLng to [lon, lat] for Turf
    const toTurfPoint = (pos: LatLng) => turf.point([pos.lng, pos.lat]);

    // 1. Fetch OSRM Route
    const fetchRoute = useCallback(async (start: LatLng, end: LatLng) => {
        try {
            console.log("Fetching OSRM route...");
            if (start.lat === 0 && start.lng === 0) return;
            if (end.lat === 0 && end.lng === 0) return;

            // Using public OSRM demo server - REPLACE with your own if needed
            // Note: OSRM uses [lon, lat]
            const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates;
                // Convert [lon, lat] to {lat, lng}
                const path = coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                setRoutePath(path);
                setIsOffRoute(false);
            }
        } catch (error) {
            console.error("OSRM Fetch Error:", error);
        }
    }, []);

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

        // Convert route to Turf LineString
        const lineString = turf.lineString(routePath.map(p => [p.lng, p.lat]));
        const pt = toTurfPoint(currentGpsPos);

        // Snap to line
        const snapped = turf.nearestPointOnLine(lineString, pt);
        const snappedCoords = snapped.geometry.coordinates;
        const snappedLatLng = { lat: snappedCoords[1], lng: snappedCoords[0] };

        // Calculate distance
        const distance = turf.distance(pt, snapped, { units: 'meters' });

        if (distance > OFF_ROUTE_THRESHOLD_METERS) {
            setIsOffRoute(true);
            console.log("Off route detected! Distance:", distance);
            // Trigger Re-routing
            fetchRoute(currentGpsPos, destination);
            // For now, jump to GPS pos to avoid weird snapping during re-route
            targetPosRef.current = currentGpsPos;
        } else {
            // Set new target for animation
            targetPosRef.current = snappedLatLng;
        }

        // Calculate Heading (Bearing) from previous display pos to new target
        if (displayPos) {
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
        heading
    };
}

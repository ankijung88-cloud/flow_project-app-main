/**
 * A* 알고리즘 경로 탐색 유틸리티
 *
 * A* (A-star) Algorithm: 시작점에서 목표점까지의 최단 경로를 찾는
 * 효율적인 그래프 탐색 알고리즘입니다. 실제 비용(g)과 추정 비용(h)을
 * 결합하여 최적의 경로를 계산합니다.
 *
 * 이 구현은 지도 위의 좌표 기반 경로 탐색에 최적화되어 있으며,
 * 흡연부스 위치를 장애물로 처리하여 회피 경로를 생성합니다.
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface Node {
  point: Point;
  g: number; // 시작점부터의 실제 비용
  h: number; // 목표점까지의 추정 비용 (Heuristic)
  f: number; // 총 비용 (g + h)
  parent: Node | null;
}

/**
 * Haversine 거리 계산
 *
 * 지구 곡면 위 두 지점 사이의 최단 거리를 계산합니다.
 *
 * @param {Point} p1 - 첫 번째 지점
 * @param {Point} p2 - 두 번째 지점
 * @returns {number} 거리 (미터)
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
    Math.cos((p2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Heuristic 함수 (추정 비용 계산)
 *
 * A* 알고리즘의 핵심 요소로, 현재 지점에서 목표까지의
 * 예상 비용을 계산합니다.
 *
 * @param {Point} current - 현재 지점
 * @param {Point} goal - 목표 지점
 * @returns {number} 추정 비용
 */
export function heuristic(current: Point, goal: Point): number {
  return calculateDistance(current, goal);
}

/**
 * 장애물(흡연부스) 근처 여부 확인
 *
 * 특정 지점이 흡연부스 반경 내에 있는지 확인합니다.
 *
 * @param {Point} point - 확인할 지점
 * @param {Point[]} obstacles - 장애물(흡연부스) 목록
 * @param {number} safeDistance - 안전 거리 (미터, 기본값: 50m)
 * @returns {boolean} 장애물 근처 여부
 */
export function isNearObstacle(
  point: Point,
  obstacles: Point[],
  safeDistance: number = 50
): boolean {
  return obstacles.some((obstacle) => {
    const distance = calculateDistance(point, obstacle);
    return distance < safeDistance;
  });
}

/**
 * 경로 상의 중간 지점 생성
 *
 * 두 지점 사이를 보간하여 부드러운 경로를 생성합니다.
 *
 * @param {Point} start - 시작 지점
 * @param {Point} end - 종료 지점
 * @param {number} steps - 중간 지점 개수
 * @returns {Point[]} 중간 지점 배열
 */
export function interpolatePoints(
  start: Point,
  end: Point,
  steps: number = 10
): Point[] {
  const points: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    points.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    });
  }

  return points;
}


import { searchTransitPath } from "../services/transitService";

// Transport Mode
export type TransportMode = "walking" | "cycling" | "transit" | "stroll";

export const getTransportSpeed = (mode: TransportMode): number => {
  switch (mode) {
    case "walking": return 67; // 4km/h = ~67m/min
    case "stroll": return 50;  // 3km/h = ~50m/min (Relaxed pace)
    case "cycling": return 250; // 15km/h = ~250m/min
    case "transit": return 600; // Placeholder for transit
    default: return 67;
  }
};

export const getDetourRadius = (mode: TransportMode): number => {
  switch (mode) {
    case "walking": return 0.003; // ~300m
    case "stroll": return 0.006;  // ~600m
    case "cycling": return 0.005; // ~500m
    case "transit": return 0.005;
    default: return 0.003;
  }
};



/**
 * OSRM API를 사용하여 길찾기 경로(도로 기반) 가져오기 (경유지 지원)
 */
/**
 * OSRM API를 사용하여 길찾기 경로(도로 기반) 가져오기 (경유지 지원)
 * Return structure changed to include steps
 */
export async function getRoadPath(points: Point[], mode: TransportMode = "walking"): Promise<{ path: Point[], steps: NavigationStep[] }> {
  try {
    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
    let profile = "walking";
    if (mode === "cycling") profile = "cycling";
    if (mode === "stroll" || mode === "transit") {
      profile = "walking"; // fallback or default for stroll
    }

    // Request steps=true, continue_straight=true, and radiuses for better snapped waypoints
    const rds = points.map(() => '100').join(';'); // Snap to road within 100m
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true&continue_straight=true&radiuses=${rds}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (mode === "cycling") {
        return getRoadPath(points, "walking");
      }
      throw new Error("OSRM API 호출 실패");
    }

    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const geometry = data.routes[0].geometry.coordinates;
      const path = geometry.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      // Map OSRM steps from ALL legs
      const rawSteps = data.routes[0].legs.flatMap((leg: any) => leg.steps || []);

      const steps: NavigationStep[] = rawSteps.map((s: any) => ({
        instruction: s.maneuver.type, // We will refine this display client-side or here
        maneuver: s.maneuver,
        distance: s.distance,
        name: s.name,
        location: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] }
      }));

      return { path, steps };
    }
    return { path: [], steps: [] };
  } catch (error) {
    console.error("Road path fetch error:", error);
    return { path: [], steps: [] };
  }
}

export type PathType = "RECOMMENDED" | "FASTEST" | "COMFORTABLE" | "STROLL" | "AVOID_SMOKE" | "AVOID_CONGESTION" | "AVOID_ALL";

export interface TransitStep {
  type: "walk" | "bus" | "subway";
  instruction: string;
  distance: number;
  time: number;
  line?: string;
  color?: string;
  startName?: string;
  endName?: string;
  stationCount?: number;
}

export interface NavigationStep {
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string; // left, right, slight right...
    location: [number, number];
  };
  distance: number;
  name: string;
  location: Point;
}

export interface PathResult {
  type: PathType;
  path: Point[];
  distance: number;
  time: number;
  score: number;
  mode?: TransportMode;
  tollFare?: number; // Toll fare in KRW
  transitInfo?: {
    line: string;
    color: string;
    type: "bus" | "subway";
  };
  transitSteps?: TransitStep[];
  navigationSteps?: NavigationStep[];
  isFallback?: boolean;
  fare?: number;
  transferCount?: number;
  walkingDistance?: number;
  totalDistance?: number;
  name?: string; // For park/trail names
  destPoint?: Point; // For jumping to a specific destination
}

/**
 * 다중 경로 탐색 (3가지 옵션) - 도로 밀착형 회피 적용
 */
export async function findMultiplePaths(
  start: Point,
  goal: Point,
  obstacles: Point[],
  congestionZones: { lat: number; lng: number; radius: number, level: string }[],
  mode: TransportMode = "walking"
): Promise<PathResult[]> {

  // TRANSIT MODE: Use ODsay API
  if (mode === "transit") {
    const transitRoutes = await searchTransitPath(start.lng, start.lat, goal.lng, goal.lat);

    if (transitRoutes && transitRoutes.length > 0) {
      // Map ODsay results to PathResult
      const results: PathResult[] = transitRoutes.map((route, idx) => {
        let type: PathType = "RECOMMENDED";
        if (idx === 1) type = "FASTEST";
        if (idx === 2) type = "COMFORTABLE";

        // Determine main line info for "transitInfo"
        const mainStep = route.transitSteps?.find((s: any) => s.type !== 'walk');
        const transitInfo = mainStep ? {
          line: mainStep.line,
          color: mainStep.color,
          type: mainStep.type
        } : undefined;

        return {
          type,
          path: route.path || [], // Geometry
          distance: route.transitSteps?.reduce((acc: number, s: any) => acc + (s.distance || 0), 0) || 0,
          time: route.totalTime || 0,
          score: 100 - (idx * 5),
          mode: "transit",
          transitInfo,
          transitSteps: route.transitSteps || [],
          fare: route.payment,
          transferCount: route.transferCount,
          walkingDistance: route.walkingDistance,
          totalDistance: route.totalDistance
        };
      });

      // Fill up to 3 results if needed
      while (results.length < 3 && results.length > 0) {
        // Clone the first one or create dummy
        const clone = { ...results[0] };
        if (results.length === 1) clone.type = "FASTEST";
        else clone.type = "COMFORTABLE";
        results.push(clone);
      }

      if (results.length > 0) return results.slice(0, 3);
    }

    // Fallback: If transit failed or returned nothing, log and fallback to walking.
    console.warn("No transit paths found (Short distance or API error). Falling back to walking mode...");
    // Recursively call with 'walking' mode
    const fallbackResults = await findMultiplePaths(start, goal, obstacles, congestionZones, "walking");
    return fallbackResults.map(r => ({ ...r, isFallback: true }));
    // If no transit route, fall through to walking/mock?
    // Or return empty to signal "No Transit"? 
    // OSRM fallback below will return walking path.
  }

  // NON-TRANSIT (Walking, Cycling, Stroll)
  // NON-TRANSIT (Walking, Cycling, Stroll)
  // 1. 최단 경로 (Fastest): 경유지 없이 바로 검색
  const fastestResult = await getRoadPath([start, goal], mode);
  const fastestPath = fastestResult.path;
  const fastestSteps = fastestResult.steps;

  // 실패 시 직선 경로 폴백 (어쩔 수 없음)
  const safeFastest = fastestPath.length > 0 ? fastestPath : interpolatePoints(start, goal, 20);

  // 쾌적 경로 (Comfortable): 혼잡지역/장애물 회피를 위한 경유지 계산
  const radius = mode === "cycling" ? 100 : 60;

  const detourPoint = findDetourWaypoint(safeFastest, obstacles, congestionZones, radius);

  let comfortablePath: Point[];
  let comfortableSteps: NavigationStep[] = [];

  if (detourPoint) {
    // 경유지를 포함하여 재검색 (Start -> Detour -> Goal)
    const detouredResult = await getRoadPath([start, detourPoint, goal], mode);
    comfortablePath = detouredResult.path;
    comfortableSteps = detouredResult.steps;

    if (comfortablePath.length === 0) {
      comfortablePath = [...safeFastest];
      comfortableSteps = fastestSteps;
    }
  } else {
    comfortablePath = [...safeFastest];
    comfortableSteps = fastestSteps;
  }

  // 3. 추천 경로 (Recommended): 가장 효율적인 길 (FASTEST와 COMFORTABLE의 중간 또는 별도 최적화)
  const recommendedPath = [...fastestPath];
  const recommendedSteps = fastestSteps;

  // Force avoidance routes for walking and stroll modes
  const isAvoidanceMode = mode === "walking" || mode === "stroll";

  const results = isAvoidanceMode ? [] : [
    createPathResult("RECOMMENDED", recommendedPath, mode, recommendedSteps),
    createPathResult("FASTEST", safeFastest, mode, fastestSteps),
    createPathResult("COMFORTABLE", comfortablePath, mode, comfortableSteps)
  ];

  // AVOIDANCE LOGIC: Generate specialized avoidance routes for stroll and walking
  if (isAvoidanceMode) {
    // 1. Avoid Smoke
    const smokeWay = findDetourWaypoint(safeFastest, obstacles, [], 100);
    const smokePath = smokeWay ? (await getRoadPath([start, smokeWay, goal], mode)).path : safeFastest;

    // 2. Avoid Congestion
    const congestionWay = findDetourWaypoint(safeFastest, [], congestionZones, 150);
    const congestionPath = congestionWay ? (await getRoadPath([start, congestionWay, goal], mode)).path : safeFastest;

    // 3. Avoid Both
    const allWay = findDetourWaypoint(safeFastest, obstacles, congestionZones, 150);
    const allPath = allWay ? (await getRoadPath([start, allWay, goal], mode)).path : safeFastest;

    return [
      createPathResult("AVOID_SMOKE", smokePath.length > 0 ? smokePath : safeFastest, mode, recommendedSteps),
      createPathResult("AVOID_CONGESTION", congestionPath.length > 0 ? congestionPath : safeFastest, mode, recommendedSteps),
      createPathResult("AVOID_ALL", allPath.length > 0 ? allPath : safeFastest, mode, recommendedSteps)
    ];
  }

  return results;
}


/**
 * 경로 상의 충돌을 분석하여 우회해야 할 Waypoint(경유지) 하나를 반환
 */
function findDetourWaypoint(
  path: Point[],
  obstacles: Point[],
  congestionZones: { lat: number; lng: number; radius: number, level: string }[],
  detectionRadius: number
): Point | null {
  // 경로 샘플링
  const checkStep = 5;

  for (let i = 0; i < path.length; i += checkStep) {
    const pt = path[i];

    // Check obstacles (Smoke)
    const smokeHit = obstacles.find(obs => calculateDistance(pt, obs) < detectionRadius);
    if (smokeHit) {
      return { lat: smokeHit.lat + 0.003, lng: smokeHit.lng + 0.003 };
    }

    // Check congestion
    const congestionHit = congestionZones.find(zone => calculateDistance(pt, zone) < (detectionRadius + (zone.radius || 0)));
    if (congestionHit) {
      return { lat: congestionHit.lat + 0.003, lng: congestionHit.lng + 0.003 };
    }
  }
  return null;
}

// Average speeds in meters per minute
const SPEED_WALKING = 67; // approx 4km/h
const SPEED_CYCLING = 250; // approx 15km/h
const SPEED_TRANSIT_AVG = 500; // approx 30km/h (including stops)

function createPathResult(type: PathType, path: Point[], mode: TransportMode, navigationSteps: NavigationStep[] = [], tollFare?: number): PathResult {
  const distance = calculatePathDistance(path);

  let time = 0;
  let transitInfo = undefined;
  let transitSteps: TransitStep[] = [];

  if (mode === "transit") {
    if (distance < 1000) {
      time = Math.ceil(distance / SPEED_WALKING);
      transitSteps.push({
        type: "walk",
        instruction: "도보로 이동",
        distance: distance,
        time: time
      });
    } else {
      const walkingDist = 600;
      const transitDist = Math.max(0, distance - walkingDist);

      // 1. Walk to Station
      const walkToTime = Math.ceil(300 / SPEED_WALKING);
      transitSteps.push({
        type: "walk",
        instruction: "정류장까지 걷기",
        distance: 300,
        time: walkToTime
      });

      // 2. Ride Transit
      let lineName = "143번";
      let lineColor = "#356DE8";
      let rideType: "bus" | "subway" = "bus";

      if (type === "RECOMMENDED") {
        lineName = "2호선";
        lineColor = "#3CB44A";
        rideType = "subway";
      } else if (type === "COMFORTABLE") {
        lineName = "신분당선";
        lineColor = "#D31145";
        rideType = "subway";
      }

      const rideTime = Math.ceil(transitDist / SPEED_TRANSIT_AVG) + 5;
      transitSteps.push({
        type: rideType,
        instruction: `${lineName} 탑승`,
        distance: transitDist,
        time: rideTime,
        line: lineName,
        color: lineColor,
        startName: "출발지",
        endName: "목적지"
      });

      // 3. Walk to Dest
      const walkFromTime = Math.ceil(300 / SPEED_WALKING);
      transitSteps.push({
        type: "walk",
        instruction: "목적지까지 걷기",
        distance: 300,
        time: walkFromTime
      });

      time = transitSteps.reduce((acc, s) => acc + s.time, 0);
      transitInfo = { line: lineName, color: lineColor, type: rideType };
    }
  } else {
    let speed = SPEED_WALKING;
    if (mode === "cycling") speed = SPEED_CYCLING;

    time = Math.ceil(distance / speed);
  }

  return {
    type,
    path,
    distance,
    time,
    score: type === "COMFORTABLE" ? 95 : type === "RECOMMENDED" ? 90 : 80,
    mode,
    tollFare, // Add toll fare
    transitInfo,
    transitSteps,
    navigationSteps
  };
}

// Unused functions removed for clean build
// pathEquals, applyAvoidance, createDetour were here.

/**
 * 간소화된 A* 경로 탐색 알고리즘 (도로 기반 + 회피) - Legacy Support
 */
export async function findPath(
  start: Point,
  goal: Point,
  obstacles: Point[]
): Promise<Point[]> {
  // Use empty array for congestionZones and default "walking"
  const results = await findMultiplePaths(start, goal, obstacles, [], "walking");
  // Ensure we return a path even if empty
  return results[0]?.path || [];
}

/**
 * 경로 거리 계산
 */
export function calculatePathDistance(path: Point[]): number {
  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += calculateDistance(path[i], path[i + 1]);
  }

  return totalDistance;
}



export interface TransitStop {
    lat: number;
    lng: number;
    name: string;
    lines: string[];
    type: "bus" | "subway";
    dist: number;
}

const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY || ""; // Generate from .env

export const getNearbyTransitStops = async (lat: number, lng: number): Promise<TransitStop[]> => {
    // If no key is provided, return empty or throw error, but for now we'll log it.
    if (!ODSAY_API_KEY) {
        console.warn("ODsay API Key is missing. Please add VITE_ODSAY_API_KEY to your .env file.");
        return [];
    }

    try {
        // ODsay "Point Search" API (Search transit stops within radius)
        // https://lab.odsay.com/guide/release?platform=web#api_pointSearch
        const radius = 500; // 500m
        const url = `https://api.odsay.com/v1/api/pointSearch?lang=0&x=${lng}&y=${lat}&radius=${radius}&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.result && data.result.lane) {
            // Aggregate data
            // ODsay returns a list of stations. Each station has 'lane' (lines).
            // We need to group roughly or just map them.

            // However, the structure is: data.result.lane is NOT the structure. 
            // Correct Structure for 'pointSearch':
            // data.result.station = [ { stationName, x, y, stationClass (1: Bus, 2: Subway), laneName, ... } ]

            // Actually let's verify ODsay PointSearch response structure.
            // result: { count: N, station: [ { stationName: "Gangnam", x: 127.., y: 37.., stationClass: 2, laneName: "Line 2", ... } ] }

            const rawStations = data.result.station;

            return rawStations.map((st: any) => ({
                lat: parseFloat(st.y),
                lng: parseFloat(st.x),
                name: st.stationName,
                // LaneName can be "2호선" or "143:402" (colon separated if multiple? No, usually one entry per line per station in some APIs, or aggregated).
                // In PointSearch, it usually returns one entry per station ID. 
                // But ODsay might return the station multiple times if it has multiple lines? 
                // Actually 'laneName' is string.
                lines: st.laneName ? st.laneName.split(':') : [],
                type: st.stationClass === 2 ? "subway" : "bus",
                dist: 0 // We can calc distance if needed, or use what ODsay gives if any
            }));
        }

        return [];

    } catch (error) {
        console.error("Failed to fetch transit stops:", error);
        return [];
    }
};

export interface TransitRouteResult {
    totalTime: number; // minutes
    payment: number; // won
    transitSteps: any[]; // We will map this to our app's TransitStep in pathfinding.ts or here.
    // Actually keeping it raw or semi-processed is better.
    path: { lat: number, lng: number }[]; // Approximate geometry
    transferCount?: number;
    totalDistance?: number;
    walkingDistance?: number;
}

export const searchTransitPath = async (sx: number, sy: number, ex: number, ey: number): Promise<TransitRouteResult[]> => {
    if (!ODSAY_API_KEY) return [];

    try {
        // searchPubTransPathT: Public Transit Path Search
        // ODsay requires String coordinates? No, can be number, but safer as string.
        const url = `https://api.odsay.com/v1/api/searchPubTransPathT?lang=0&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`;
        console.log("ODsay API Request URL:", url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        console.log("ODsay API Response:", data);

        if (data.error) {
            console.warn(`ODsay API Error: [${data.error.code}] ${data.error.msg}`);
        }

        if (data.result && data.result.path) {
            // ODsay returns multiple paths (Best, 2nd best...)
            // We map top 3
            return data.result.path.slice(0, 3).map((p: any) => {
                const info = p.info;
                const subPaths = p.subPath;

                // Construct Steps
                const steps = subPaths.map((sub: any) => {
                    if (sub.trafficType === 3) { // Walk
                        return {
                            type: "walk",
                            instruction: "도보 이동",
                            distance: sub.distance,
                            time: sub.sectionTime
                        };
                    } else if (sub.trafficType === 1) { // Subway
                        const lane = sub.lane[0];
                        return {
                            type: "subway",
                            instruction: `${lane.name} 탑승`,
                            distance: sub.distance,
                            time: sub.sectionTime,
                            line: lane.name,
                            color: lane.subwayCode ? getSubwayColor(lane.subwayCode) : "#555555",
                            startName: sub.startName,
                            endName: sub.endName,
                            stationCount: sub.stationCount
                        };
                    } else if (sub.trafficType === 2) { // Bus
                        const lane = sub.lane[0];
                        return {
                            type: "bus",
                            instruction: `${lane.busNo} 탑승`,
                            distance: sub.distance,
                            time: sub.sectionTime,
                            line: lane.busNo,
                            color: getBusColor(lane.type),
                            startName: sub.startName,
                            endName: sub.endName,
                            stationCount: sub.stationCount
                        };
                    }
                    return null;
                }).filter((s: any) => s !== null);

                // Approximate geometry from stations in subpath
                // ODsay doesn't give full polyline in this API unless we call loadLane.
                // We will construct path from start -> stations -> end.
                let pathPoints: { lat: number, lng: number }[] = [];
                // Start
                pathPoints.push({ lat: sy, lng: sx });

                subPaths.forEach((sub: any) => {
                    if (sub.passStopList && sub.passStopList.stations) {
                        sub.passStopList.stations.forEach((st: any) => {
                            pathPoints.push({ lat: parseFloat(st.y), lng: parseFloat(st.x) });
                        });
                    }
                });

                // End
                pathPoints.push({ lat: ey, lng: ex });

                return {
                    totalTime: info.totalTime,
                    payment: info.payment,
                    transitSteps: steps,
                    path: pathPoints,
                    transferCount: (info.busTransitCount || 0) + (info.subwayTransitCount || 0) - 1,
                    totalDistance: info.totalDistance,
                    walkingDistance: info.walkingDistance
                };
            });
        }
        return [];
    } catch (err) {
        console.error("Transit Search Error:", err);
        return [];
    }
}

// Helpers for Colors
function getSubwayColor(code: number): string {
    // ODsay Subway Codes: 1=1호선, 2=2호선 ...
    const colors: Record<number, string> = {
        1: "#0052A4", 2: "#3CB44A", 3: "#EF7C1C", 4: "#00A5DE",
        5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
        100: "#F5A200", // Bundang
        101: "#0090D2", // Airport
        104: "#81A914", // Gyeongui-Jungang
        109: "#D4003B", // Shinbundang
    };
    return colors[code] || "#555555";
}

function getBusColor(type: number): string {
    // ODsay Bus Types: 1=General, 2=Blue(Trunk), 3=Green(Village), 4=Red(Express), etc.
    // 11=Blue(Seoul), 12=Green, 6=Red, etc. 
    // Simplified mapping
    switch (type) {
        case 1: case 11: return "#375899"; // Blue Bus
        case 2: case 12: return "#3D8E33"; // Green Bus
        case 3: return "#80C900"; // Village Bus (Green-ish)
        case 4: case 6: case 14: return "#D62915"; // Red Bus
        case 5: return "#FFC600"; // Airport/Yellow
        default: return "#375899";
    }
}

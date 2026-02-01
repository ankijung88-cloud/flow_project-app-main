import { firestore } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';

export interface HourlyData {
    hour: number;
    population: number;
    level: "매우혼잡" | "혼잡" | "보통" | "여유";
}

export interface CongestionLocation {
    name: string;
    lat: number;
    lng: number;
    currentPopulation: number;
    currentLevel: "매우혼잡" | "혼잡" | "보통" | "여유";
    radius: number; // Influence radius in meters
}

const majorLocations = [
    { name: "강남역", lat: 37.4979, lng: 127.0276 },
    { name: "홍대입구역", lat: 37.5572, lng: 126.9247 },
    { name: "명동", lat: 37.5637, lng: 126.9838 },
    { name: "잠실역", lat: 37.5145, lng: 127.0595 },
    { name: "서울역", lat: 37.5547, lng: 126.9707 },
    { name: "신촌역", lat: 37.5219, lng: 126.9245 },
    { name: "건대입구역", lat: 37.5406, lng: 127.0693 },
    { name: "이태원역", lat: 37.5344, lng: 126.9944 },
    // Add more locally relevant points if needed for testing
];

export const getCongestionData = async (): Promise<CongestionLocation[]> => {
    // 1. Base/Mock data
    const currentHour = new Date().getHours();
    const mockData: CongestionLocation[] = majorLocations.map(loc => {
        let basePopulation = 1000;
        let congestionPercent = 0;

        if (
            (currentHour >= 8 && currentHour < 10) ||
            (currentHour >= 12 && currentHour < 13) ||
            (currentHour >= 18 && currentHour < 20)
        ) {
            congestionPercent = 80 + Math.random() * 30;
            basePopulation = Math.floor((congestionPercent / 100) * 5000);
        } else {
            congestionPercent = 20 + Math.random() * 30;
            basePopulation = Math.floor((congestionPercent / 100) * 5000);
        }

        const variation = (Math.random() - 0.5) * 0.2;
        const population = Math.floor(basePopulation * (1 + variation));

        let level: "매우혼잡" | "혼잡" | "보통" | "여유";
        let radius = 100;

        if (congestionPercent > 100) { level = "매우혼잡"; radius = 300; }
        else if (congestionPercent >= 76) { level = "혼잡"; radius = 200; }
        else if (congestionPercent >= 51) { level = "보통"; radius = 150; }
        else { level = "여유"; radius = 100; }

        return {
            name: loc.name,
            lat: loc.lat,
            lng: loc.lng,
            currentPopulation: population,
            currentLevel: level,
            radius
        };
    });

    // 2. Global reports from Firestore (last 2 hours)
    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const reportsCol = collection(firestore, 'congestion_reports');
        const q = query(
            reportsCol,
            where('createdAt', '>=', Timestamp.fromDate(twoHoursAgo)),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const snapshot = await getDocs(q);
        const reportedData: CongestionLocation[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                name: data.name + " (제보)",
                lat: data.lat,
                lng: data.lng,
                currentPopulation: 0, // Not applicable for reports
                currentLevel: data.level,
                radius: data.level === "매우혼잡" ? 300 : data.level === "혼잡" ? 200 : 150
            };
        });

        return [...mockData, ...reportedData];
    } catch (error) {
        console.error('[CongestionService] Error fetching global reports:', error);
        return mockData;
    }
};

/**
 * 실시간 혼잡도 제보 등록
 */
export const reportCongestion = async (report: { name: string; lat: number; lng: number; level: string }): Promise<void> => {
    try {
        const reportsCol = collection(firestore, 'congestion_reports');
        await addDoc(reportsCol, {
            ...report,
            createdAt: Timestamp.now(),
            userId: 'anonymous'
        });
        console.log('[CongestionService] Report saved globally');
    } catch (error) {
        console.error('[CongestionService] Error saving report:', error);
    }
};

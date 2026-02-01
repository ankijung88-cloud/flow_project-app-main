import { db, type SavedRoute } from './db';
import type { PathResult } from '../utils/pathfinding';
import { firestore } from './firebase';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    limit
} from 'firebase/firestore';

/**
 * 사용자 데이터 및 활동 관리 서비스
 */

/**
 * "나의 경로" 저장
 */
export async function saveRoute(name: string, pathResult: PathResult): Promise<number> {
    const newRoute: SavedRoute = {
        name,
        type: pathResult.type,
        mode: pathResult.mode || 'walking',
        distance: pathResult.distance,
        time: pathResult.time,
        startPoint: pathResult.path[0],
        endPoint: pathResult.path[pathResult.path.length - 1],
        path: pathResult.path,
        createdAt: Date.now()
    };
    return await db.savedRoutes.add(newRoute);
}

/**
 * "나의 경로" 목록 가져오기
 */
export async function getSavedRoutes(): Promise<SavedRoute[]> {
    return await db.savedRoutes.orderBy('createdAt').reverse().toArray();
}

/**
 * "나의 경로" 삭제
 */
export async function deleteSavedRoute(id: number): Promise<void> {
    await db.savedRoutes.delete(id);
}

/**
 * 혼잡도 제보 (Real-time Firebase Sharing)
 */
export interface UserCongestionReport {
    id?: string;
    lat: number;
    lng: number;
    level: "매우혼잡" | "혼잡" | "보통" | "여유";
    timestamp: any;
}

export async function reportCongestion(lat: number, lng: number, level: "매우혼잡" | "혼잡"): Promise<void> {
    try {
        const reportsRef = collection(firestore, 'shared_congestion_reports');
        await addDoc(reportsRef, {
            lat,
            lng,
            level,
            timestamp: serverTimestamp()
        });
        console.log(`[Firebase] Congestion reported at ${lat}, ${lng}`);
    } catch (error) {
        console.error('[Firebase] Error reporting congestion:', error);
        // Fallback to local
        const reports = JSON.parse(localStorage.getItem('user_congestion_reports') || '[]');
        reports.push({ lat, lng, level, timestamp: Date.now() });
        localStorage.setItem('user_congestion_reports', JSON.stringify(reports));
    }
}

/**
 * 흡연구역 등록 (Global Firebase Sharing)
 */
export async function shareSmokingBooth(booth: { name: string, latitude: number, longitude: number, city: string, address: string }) {
    try {
        const boothsRef = collection(firestore, 'shared_smoking_booths');
        await addDoc(boothsRef, {
            ...booth,
            type: 'user',
            createdAt: serverTimestamp()
        });
        console.log(`[Firebase] Smoking booth shared: ${booth.name}`);
    } catch (error) {
        console.error('[Firebase] Error sharing smoking booth:', error);
    }
}

/**
 * 실시간 데이터 리스너 설정
 */
export function listenToGlobalChanges(callback: (data: { smokingBooths: any[], congestionReports: any[] }) => void) {
    const smokingQuery = query(collection(firestore, 'shared_smoking_booths'), orderBy('createdAt', 'desc'));
    const congestionQuery = query(collection(firestore, 'shared_congestion_reports'), orderBy('timestamp', 'desc'), limit(50));

    let sharedBooths: any[] = [];
    let sharedReports: any[] = [];

    const unsubscribeSmoking = onSnapshot(smokingQuery, (snapshot) => {
        sharedBooths = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback({ smokingBooths: sharedBooths, congestionReports: sharedReports });
    }, (err) => console.error("[Firebase] Smoking listener error:", err));

    const unsubscribeCongestion = onSnapshot(congestionQuery, (snapshot) => {
        sharedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback({ smokingBooths: sharedBooths, congestionReports: sharedReports });
    }, (err) => console.error("[Firebase] Congestion listener error:", err));

    return () => {
        unsubscribeSmoking();
        unsubscribeCongestion();
    };
}

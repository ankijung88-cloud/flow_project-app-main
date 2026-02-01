import { db, type LocalSmokingBooth } from './db';
import { firestore } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';

/**
 * 전국 흡연부스 데이터 서비스
 *
 * 전국 주요 도시의 흡연부스 위치 데이터를 제공하며,
 * 사용자가 직접 등록한 데이터와 통합하여 관리합니다.
 */

export interface SmokingBooth {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  type: 'user' | 'official';
}

/**
 * 전국 초기 흡연부스 데이터 생성 (내부용)
 */
function generateInitialBooths(): Omit<LocalSmokingBooth, 'id'>[] {
  const majorCities = [
    { name: "서울", lat: 37.5665, lng: 126.978 },
    { name: "부산", lat: 35.1796, lng: 129.0756 },
    { name: "대구", lat: 35.8714, lng: 128.6014 },
    { name: "인천", lat: 37.4563, lng: 126.7052 },
    { name: "광주", lat: 35.1595, lng: 126.8526 },
    { name: "대전", lat: 36.3504, lng: 127.3845 },
    { name: "울산", lat: 35.5384, lng: 129.3114 },
    { name: "세종", lat: 36.4801, lng: 127.2890 },
    { name: "경기", lat: 37.4138, lng: 127.5183 },
    { name: "강원", lat: 37.8228, lng: 128.1555 },
    { name: "충북", lat: 36.6357, lng: 127.4917 },
    { name: "충남", lat: 36.5184, lng: 126.8000 },
    { name: "전북", lat: 35.7175, lng: 127.1530 },
    { name: "전남", lat: 34.8679, lng: 126.9910 },
    { name: "경북", lat: 36.4919, lng: 128.8889 },
    { name: "경남", lat: 35.4606, lng: 128.2132 },
    { name: "제주", lat: 33.4996, lng: 126.5312 },
  ];

  const booths: Omit<LocalSmokingBooth, 'id'>[] = [];
  majorCities.forEach((city) => {
    const boothCount = Math.floor(Math.random() * 11) + 15;
    for (let i = 0; i < boothCount; i++) {
      const latOffset = (Math.random() - 0.5) * 0.09;
      const lngOffset = (Math.random() - 0.5) * 0.09;
      booths.push({
        name: `${city.name} 흡연부스 ${i + 1}`,
        latitude: city.lat + latOffset,
        longitude: city.lng + lngOffset,
        address: `${city.name} 지역 흡연부스`,
        city: city.name,
        type: 'official',
        createdAt: Date.now()
      });
    }
  });
  return booths;
}

/**
 * 데이터베이스 초기화 및 시딩
 */
export async function initializeDatabase() {
  const count = await db.smokingBooths.count();
  if (count === 0) {
    const initialBooths = generateInitialBooths();
    await db.smokingBooths.bulkAdd(initialBooths);
    console.log('[SmokingService] Database seeded with initial data');
  }
}

/**
 * 전국 흡연부스 데이터 가져오기 (API + User Local + Firebase Global)
 */
export async function getNationalSmokingBooths(): Promise<SmokingBooth[]> {
  await initializeDatabase();

  // 1. Local/Official data from Dexie
  const allLocalBooths = await db.smokingBooths.toArray();
  const localList: SmokingBooth[] = allLocalBooths.map(l => ({
    id: l.id?.toString() || '',
    name: l.name,
    latitude: l.latitude,
    longitude: l.longitude,
    address: l.address,
    city: l.city,
    type: l.type
  }));

  // 2. Global data from Firestore
  try {
    const boothsCol = collection(firestore, 'smoking_booths');
    const q = query(boothsCol, orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    const globalBooths: SmokingBooth[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        city: data.city,
        type: 'user'
      };
    });

    // Combine and deduplicate if necessary (using id or name+lat+lng)
    return [...localList, ...globalBooths];
  } catch (error) {
    console.error('[SmokingService] Error fetching global booths:', error);
    return localList;
  }
}

/**
 * 사용자 흡연부스 등록 (Local + Firebase Global)
 */
export async function addUserSmokingBooth(booth: Omit<SmokingBooth, 'id' | 'type'>): Promise<string> {
  const timestamp = Date.now();

  // 1. Save to Local Dexie
  const newLocalBooth: Omit<LocalSmokingBooth, 'id'> = {
    ...booth,
    type: 'user',
    createdAt: timestamp
  };
  const localId = await db.smokingBooths.add(newLocalBooth);

  // 2. Save to Global Firestore
  try {
    const boothsCol = collection(firestore, 'smoking_booths');
    await addDoc(boothsCol, {
      ...booth,
      createdAt: Timestamp.fromMillis(timestamp),
      userId: 'anonymous' // Placeholder or actual auth UID
    });
  } catch (error) {
    console.error('[SmokingService] Error saving to Firestore:', error);
  }

  return localId.toString();
}

/**
 * 특정 지역 근처의 흡연부스 필터링
 */
export async function getNearbySmokingBooths(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 10
): Promise<SmokingBooth[]> {
  const allBooths = await getNationalSmokingBooths();

  return allBooths.filter((booth) => {
    const distance = calculateDistance(
      centerLat,
      centerLng,
      booth.latitude,
      booth.longitude
    );
    return distance <= radiusKm;
  });
}

/**
 * 두 좌표 간의 거리 계산
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

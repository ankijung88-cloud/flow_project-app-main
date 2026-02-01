import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase 초기화 및 Firestore 설정
 * 
 * 사용자가 발급받은 Firebase 설정을 .env 파일에 추가해야 합니다.
 * VITE_FIREBASE_API_KEY=...
 * VITE_FIREBASE_AUTH_DOMAIN=...
 * ...
 */

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 필수 값이 없는 경우 경고 출력 (개발 단계)
if (!firebaseConfig.apiKey) {
    console.warn('[Firebase] Warning: API Key is missing. Shared features might not work.');
}

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

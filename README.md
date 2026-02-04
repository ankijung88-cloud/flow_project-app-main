# Flow Project App

**Flow Project App**은 걷기 운동과 경로 탐색을 결합한 PWA(Progressive Web App) 기반의 웹 애플리케이션입니다.
사용자에게 최적화된 걷기 코스를 추천하고, 길찾기 기능을 통해 안전하고 효율적인 운동 경험을 제공합니다.

## 📖 목차
1. [프로젝트 소개 (Description)](#-프로젝트-소개)
2. [시스템 아키텍처 및 워크플로우 (System Architecture)](#-시스템-아키텍처-및-워크플로우)
3. [기술 스택 (Tech Stack)](#-기술-스택)
   - [Frontend](#frontend)
   - [Backend & Server](#backend--server)
   - [Database & Infrastructure](#database--infrastructure)
4. [설치 및 실행 방법 (Installation)](#-설치-및-실행-방법)

---

## 📝 프로젝트 소개

이 프로젝트는 사용자가 자신의 위치를 기반으로 걷기 좋은 길을 찾거나, 목적지까지의 최적 경로를 안내받을 수 있도록 돕습니다.
PWA를 지원하여 모바일 환경에서도 네이티브 앱과 유사한 사용자 경험을 제공하며, 오프라인 상태에서도 일부 기능을 사용할 수 있도록 설계되었습니다.

### 주요 기능
*   **경로 탐색**: Naver Maps, Kakao Maps API를 활용한 정밀한 지도 및 경로 안내.
*   **대중교통 정보**: ODsay API를 연동하여 대중교통 경로 및 환승 정보 제공.
*   **운동 기록**: Dexie.js(IndexedDB)를 활용한 로컬 데이터베이스에 운동 기록 저장.
*   **커뮤니티/동기부여**: Firebase 기반의 사용자 인증 및 데이터 동기화.

---

## 🔄 시스템 아키텍처 및 워크플로우

다음 다이어그램은 사용자가 애플리케이션과 상호작용하는 흐름과 프론트엔드-백엔드-외부 API 간의 관계를 보여줍니다.

```mermaid
graph TD
    User[Users] --> |Access Web/PWA| Frontend[Frontend (React/Vite)]
    
    subgraph "Frontend Layer (Client)"
        Frontend --> |State Management| ContextAPI[React Context]
        Frontend --> |Local Storage| IndexedDB[(Dexie.js / IndexedDB)]
        Frontend --> |Routing| Router[React Router Dom]
    end

    subgraph "External Services (APIs)"
        Frontend --> |Map Display| NaverMap[Naver Maps API]
        Frontend --> |Location Search| KakaoMap[Kakao Maps API]
        Frontend --> |Transit Info| ODsay[ODsay Lab API]
    end

    subgraph "Backend & Infrastructure (Firebase)"
        Frontend --> |Auth Request| FirebaseAuth[Firebase Authentication]
        Frontend --> |Data Sync| Firestore[(Cloud Firestore)]
        Frontend --> |Asset Storage| Storage[(Firebase Storage)]
        Frontend --> |Server Logic| Functions[Cloud Functions (Node.js)]
    end
    
    Functions --> |External Data Process| Axios[Axios HTTP Client]
    
    subgraph "Deployment"
        GitHub[GitHub Repository] --> |CI/CD Action| GithubPages[GitHub Pages Deployment]
        GitHub --> |Hosting Control| ServerUtils[Node.js Server Utils]
    end
```

### 상세 상호작용
1.  **사용자 인증**: 사용자가 로그인을 요청하면 `Firebase Authentication`을 통해 인증 토큰을 발급받습니다.
2.  **지도 로딩**: 앱 실행 시 `Naver Maps API`를 호출하여 지도를 렌더링하고, `Kakao Maps API`를 통해 장소를 검색합니다.
3.  **데이터 저장**: 개인적인 운동 기록은 `Dexie.js`를 통해 브라우저의 `IndexedDB`에 로컬 저장되어 빠른 접근성을 보장합니다.
4.  **백엔드 로직**: 복잡한 연산이나 서버 사이드 처리가 필요한 경우 `Firebase Cloud Functions`를 호출하여 안전하게 처리합니다.

---

## 🛠 기술 스택

### Frontend
사용자 인터페이스와 경험을 담당하는 영역입니다.
*   **Core**: React 19, TypeScript
*   **Build Tool**: Vite 7
*   **Styling**: TailwindCSS 3.4, PostCSS
*   **UI Components**: Headless UI, Heroicons
*   **Motion/Animation**: Framer Motion
*   **Local Database**: Dexie.js (IndexedDB wrapper)
*   **PWA**: Vite Plugin PWA (Offline support, Installable)

### Backend & Server
서버 로직 및 API 통신을 담당합니다.
*   **Runtime**: Node.js 20
*   **Framework**: Firebase Functions (Serverless)
*   **Server Utilities**: Express (Local server & static serving utils)
*   **HTTP Client**: Axios

### Database & Infrastructure
데이터 저장 및 클라우드 인프라입니다.
*   **Platform**: Google Firebase
*   **Auth**: Firebase Authentication
*   **Database**: Cloud Firestore (NoSQL), Realtime Database
*   **Storage**: Firebase Storage
*   **Deployment**: GitHub Pages (Static Hosting)

---

## 🔐 서버 및 데이터베이스 정보 (Server Info)

본 프로젝트는 Serverless 아키텍처를 기반으로 하며, 주요 리소스는 Firebase에 호스팅됩니다.

### 1. Firebase Project Configuration
*   **Project ID**: `roadflow-42618`
*   **Auth Domain**: `roadflow-42618.firebaseapp.com`
*   **Storage Bucket**: `roadflow-42618.firebasestorage.app`
*   **Region**: `asia-northeast3` (Seoul) - *함수 배포 리전*

### 2. External API Keys (Environment Variables)
*보안을 위해 실제 키 값은 `.env` 파일에 저장되어 관리됩니다.*
*   `VITE_FIREBASE_*`: Firebase 연결 정보
*   `VITE_NAVER_CLIENT_ID`: 네이버 지도 연동
*   `VITE_KAKAO_APP_KEY`: 카카오 로컬 API 연동
*   `VITE_ODSAY_API_KEY`: 대중교통 길찾기 연동

---

## 🚀 설치 및 실행 방법

### 사전 요구사항
*   Node.js 20.x 이상
*   npm 패키지 매니저

### 로컬 개발 서버 실행
```bash
# 1. 저장소 클론
git clone https://github.com/ankijung88-cloud/flow_project-app-main.git

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env 파일 생성 및 키 입력)
cp .env.example .env

# 4. 개발 서버 시작
npm run dev
```

### 배포 (Build & Deploy)
```bash
# 프로덕션 빌드 생성
npm run build

# (옵션) 로컬 프리뷰
npm run preview
```

import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ServicePage from "./pages/ServicePage";
import SmokingBoothDetailPage from "./pages/SmokingBoothDetailPage";
import CrowdDetailPage from "./pages/CrowdDetailPage";
import IntroPage from "./pages/IntroPage";
import FullScreenMapPage from "./pages/FullScreenMapPage";

declare global {
  interface Window {
    naver: any;
    kakao: any;
    navermap_authFailure: () => void;
    sdkStatus: {
      naver: 'loading' | 'ready' | 'error';
      kakao: 'loading' | 'ready' | 'error';
    };
  }
}

export default function App() {
  useEffect(() => {
    // Performance Optimization: Force passive listeners for scroll-blocking events
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      let newOptions = options;
      if (['touchstart', 'touchmove', 'wheel', 'mousewheel'].includes(type)) {
        if (typeof options === 'boolean') {
          newOptions = { capture: options, passive: true };
        } else if (typeof options === 'object') {
          newOptions = { ...options, passive: options.passive !== undefined ? options.passive : true };
        } else {
          newOptions = { passive: true };
        }
      }
      return originalAddEventListener.call(this, type, listener, newOptions);
    };

    // Initialize SDK status
    window.sdkStatus = { naver: 'loading', kakao: 'loading' };

    // Global Auth Failure Handler for Naver Maps
    window.navermap_authFailure = () => {
      console.error("Naver Maps Authentication Failed. Please check your Client ID and Console settings.");
      window.sdkStatus.naver = 'error';
      // alert("네이버 지도 인증에 실패했습니다. 클라이언트 아이디 또는 콘솔 설정을 확인해주세요.");
    };

    // Global Naver Maps SDK Loader
    const naverScriptId = 'naver-map-script-v3';
    if (!document.getElementById(naverScriptId)) {
      const script = document.createElement('script');
      script.id = naverScriptId;
      const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || 'b7w24m0wm2';
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
      script.async = true;
      script.referrerPolicy = "origin";
      script.onload = () => {
        console.log("Naver Maps SDK Loaded");
        window.sdkStatus.naver = 'ready';
      };
      script.onerror = () => {
        console.error("Naver Maps SDK Load Failed");
        window.sdkStatus.naver = 'error';
      };
      document.head.appendChild(script);
    }

    // Global Kakao Maps SDK Loader
    const kakaoScriptId = 'kakao-map-script';
    if (!document.getElementById(kakaoScriptId)) {
      const script = document.createElement('script');
      script.id = kakaoScriptId;
      // Fixed appkey for search functionality
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=7eb77dd1772e545a47f6066b2de87d8f&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            console.log("Kakao Maps SDK Loaded");
            window.sdkStatus.kakao = 'ready';
          });
        }
      };
      script.onerror = () => {
        console.error("Kakao Maps SDK Load Failed");
        window.sdkStatus.kakao = 'error';
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/service" element={<ServicePage />} />
      <Route path="/smoking-booth" element={<SmokingBoothDetailPage />} />
      <Route path="/crowd" element={<CrowdDetailPage />} />
      <Route path="/navigation" element={<FullScreenMapPage />} />
    </Routes>
  );
}

import { useRef, useState } from "react";

export default function ServiceVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      } else if ((videoRef.current as any).webkitEnterFullscreen) {
        // iOS specific method for video elements
        (videoRef.current as any).webkitEnterFullscreen();
      }
    }
  };

  const handleContainerClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        // Mobile behavior: enter fullscreen on play
        if (window.innerWidth < 768) {
          handleFullScreen();
        }
      } else {
        videoRef.current.pause();
      }
    }
  };

  const onVideoStateChange = () => {
    // If paused or ended, try to exit fullscreen if active
    if (videoRef.current && (videoRef.current.paused || videoRef.current.ended)) {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => { });
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    }
  };


  return (
    <section className="w-full bg-transparent flex flex-col items-center justify-start transition-colors duration-500">
      <div className="w-full max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col items-center mb-16 gap-5 4xl:gap-10 5xl:gap-16 text-center">
          <h2 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl 3xl:text-7xl 4xl:text-8xl 5xl:text-9xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            서비스 소개
          </h2>
          <p className="text-base xs:text-lg md:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl text-gray-600 dark:text-gray-300 max-w-3xl 3xl:max-w-4xl 4xl:max-w-6xl 5xl:max-w-7xl text-center transition-colors duration-300">
            흡연부스를 회피하는 안전한 경로를 제공하는 혁신적인 네비게이션 서비스입니다.
          </p>
        </div>

        {/* Layout synchronized with CrowdContent */}
        <div className="flex flex-col lg:flex-row items-end justify-between gap-12 lg:gap-20">

          {/* Video Section (65%) - Matches CrowdContent video size */}
          <div className="lg:w-[65%] w-full">
            <div
              className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-purple-500/30 bg-black aspect-video group cursor-pointer"
              onClick={handleContainerClick}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                onPlay={() => {
                  setIsPlaying(true);
                }}
                onPause={() => {
                  setIsPlaying(false);
                  onVideoStateChange();
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  onVideoStateChange();
                }}
              >
                <source src={`${import.meta.env.BASE_URL}video/guideVD.mp4`} type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>

              {/* Play/Pause Button Overlay - Visible when paused OR on hover */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${!isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}>
                <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 shadow-2xl">
                  {isPlaying ? (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Features Section (35%) */}
          <div className="lg:w-[35%] w-full space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8 transition-colors duration-300">주요 기능</h3>

            {/* Feature 1 */}
            <div className="flex items-start gap-4 p-6 bg-white dark:bg-white/5 rounded-2xl shadow-lg border border-purple-100 dark:border-white/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                <span className="font-bold text-xl">✓</span>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">실시간 GPS 위치 추적</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  정확한 현재 위치를 기반으로 실시간 최적 경로를 제공합니다.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4 p-6 bg-white dark:bg-white/5 rounded-2xl shadow-lg border border-purple-100 dark:border-white/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                <span className="font-bold text-xl">✓</span>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">흡연부스 회피 경로</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  스마트 알고리즘이 쾌적하고 안전한 이동 경로를 생성합니다.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4 p-6 bg-white dark:bg-white/5 rounded-2xl shadow-lg border border-purple-100 dark:border-white/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                <span className="font-bold text-xl">✓</span>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">시각적 방향 안내</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  직관적인 인터페이스로 누구나 쉽게 길을 찾을 수 있습니다.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

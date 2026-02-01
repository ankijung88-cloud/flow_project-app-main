interface GuideProps {
  onWalkClick: () => void;
  onLocationServiceClick: () => void;
  onCongestionMonitoringClick: () => void;
  onWalkRecommendationClick: () => void;
  onRegionClick: (region: string) => void;
}

export default function Guide({ onWalkClick, onLocationServiceClick, onCongestionMonitoringClick, onWalkRecommendationClick, onRegionClick }: GuideProps) {
  return (
    <div className="relative w-full flex flex-col items-center justify-start py-20 bg-transparent transition-colors duration-500">
      {/* 배경 이미지 제거됨 (Glass Effect 적용) */}

      {/* 콘텐츠 */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 5xl:px-12">
        <div className="flex flex-col items-center text-center mb-16 gap-5 4xl:gap-10 5xl:gap-16">
          <h2 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl 3xl:text-7xl 4xl:text-8xl 5xl:text-9xl font-bold drop-shadow-2xl">
            서비스 가이드
          </h2>
          <p className="text-base xs:text-lg md:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl text-gray-700 dark:text-gray-200 drop-shadow-lg max-w-3xl 3xl:max-w-4xl 4xl:max-w-6xl 5xl:max-w-7xl text-center leading-relaxed">
            Flow 서비스는 흡연부스 위치 안내, 실시간 혼잡도 모니터링,<br />
            그리고 건강한 산책 코스를 제공합니다
          </p>
        </div>

        {/* 서비스 특징 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 4xl:gap-12 5xl:gap-20 mb-16 4xl:mb-32 5xl:mb-40">
          <div
            onClick={onLocationServiceClick}
            className="flex flex-col items-center justify-center p-8 md:p-10 4xl:p-14 5xl:p-20 hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <img
              src={`${import.meta.env.BASE_URL}image/위치서비스.png`}
              alt="위치 서비스"
              className="w-40 h-40 4xl:w-60 4xl:h-60 5xl:w-80 5xl:h-80 object-contain mb-6 4xl:mb-10 drop-shadow-xl"
            />
            <h3 className="text-2xl 4xl:text-4xl 5xl:text-5xl font-bold mb-4 4xl:mb-8 text-center text-gray-900 dark:text-white drop-shadow-md">위치 서비스</h3>
            <p className="text-gray-700 dark:text-gray-200 text-base md:text-lg 4xl:text-2xl 5xl:text-3xl text-center leading-relaxed font-medium">
              전국 300개 이상의 흡연부스 위치를 실시간으로 확인하고 가장 가까운 곳을 찾아보세요
            </p>
          </div>

          <div
            onClick={onCongestionMonitoringClick}
            className="flex flex-col items-center justify-center p-8 md:p-10 4xl:p-14 5xl:p-20 hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <img
              src={`${import.meta.env.BASE_URL}image/혼잡도모니터링.png`}
              alt="혼잡도 모니터링"
              className="w-40 h-40 4xl:w-60 4xl:h-60 5xl:w-80 5xl:h-80 object-contain mb-6 4xl:mb-10 drop-shadow-xl"
            />
            <h3 className="text-2xl 4xl:text-4xl 5xl:text-5xl font-bold mb-4 4xl:mb-8 text-center text-gray-900 dark:text-white drop-shadow-md">혼잡도 모니터링</h3>
            <p className="text-gray-700 dark:text-gray-200 text-base md:text-lg 4xl:text-2xl 5xl:text-3xl text-center leading-relaxed font-medium">
              전국 주요 지역의 실시간 인구 밀집도를 확인하고 최적의 방문 시간을 계획하세요
            </p>
          </div>

          <div
            onClick={onWalkRecommendationClick}
            className="flex flex-col items-center justify-center p-8 md:p-10 4xl:p-14 5xl:p-20 hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <img
              src={`${import.meta.env.BASE_URL}image/산책코스추천.png`}
              alt="산책 코스 추천"
              className="w-40 h-40 4xl:w-60 4xl:h-60 5xl:w-80 5xl:h-80 object-contain mb-6 4xl:mb-10 drop-shadow-xl"
            />
            <h3 className="text-2xl 4xl:text-4xl 5xl:text-5xl font-bold mb-4 4xl:mb-8 text-center text-gray-900 dark:text-white drop-shadow-md">산책 코스 추천</h3>
            <p className="text-gray-700 dark:text-gray-200 text-base md:text-lg 4xl:text-2xl 5xl:text-3xl text-center leading-relaxed font-medium">
              건강하고 쾌적한 산책 코스를 추천받아 여유로운 시간을 보내세요
            </p>
          </div>
        </div>

        {/* 지역별 정보 섹션 */}
        <div className="mb-16 4xl:mb-32 5xl:mb-40">
          <div className="flex flex-col items-center text-center mb-16 gap-5 4xl:gap-10 5xl:gap-16">
            <h3 className="text-2xl xs:text-3xl md:text-4xl lg:text-5xl 3xl:text-6xl 4xl:text-7xl 5xl:text-8xl font-bold drop-shadow-2xl text-gray-900 dark:text-white">
              지역별 맞춤 정보
            </h3>
            <p className="text-base xs:text-lg md:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl text-gray-700 dark:text-gray-300 drop-shadow-lg max-w-2xl 3xl:max-w-3xl 4xl:max-w-5xl 5xl:max-w-6xl text-center font-medium">
              원하는 지역을 선택하면 해당 지역의 흡연부스, 혼잡도,<br />
              산책코스를 한눈에 확인할 수 있습니다
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 4xl:grid-cols-8 gap-6 4xl:gap-10">
            {[
              { name: "서울", image: "서울.png" },
              { name: "경기", image: "경기.png" },
              { name: "인천", image: "인천.png" },
              { name: "부산", image: "부산.png" },
              { name: "대구", image: "대구.png" },
              { name: "광주", image: "광주.png" },
              { name: "대전", image: "대전.png" },
              { name: "제주", image: "제주.png" },
            ].map((region) => (
              <div
                key={region.name}
                onClick={() => onRegionClick(region.name)}
                className="flex flex-col items-center justify-center p-6 md:p-8 4xl:p-12 hover:scale-105 transition-transform duration-300 cursor-pointer"
              >
                <div className="text-center w-full flex flex-col items-center">
                  <div className="w-32 h-32 md:w-36 md:h-36 4xl:w-48 4xl:h-48 5xl:w-60 5xl:h-60 mb-3 4xl:mb-6 flex items-center justify-center">
                    <img
                      src={`${import.meta.env.BASE_URL}image/${region.image}`}
                      alt={region.name}
                      className="w-full h-full object-contain drop-shadow-lg"
                    />
                  </div>
                  <h4 className="text-xl md:text-2xl 4xl:text-4xl 5xl:text-5xl font-black text-gray-900 dark:text-white drop-shadow-md mb-2">{region.name}</h4>
                  <p className="text-xs md:text-sm 4xl:text-xl 5xl:text-2xl text-gray-600 dark:text-gray-400 mt-2 4xl:mt-4 font-semibold">클릭하여 상세보기</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="flex flex-col items-center text-center gap-5 4xl:gap-10 5xl:gap-16">
          <button
            onClick={onWalkClick}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 xs:px-12 xs:py-5 4xl:px-20 4xl:py-8 5xl:px-28 5xl:py-10 rounded-full text-lg xs:text-xl 3xl:text-2xl 4xl:text-4xl 5xl:text-5xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-110 transform"
          >
            🚶 산책 코스 신청하기
          </button>
          <p className="text-gray-700 dark:text-gray-300 text-base xs:text-lg 3xl:text-xl 4xl:text-3xl 5xl:text-4xl">
            지금 바로 Flow와 함께 쾌적한 환경을 경험해보세요
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface WalkRecommendationProps {
  onBack: () => void;
  onShowWalkList: () => void;
}

interface Course {
  id: number;
  name: string;
  distance: string;
  duration: string;
  difficulty: "쉬움" | "보통" | "어려움";
  calories: number;
  season: string[];
  timeOfDay: string[];
  rating: number;
  reviews: number;
  desc: string;
  features: string[];
}

export default function WalkRecommendation({ onBack, onShowWalkList }: WalkRecommendationProps) {
  const navigate = useNavigate();
  // 스크롤 잠금 해제 지원
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "auto";
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [selectedTime, setSelectedTime] = useState<"all" | "morning" | "afternoon" | "evening">("all");

  // 확장된 산책 코스 데이터
  const courses: Course[] = [
    {
      id: 1,
      name: "숲길 산책로",
      distance: "800m",
      duration: "15분",
      difficulty: "쉬움",
      calories: 45,
      season: ["봄", "여름", "가을"],
      timeOfDay: ["아침", "오후"],
      rating: 4.8,
      reviews: 256,
      desc: "나무가 울창한 힐링 코스입니다. 도심 속에서 자연을 느낄 수 있는 최고의 산책로입니다.",
      features: ["반려견 동반 가능", "휠체어 접근 가능", "그늘 많음", "벤치 있음"],
    },
    {
      id: 2,
      name: "강변 조깅 코스",
      distance: "1.2km",
      duration: "20분",
      difficulty: "쉬움",
      calories: 68,
      season: ["봄", "여름", "가을", "겨울"],
      timeOfDay: ["아침", "저녁"],
      rating: 4.7,
      reviews: 189,
      desc: "시원한 강바람을 맞으며 걷기 좋습니다. 조깅과 자전거 라이딩도 가능한 넓은 길입니다.",
      features: ["자전거 도로", "화장실 있음", "음수대 있음", "조명 완비"],
    },
    {
      id: 3,
      name: "도심 야경길",
      distance: "500m",
      duration: "12분",
      difficulty: "쉬움",
      calories: 35,
      season: ["봄", "여름", "가을", "겨울"],
      timeOfDay: ["저녁"],
      rating: 4.9,
      reviews: 312,
      desc: "밤에 걷기 좋은 분위기 있는 길입니다. 아름다운 조명과 야경을 감상할 수 있습니다.",
      features: ["야간 조명", "카페 근처", "사진 촬영 명소", "안전 CCTV"],
    },
    {
      id: 4,
      name: "정적 정원길",
      distance: "300m",
      duration: "8분",
      difficulty: "쉬움",
      calories: 22,
      season: ["봄", "가을"],
      timeOfDay: ["아침", "오후"],
      rating: 4.6,
      reviews: 145,
      desc: "조용히 명상하며 걷기 좋은 정원입니다. 계절마다 아름다운 꽃과 나무를 볼 수 있습니다.",
      features: ["정원 관리", "포토존", "벤치 다수", "조용한 환경"],
    },
    {
      id: 5,
      name: "테마 파크웨이",
      distance: "1.5km",
      duration: "25분",
      difficulty: "보통",
      calories: 88,
      season: ["봄", "여름", "가을"],
      timeOfDay: ["오후"],
      rating: 4.8,
      reviews: 278,
      desc: "다양한 볼거리가 있는 산책길입니다. 가족 단위 방문객에게 인기 있는 코스입니다.",
      features: ["놀이시설", "식당 근처", "주차장", "휴게소"],
    },
    {
      id: 6,
      name: "비밀의 숲길",
      distance: "2km",
      duration: "35분",
      difficulty: "보통",
      calories: 112,
      season: ["봄", "여름", "가을"],
      timeOfDay: ["아침", "오후"],
      rating: 4.9,
      reviews: 421,
      desc: "사람이 적어 한적하게 산책할 수 있습니다. 자연 그대로의 모습을 간직한 힐링 코스입니다.",
      features: ["한적함", "야생화", "새소리", "맑은 공기"],
    },
    {
      id: 7,
      name: "산악 트레일",
      distance: "3.2km",
      duration: "60분",
      difficulty: "어려움",
      calories: 198,
      season: ["봄", "가을"],
      timeOfDay: ["아침"],
      rating: 4.7,
      reviews: 167,
      desc: "등산을 즐기는 분들을 위한 도전적인 코스입니다. 정상에서의 전망이 환상적입니다.",
      features: ["등산 코스", "전망대", "운동 효과", "체력 향상"],
    },
    {
      id: 8,
      name: "해안 둘레길",
      distance: "2.5km",
      duration: "40분",
      difficulty: "보통",
      calories: 135,
      season: ["여름", "가을"],
      timeOfDay: ["오후", "저녁"],
      rating: 5.0,
      reviews: 534,
      desc: "바다를 보며 걷는 힐링 코스입니다. 파도 소리와 함께하는 완벽한 산책로입니다.",
      features: ["바다 전망", "해변 접근", "일몰 명소", "데크로드"],
    },
  ];

  // 필터링된 코스
  const filteredCourses = courses.filter((course) => {
    if (selectedCategory !== "all") {
      if (selectedCategory === "easy" && course.difficulty !== "쉬움") return false;
      if (selectedCategory === "medium" && course.difficulty !== "보통") return false;
      if (selectedCategory === "hard" && course.difficulty !== "어려움") return false;
    }
    if (selectedTime !== "all") {
      const timeMap: { [key: string]: string } = {
        morning: "아침",
        afternoon: "오후",
        evening: "저녁",
      };
      if (!course.timeOfDay.includes(timeMap[selectedTime])) return false;
    }
    return true;
  });

  // 통계
  const totalCourses = courses.length;
  const totalDistance = courses.reduce((sum, c) => {
    const dist = parseFloat(c.distance.replace("km", "").replace("m", "")) * (c.distance.includes("km") ? 1 : 0.001);
    return sum + dist;
  }, 0);
  const avgRating = (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1);
  const totalReviews = courses.reduce((sum, c) => sum + c.reviews, 0);

  // 난이도별 색상
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "쉬움": return "#10B981";
      case "보통": return "#F59E0B";
      case "어려움": return "#EF4444";
      default: return "#6B7280";
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-screen min-h-screen bg-transparent transition-colors duration-500 p-4 sm:p-6 md:p-8">
      {/* 헤더 */}
      <div className="w-full w-full mb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4">
            🚶 산책 코스 추천
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            건강하고 쾌적한 산책 코스를 추천받아 여유로운 시간을 보내세요
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="w-full w-full mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">추천 코스</p>
            <p className="text-4xl font-black">{totalCourses}개</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">총 거리</p>
            <p className="text-4xl font-black">{totalDistance.toFixed(1)}km</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">평균 평점</p>
            <p className="text-4xl font-black">⭐ {avgRating}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-semibold mb-2">총 리뷰</p>
            <p className="text-4xl font-black">{totalReviews.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="w-full w-full mb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">코스 필터</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 난이도 필터 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">난이도</p>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "전체" },
                  { value: "easy", label: "쉬움" },
                  { value: "medium", label: "보통" },
                  { value: "hard", label: "어려움" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedCategory(option.value as any)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedCategory === option.value
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 시간대 필터 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">추천 시간대</p>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "전체" },
                  { value: "morning", label: "아침" },
                  { value: "afternoon", label: "오후" },
                  { value: "evening", label: "저녁" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTime(option.value as any)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedTime === option.value
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 코스 목록 */}
      <div className="w-full w-full mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            추천 코스 ({filteredCourses.length}개)
          </h3>
          <button
            onClick={onShowWalkList}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-full font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
          >
            지도에서 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-xl border-2 border-green-100 overflow-hidden hover:shadow-2xl transition-all hover:scale-105 cursor-pointer"
            >
              {/* 이미지 */}
              <div className="w-full h-48 bg-gradient-to-br from-green-200 to-emerald-300 relative">
                <img
                  src={`https://picsum.photos/seed/${course.id}/400/300`}
                  alt={course.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-lg">
                  <span className="text-sm font-bold" style={{ color: getDifficultyColor(course.difficulty) }}>
                    {course.difficulty}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">⭐ {course.rating} ({course.reviews})</span>
                </div>
              </div>

              {/* 정보 */}
              <div className="p-6">
                <h4 className="text-xl font-black text-gray-900 mb-2">{course.name}</h4>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{course.desc}</p>

                {/* 통계 */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">거리</p>
                    <p className="text-sm font-bold text-blue-600">{course.distance}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">시간</p>
                    <p className="text-sm font-bold text-green-600">{course.duration}</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">칼로리</p>
                    <p className="text-sm font-bold text-orange-600">{course.calories}kcal</p>
                  </div>
                </div>

                {/* 특징 */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {course.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* 추천 시간대 */}
                <div className="flex gap-1">
                  {course.timeOfDay.map((time, index) => (
                    <span
                      key={index}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="mb-8">
        <button
          onClick={() => {
            onBack();
            navigate("/#section-guide");
          }}
          className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-10 py-3 rounded-full font-bold text-lg hover:from-gray-900 hover:to-black transition-all shadow-xl hover:shadow-2xl hover:scale-105"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

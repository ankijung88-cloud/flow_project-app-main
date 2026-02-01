import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Course {
  id: number;
  name: string;
  dist: string;
  lat: number;
  lng: number;
  desc: string;
  difficulty: "쉬움" | "보통" | "어려움";
  time: string;
  features: string[];
}

interface CourseWithDistance extends Course {
  calculatedDistance: number;
}

export default function WalkCourseList({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (c: Course) => void;
}) {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortedCourses, setSortedCourses] = useState<CourseWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "쉬움" | "보통" | "어려움">("all");

  // 스크롤 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 전국 산책로 데이터 (GPS 좌표 포함)
  const courses: Course[] = [
    {
      id: 1,
      name: "남산 둘레길",
      dist: "3.5km",
      lat: 37.5512,
      lng: 126.9882,
      desc: "서울 시내를 한눈에 조망할 수 있는 힐링 코스입니다. 사계절 아름다운 풍경을 즐길 수 있습니다.",
      difficulty: "보통",
      time: "약 1시간 30분",
      features: ["전망대", "숲길", "야경명소"],
    },
    {
      id: 2,
      name: "한강 반포지구 산책로",
      dist: "2.8km",
      lat: 37.5097,
      lng: 126.9969,
      desc: "한강변을 따라 걷는 시원한 산책로입니다. 밤에는 달빛무지개분수를 감상할 수 있습니다.",
      difficulty: "쉬움",
      time: "약 40분",
      features: ["강변", "자전거도로", "야경"],
    },
    {
      id: 3,
      name: "북한산 우이령길",
      dist: "4.5km",
      lat: 37.6584,
      lng: 127.0117,
      desc: "북한산의 아름다운 자연을 만끽할 수 있는 생태탐방로입니다.",
      difficulty: "어려움",
      time: "약 2시간",
      features: ["등산", "생태탐방", "계곡"],
    },
    {
      id: 4,
      name: "올림픽공원 산책로",
      dist: "2.2km",
      lat: 37.5208,
      lng: 127.1214,
      desc: "넓은 잔디밭과 다양한 조형물을 감상하며 걷기 좋은 공원입니다.",
      difficulty: "쉬움",
      time: "약 30분",
      features: ["공원", "조형물", "잔디밭"],
    },
    {
      id: 5,
      name: "경의선숲길",
      dist: "1.8km",
      lat: 37.5556,
      lng: 126.9237,
      desc: "폐선된 철도 위에 조성된 도심 속 녹색 산책로입니다.",
      difficulty: "쉬움",
      time: "약 25분",
      features: ["도심숲", "카페거리", "문화공간"],
    },
    {
      id: 6,
      name: "청계천 산책로",
      dist: "5.8km",
      lat: 37.5698,
      lng: 126.9784,
      desc: "도심 한복판에서 물소리를 들으며 걷는 힐링 코스입니다.",
      difficulty: "쉬움",
      time: "약 1시간 20분",
      features: ["수변", "조명", "도심"],
    },
    {
      id: 7,
      name: "해운대 해변 산책로",
      dist: "1.5km",
      lat: 35.1585,
      lng: 129.1606,
      desc: "부산의 아름다운 해변을 따라 걷는 낭만적인 산책로입니다.",
      difficulty: "쉬움",
      time: "약 20분",
      features: ["해변", "일출명소", "카페"],
    },
    {
      id: 8,
      name: "광안리 해변 산책로",
      dist: "1.3km",
      lat: 35.1532,
      lng: 129.1189,
      desc: "광안대교의 야경을 감상하며 걷기 좋은 해변 산책로입니다.",
      difficulty: "쉬움",
      time: "약 18분",
      features: ["해변", "야경", "광안대교"],
    },
    {
      id: 9,
      name: "대구 앞산 산책로",
      dist: "3.2km",
      lat: 35.8298,
      lng: 128.5875,
      desc: "대구 시민의 휴식처, 앞산의 울창한 숲길입니다.",
      difficulty: "보통",
      time: "약 1시간 10분",
      features: ["숲길", "전망대", "케이블카"],
    },
    {
      id: 10,
      name: "제주 올레길 7코스",
      dist: "15.1km",
      lat: 33.2474,
      lng: 126.5644,
      desc: "제주의 아름다운 해안 절경을 감상할 수 있는 올레길입니다.",
      difficulty: "어려움",
      time: "약 5시간",
      features: ["해안", "절경", "돌담길"],
    },
    {
      id: 11,
      name: "인천 송도 센트럴파크",
      dist: "1.8km",
      lat: 37.3894,
      lng: 126.6544,
      desc: "아름다운 수변공원과 현대적인 건물이 어우러진 산책로입니다.",
      difficulty: "쉬움",
      time: "약 25분",
      features: ["수변공원", "보트", "야경"],
    },
    {
      id: 12,
      name: "대전 유성온천 산책로",
      dist: "2.0km",
      lat: 36.3539,
      lng: 127.3435,
      desc: "온천욕 후 산책하기 좋은 조용한 산책로입니다.",
      difficulty: "쉬움",
      time: "약 30분",
      features: ["온천", "족욕", "공원"],
    },
  ];

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // 위치 권한 거부 시 서울 중심으로 설정 (동기 호출 방지)
          setTimeout(() => setUserLocation({ lat: 37.5665, lng: 126.978 }), 0);
        }
      );
    } else {
      setTimeout(() => setUserLocation({ lat: 37.5665, lng: 126.978 }), 0);
    }
  }, []);

  // Haversine formula로 거리 계산
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in km
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
  };

  // 사용자 위치 기반으로 산책로 정렬
  useEffect(() => {
    if (!userLocation) return;

    const coursesWithDistance = courses.map((course) => ({
      ...course,
      calculatedDistance: getDistance(userLocation.lat, userLocation.lng, course.lat, course.lng),
    }));

    const sorted = coursesWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);

    // 비동기 처리를 통해 렌더링 도중 상태 변경 방지
    setTimeout(() => {
      setSortedCourses(sorted);
      setIsLoading(false);
    }, 0);
  }, [userLocation, courses]);

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "쉬움": return "bg-green-100 text-green-700";
      case "보통": return "bg-yellow-100 text-yellow-700";
      case "어려움": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const filteredCourses = filter === "all"
    ? sortedCourses
    : sortedCourses.filter(c => c.difficulty === filter);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50 z-[9999] overflow-y-auto overflow-x-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-black text-gray-900 mb-3">내 주변 추천 산책로</h2>
          <p className="text-lg text-gray-600">
            {userLocation ? (
              <>현재 GPS 위치 기반으로 가까운 순서대로 추천해드립니다</>
            ) : (
              <>위치 정보를 불러오는 중입니다...</>
            )}
          </p>
        </motion.div>

        {/* 필터 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center gap-3 mb-8"
        >
          {["all", "쉬움", "보통", "어려움"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-6 py-2 rounded-full font-bold transition-all ${filter === f
                ? "bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-green-400"
                }`}
            >
              {f === "all" ? "전체" : f}
            </button>
          ))}
        </motion.div>

        {/* 산책로 카드 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-green-100 hover:shadow-2xl hover:border-green-300 transition-all group"
                >
                  {/* 이미지 */}
                  <div className="relative w-full h-48 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${course.id}/400/300`}
                      alt={course.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getDifficultyColor(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-sm font-bold text-green-700">
                        {formatDistance(course.calculatedDistance)} 거리
                      </span>
                    </div>
                  </div>

                  {/* 컨텐츠 */}
                  <div className="p-6">
                    <h3 className="text-xl font-black text-gray-900 mb-2">{course.name}</h3>
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span>📏</span> {course.dist}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>⏱️</span> {course.time}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {course.desc}
                    </p>

                    {/* 특징 태그 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {course.features.map((feature, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gradient-to-r from-green-50 to-blue-50 text-green-700 text-xs font-medium rounded-full border border-green-200"
                        >
                          #{feature}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => onSelect(course)}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                    >
                      산책로 보기
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredCourses.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-xl text-gray-500">해당 난이도의 산책로가 없습니다.</p>
          </motion.div>
        )}

        {/* 돌아가기 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => {
              onBack();
              navigate("/#section-guide");
            }}
            className="px-12 py-4 bg-gray-900 text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl"
          >
            돌아가기
          </button>
        </motion.div>
      </div>
    </div>
  );
}

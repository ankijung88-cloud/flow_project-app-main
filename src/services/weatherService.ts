
export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean; // 1 = Day, 0 = Night
}

// Additional interface for legacy support (ServicePage.tsx)
export interface EnvironmentData {
  airQuality: {
    value: number;
    level: string;
  };
  weather: {
    temp: number;
    condition: string;
    icon: string;
  };
}

// WMO Weather interpretation codes (WW)
function interpretWeatherCode(code: number): string {
  if (code === 0) return "맑음";
  if (code >= 1 && code <= 3) return "구름 조금";
  if (code >= 45 && code <= 48) return "안개";
  if (code >= 51 && code <= 55) return "이슬비";
  if (code >= 61 && code <= 65) return "비";
  if (code >= 66 && code <= 67) return "눈/비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 85 && code <= 86) return "눈보라";
  if (code >= 95) return "뇌우";
  return "흐림";
}

function getWeatherIcon(code: number, isDay: boolean): string {
  // Return simple emoji or icon class suitable for the footer
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code >= 1 && code <= 3) return isDay ? "⛅" : "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 99) return "⛈️";
  return "☁️";
}

export async function getCurrentWeather(lat: number, lng: number): Promise<{ temp: number; text: string; icon: string } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API Error");

    const data = await response.json();
    const current = data.current_weather;

    return {
      temp: current.temperature,
      text: interpretWeatherCode(current.weathercode),
      icon: getWeatherIcon(current.weathercode, current.is_day)
    };
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return null;
  }
}

export async function getAirQuality(lat: number, lng: number): Promise<{ value: number; level: string } | null> {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Air Quality API Error");

    const data = await response.json();
    const pm10 = data.current.pm10;

    let level = "좋음";
    if (pm10 > 150) level = "매우나쁨";
    else if (pm10 > 80) level = "나쁨";
    else if (pm10 > 30) level = "보통";

    return {
      value: pm10,
      level: level
    };
  } catch (error) {
    console.error("Failed to fetch air quality:", error);
    return null;
  }
}

// Legacy function for ServicePage compatibility
export async function getEnvironmentData(): Promise<EnvironmentData | null> {
  // Default location (Seoul) for general service page
  const lat = 37.5665;
  const lng = 126.978;

  const [weather, air] = await Promise.all([
    getCurrentWeather(lat, lng),
    getAirQuality(lat, lng)
  ]);

  return {
    airQuality: {
      value: air?.value || 45,
      level: air?.level || "보통"
    },
    weather: {
      temp: weather?.temp || 20,
      condition: weather?.text || "맑음",
      icon: weather?.icon || "☀️"
    }
  };
}

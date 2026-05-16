export type PrecipType = 0 | 1 | 2 | 3 | 4;
// 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기

export type SkyCondition = 1 | 3 | 4;
// 1=맑음, 3=구름많음, 4=흐림

export interface WeatherForecast {
  nx: number;
  ny: number;
  baseDate: string;
  baseTime: string;
  currentTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  precipType: PrecipType;
  sky: SkyCondition;
  humidity: number | null;
  windSpeed: number | null;
  fetchedAt: string;
}

export interface WeatherFetchResult {
  data: WeatherForecast | null;
  source: 'api' | 'cache' | 'none';
  error?: WeatherError;
}

export interface WeatherError {
  code: 'NETWORK' | 'API_ERROR' | 'PARSE_ERROR' | 'LOCATION_ERROR' | 'RATE_LIMIT';
  message: string;
  statusCode?: number;
}

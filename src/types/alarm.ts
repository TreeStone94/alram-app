import type { PrecipType, WeatherForecast } from './weather';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface AlarmConfig {
  id: string;
  baseTime: string;
  earlyMinutes: number;
  daysOfWeek: DayOfWeek[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledAlarm {
  config: AlarmConfig;
  scheduledTime: string;
  scheduledAt: string;
  weatherAdjusted: boolean;
  precipType: PrecipType | null;
  notificationId: string;
  schemaVersion: number;
  forecastSnapshot: WeatherForecast | null;
}

export type AlarmState =
  | { status: 'idle' }
  | { status: 'scheduling' }
  | { status: 'scheduled'; alarm: ScheduledAlarm }
  | { status: 'ringing'; alarm: ScheduledAlarm }
  | { status: 'dismissed'; alarm: ScheduledAlarm; dismissedAt: string }
  | { status: 'error'; error: AlarmError };

export interface AlarmError {
  code: 'PERMISSION_DENIED' | 'SCHEDULE_FAILED' | 'NOTIFICATION_ERROR';
  message: string;
}

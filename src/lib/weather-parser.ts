import type { PrecipType, SkyCondition, WeatherForecast } from '@/types/weather';

export interface KmaItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

const VALID_PRECIP_TYPES = new Set<PrecipType>([0, 1, 2, 3, 4]);
const VALID_SKY_CONDITIONS = new Set<SkyCondition>([1, 3, 4]);
const MINUTES_PER_DAY = 24 * 60;
const NEXT_HOUR_THRESHOLD_MINUTES = 45;

function parseAlarmTime(alarmTime: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(alarmTime);
  if (!match) {
    throw new ParseError(`Invalid alarm time: ${alarmTime}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new ParseError(`Invalid alarm time: ${alarmTime}`);
  }

  return hours * 60 + minutes;
}

function parseSlot(slot: string): number | null {
  const match = /^(\d{2})(\d{2})$/.exec(slot);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function currentAlarmTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function parseNullableNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePrecipType(value: string): PrecipType {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && VALID_PRECIP_TYPES.has(parsed as PrecipType)) {
    return parsed as PrecipType;
  }

  throw new ParseError(`Invalid PTY value: ${value}`);
}

function parseSkyCondition(value: string): SkyCondition {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && VALID_SKY_CONDITIONS.has(parsed as SkyCondition)) {
    return parsed as SkyCondition;
  }

  throw new ParseError(`Invalid SKY value: ${value}`);
}

function assertKmaItem(item: KmaItem): void {
  if (
    !item ||
    typeof item.category !== 'string' ||
    typeof item.fcstDate !== 'string' ||
    typeof item.fcstTime !== 'string' ||
    typeof item.fcstValue !== 'string'
  ) {
    throw new ParseError('Unexpected KMA response structure');
  }
}

function sortedUniqueValidSlots(slots: string[]): string[] {
  return [...new Set(slots)]
    .filter((slot) => parseSlot(slot) !== null)
    .sort((left, right) => {
      const leftMinutes = parseSlot(left);
      const rightMinutes = parseSlot(right);
      return (leftMinutes ?? 0) - (rightMinutes ?? 0);
    });
}

// fcstTime values represent hourly KMA slots. Keep the current hour until the
// final quarter-hour to avoid selecting a future slot too early.
export function nearestSlot(alarmTime: string, slots: string[]): string {
  const alarmMinutes = parseAlarmTime(alarmTime);
  const validSlots = sortedUniqueValidSlots(slots);
  if (validSlots.length === 0) {
    throw new ParseError('No valid forecast slots');
  }

  const alarmHourStart = Math.floor(alarmMinutes / 60) * 60;
  const alarmMinute = alarmMinutes % 60;
  const targetMinutes =
    alarmMinute >= NEXT_HOUR_THRESHOLD_MINUTES ? alarmHourStart + 60 : alarmHourStart;

  let selected = validSlots[0];
  let smallestDistance = Number.POSITIVE_INFINITY;

  for (const slot of validSlots) {
    const slotMinutes = parseSlot(slot);
    if (slotMinutes === null) {
      continue;
    }

    const distance = Math.abs(slotMinutes - targetMinutes);
    if (distance < smallestDistance) {
      selected = slot;
      smallestDistance = distance;
    }
  }

  return selected;
}

export function precipWindow(alarmTime: string, allSlots: string[]): string[] {
  const alarmMinutes = parseAlarmTime(alarmTime);
  const start = Math.floor((alarmMinutes - 60) / 60) * 60;
  const end = Math.floor((alarmMinutes + 120) / 60) * 60;

  return sortedUniqueValidSlots(allSlots).filter((slot) => {
    const slotMinutes = parseSlot(slot);
    if (slotMinutes === null) {
      return false;
    }

    if (start < 0) {
      return slotMinutes >= start + MINUTES_PER_DAY || slotMinutes <= end;
    }

    if (end >= MINUTES_PER_DAY) {
      return slotMinutes >= start || slotMinutes <= end - MINUTES_PER_DAY;
    }

    return slotMinutes >= start && slotMinutes <= end;
  });
}

function firstItemValue(items: KmaItem[], category: string, fcstDate: string): string | null {
  return items.find((item) => item.category === category && item.fcstDate === fcstDate)?.fcstValue ?? null;
}

function slotItemValue(items: KmaItem[], category: string, fcstDate: string, slot: string): string | null {
  return (
    items.find(
      (item) => item.category === category && item.fcstDate === fcstDate && item.fcstTime === slot,
    )?.fcstValue ?? null
  );
}

export function parseKmaResponse(
  items: KmaItem[],
  nx: number,
  ny: number,
  alarmTime = currentAlarmTime(),
): WeatherForecast {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ParseError('KMA response items are empty');
  }

  for (const item of items) {
    assertKmaItem(item);
  }

  const ptyItems = items.filter((item) => item.category === 'PTY');
  if (ptyItems.length === 0) {
    throw new ParseError('KMA response is missing PTY');
  }

  const selectedSlot = nearestSlot(
    alarmTime,
    items.map((item) => item.fcstTime),
  );
  const selectedDate =
    items.find((item) => item.fcstTime === selectedSlot)?.fcstDate ?? items[0].fcstDate;
  const windowSlots = new Set(
    precipWindow(
      alarmTime,
      items.map((item) => item.fcstTime),
    ),
  );

  let precipType: PrecipType = 0;
  for (const item of ptyItems) {
    const parsed = parsePrecipType(item.fcstValue);
    if (windowSlots.has(item.fcstTime) && parsed !== 0) {
      precipType = parsed;
      break;
    }
  }

  const skyValue = slotItemValue(items, 'SKY', selectedDate, selectedSlot);
  if (skyValue === null) {
    throw new ParseError(`KMA response is missing SKY for ${selectedSlot}`);
  }

  const currentTempValue = slotItemValue(items, 'TMP', selectedDate, selectedSlot);
  const humidityValue = slotItemValue(items, 'REH', selectedDate, selectedSlot);
  const windSpeedValue = slotItemValue(items, 'WSD', selectedDate, selectedSlot);
  const maxTempValue = firstItemValue(items, 'TMX', selectedDate);
  const minTempValue = firstItemValue(items, 'TMN', selectedDate);

  return {
    nx,
    ny,
    baseDate: selectedDate,
    baseTime: selectedSlot,
    currentTemp: currentTempValue === null ? null : parseNullableNumber(currentTempValue),
    maxTemp: maxTempValue === null ? null : parseNullableNumber(maxTempValue),
    minTemp: minTempValue === null ? null : parseNullableNumber(minTempValue),
    precipType,
    sky: parseSkyCondition(skyValue),
    humidity: humidityValue === null ? null : parseNullableNumber(humidityValue),
    windSpeed: windSpeedValue === null ? null : parseNullableNumber(windSpeedValue),
    fetchedAt: new Date().toISOString(),
  };
}

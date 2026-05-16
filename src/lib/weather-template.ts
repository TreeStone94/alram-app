import {
  DIURNAL_MESSAGE,
  FALLBACK_MESSAGE,
  PRECIP_MESSAGES,
  TEMP_MESSAGES,
  TTS_PREFIX_FRIEND,
} from '@/constants/tts-templates';
import type { PrecipType } from '@/types/weather';

export type TtsStyle = 'FRIEND';

export interface TemplateInput {
  currentTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  precipType: PrecipType;
  style: TtsStyle;
}

const MESSAGE_SEPARATOR = '. ';

function getPrefix(style: TtsStyle): string {
  switch (style) {
    case 'FRIEND':
      return TTS_PREFIX_FRIEND;
  }
}

function getTemperatureMessage(currentTemp: number): string {
  return TEMP_MESSAGES.find((entry) => currentTemp >= entry.minTemp)?.message ?? TEMP_MESSAGES[0].message;
}

function hasDiurnalRangeMessage(maxTemp: number | null, minTemp: number | null): boolean {
  return maxTemp !== null && minTemp !== null && maxTemp - minTemp >= 10 && maxTemp >= 15;
}

function getPrecipMessage(precipType: PrecipType): string | null {
  if (precipType === 0) {
    return null;
  }

  return PRECIP_MESSAGES[precipType];
}

export function generateScript(input: TemplateInput): string {
  const { currentTemp, maxTemp, minTemp, precipType, style } = input;

  if (currentTemp === null && maxTemp === null && minTemp === null && precipType === 0) {
    return FALLBACK_MESSAGE;
  }

  const messages: string[] = [];

  if (currentTemp !== null) {
    messages.push(getTemperatureMessage(currentTemp));
  }

  const precipMessage = getPrecipMessage(precipType);
  if (precipMessage !== null) {
    messages.push(precipMessage);
  }

  if (hasDiurnalRangeMessage(maxTemp, minTemp)) {
    messages.push(DIURNAL_MESSAGE);
  }

  const prefix = getPrefix(style);
  const body = messages.join(MESSAGE_SEPARATOR);

  return body.length > 0 ? `${prefix} ${body}` : prefix;
}

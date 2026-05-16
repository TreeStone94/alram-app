import { generateScript } from '@/lib/weather-template';

describe('generateScript', () => {
  describe('temperature messages', () => {
    it('uses the hot weather message for 28C and above', () => {
      const result = generateScript({
        currentTemp: 30,
        maxTemp: 32,
        minTemp: 25,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).toContain('반팔 한 장이면 충분해요');
    });

    it('uses the cardigan message for 12-19C', () => {
      const result = generateScript({
        currentTemp: 15,
        maxTemp: 20,
        minTemp: 10,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).toContain('가디건');
    });

    it('uses the heavy padding message below 4C', () => {
      const result = generateScript({
        currentTemp: 1,
        maxTemp: 3,
        minTemp: -2,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).toContain('두꺼운 패딩 필수');
    });
  });

  describe('diurnal range message', () => {
    it('adds the diurnal message when max temp is at least 15C and range is at least 10C', () => {
      const result = generateScript({
        currentTemp: 10,
        maxTemp: 22,
        minTemp: 8,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).toContain('낮엔 덥지만');
    });

    it('omits the diurnal message when max temp is below 15C', () => {
      const result = generateScript({
        currentTemp: -2,
        maxTemp: 4,
        minTemp: -6,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).not.toContain('낮엔 덥지만');
    });

    it('omits the diurnal message when range is below 10C', () => {
      const result = generateScript({
        currentTemp: 18,
        maxTemp: 20,
        minTemp: 14,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).not.toContain('낮엔 덥지만');
    });
  });

  describe('precipitation messages', () => {
    it('adds the rain message for PTY=1', () => {
      const result = generateScript({
        currentTemp: 15,
        maxTemp: 18,
        minTemp: 12,
        precipType: 1,
        style: 'FRIEND',
      });

      expect(result).toContain('우산 꼭 챙기세요');
    });

    it('adds the snow message for PTY=3', () => {
      const result = generateScript({
        currentTemp: -1,
        maxTemp: 1,
        minTemp: -3,
        precipType: 3,
        style: 'FRIEND',
      });

      expect(result).toContain('눈 와요');
    });
  });

  describe('null handling', () => {
    it('omits the temperature message when currentTemp is null', () => {
      const result = generateScript({
        currentTemp: null,
        maxTemp: 20,
        minTemp: 10,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).not.toMatch(/°C|패딩|가디건|반팔|긴팔|코트/);
    });

    it('returns the fallback message when all weather data is null and there is no precipitation', () => {
      const result = generateScript({
        currentTemp: null,
        maxTemp: null,
        minTemp: null,
        precipType: 0,
        style: 'FRIEND',
      });

      expect(result).toContain('날씨 정보를 가져오지 못했어요');
    });
  });

  it('starts with the FRIEND style prefix', () => {
    const result = generateScript({
      currentTemp: 20,
      maxTemp: 25,
      minTemp: 15,
      precipType: 0,
      style: 'FRIEND',
    });

    expect(result.startsWith('야~ 일어나!')).toBe(true);
  });

  it('separates the FRIEND prefix from the first message with a space', () => {
    const result = generateScript({
      currentTemp: 20,
      maxTemp: 25,
      minTemp: 15,
      precipType: 0,
      style: 'FRIEND',
    });

    expect(result).toContain('야~ 일어나! 얇은 긴팔이 딱 좋아요');
  });
});

export interface GridCoord {
  nx: number;
  ny: number;
}

const KMA_PARAMS = {
  Re: 6371.00877,
  grid: 5.0,
  slat1: 30.0,
  slat2: 60.0,
  olon: 126.0,
  olat: 38.0,
  xo: 43,
  yo: 136,
} as const;

const DEGREES_TO_RADIANS = Math.PI / 180.0;
const GRID_INDEX_OFFSET = {
  x: 0.25,
  y: 0.3,
} as const;

export function toKmaGrid(lat: number, lon: number): GridCoord {
  const re = KMA_PARAMS.Re / KMA_PARAMS.grid;
  const slat1 = KMA_PARAMS.slat1 * DEGREES_TO_RADIANS;
  const slat2 = KMA_PARAMS.slat2 * DEGREES_TO_RADIANS;
  const olon = KMA_PARAMS.olon * DEGREES_TO_RADIANS;
  const olat = KMA_PARAMS.olat * DEGREES_TO_RADIANS;

  const snNumerator = Math.log(Math.cos(slat1) / Math.cos(slat2));
  const snDenominator = Math.log(
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5),
  );
  const sn = snNumerator / snDenominator;

  const sfBase = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  const sf = (Math.cos(slat1) * sfBase ** sn) / sn;

  const roBase = Math.tan(Math.PI * 0.25 + olat * 0.5);
  const ro = (re * sf) / roBase ** sn;

  const raBase = Math.tan(Math.PI * 0.25 + lat * DEGREES_TO_RADIANS * 0.5);
  const ra = (re * sf) / raBase ** sn;

  let theta = lon * DEGREES_TO_RADIANS - olon;
  if (theta > Math.PI) {
    theta -= 2.0 * Math.PI;
  }
  if (theta < -Math.PI) {
    theta += 2.0 * Math.PI;
  }
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + KMA_PARAMS.xo + GRID_INDEX_OFFSET.x),
    ny: Math.floor(ro - ra * Math.cos(theta) + KMA_PARAMS.yo + GRID_INDEX_OFFSET.y),
  };
}

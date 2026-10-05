const MARINE_API_BASE = 'https://marine-api.open-meteo.com/v1/marine';

const HOURLY_VARS = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'wind_wave_height',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
] as const;

export type MarineForecastHour = {
  time: string;
  waveHeightM: number | null;
  waveDirectionDeg: number | null;
  wavePeriodS: number | null;
  windWaveHeightM: number | null;
  swellWaveHeightM: number | null;
  swellWaveDirectionDeg: number | null;
  swellWavePeriodS: number | null;
};

type MarineApiResponse = {
  hourly: {
    time: string[];
    wave_height: number[];
    wave_direction: number[];
    wave_period: number[];
    wind_wave_height: number[];
    swell_wave_height: number[];
    swell_wave_direction: number[];
    swell_wave_period: number[];
  };
};

export async function fetchMarineForecast(
  latitude: number,
  longitude: number,
  forecastDays: number = 3
): Promise<MarineForecastHour[]> {
  const url = `${MARINE_API_BASE}?latitude=${latitude}&longitude=${longitude}&hourly=${HOURLY_VARS.join(',')}&forecast_days=${forecastDays}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo marine forecast request failed: ${response.status}`);
  }

  const data: MarineApiResponse = await response.json();
  const { hourly } = data;

  return hourly.time.map((time, i) => ({
    time,
    waveHeightM: hourly.wave_height?.[i] ?? null,
    waveDirectionDeg: hourly.wave_direction?.[i] ?? null,
    wavePeriodS: hourly.wave_period?.[i] ?? null,
    windWaveHeightM: hourly.wind_wave_height?.[i] ?? null,
    swellWaveHeightM: hourly.swell_wave_height?.[i] ?? null,
    swellWaveDirectionDeg: hourly.swell_wave_direction?.[i] ?? null,
    swellWavePeriodS: hourly.swell_wave_period?.[i] ?? null,
  }));
}

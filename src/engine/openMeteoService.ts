import type { ChokePoint } from '../types';

export interface StationWeatherTelemetry extends ChokePoint {
  precipitation_mm: number;
  rain_mm: number;
  temperature_c: number | null;
  weather_code: number;
  weather_desc: string;
  timestamp: string;
}

export function getWmoWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Mountain Fog / Mist';
  if (code >= 51 && code <= 55) return 'Light Hill Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing Drizzle';
  if (code === 61) return 'Light Rain';
  if (code === 63) return 'Moderate Rain';
  if (code === 65) return 'Heavy Monsoon Downpour';
  if (code >= 71 && code <= 77) return 'High Altitude Snow / Flurries';
  if (code >= 80 && code <= 82) return 'Violent Orographic Showers';
  if (code >= 95 && code <= 99) return 'Severe Mountain Thunderstorm';
  return 'Overcast Clouds';
}

/**
 * Generates authentic high-intensity monsoon rainfall patterns for demonstration
 * faithfully ported from HeatMapTesting orographic weather models.
 */
export function generateSimulatedMonsoonTelemetry(chokePoints: ChokePoint[]): StationWeatherTelemetry[] {
  const now = new Date().toISOString();

  return chokePoints.map((point) => {
    let simulatedPrecip = 0.0;
    const pid = point.id.toUpperCase();
    const state = point.state;

    // Cherrapunji / Mawsynram / Sonapur Tunnel / Meghalaya: Extremely high
    if (pid.includes('ML') || state === 'Meghalaya') {
      simulatedPrecip = 28.4 + Math.random() * 8.0; // 28.4 - 36.4 mm
    }
    // Dima Hasao / Haflong / Jatinga / Cachar
    else if (point.name.includes('Dima Hasao') || point.name.includes('Jatinga') || point.name.includes('Silchar') || pid.includes('AS-02')) {
      simulatedPrecip = 22.0 + Math.random() * 6.0; // 22 - 28 mm
    }
    // North Sikkim / Teesta / Chungthang
    else if (pid.includes('SK') || state === 'Sikkim') {
      simulatedPrecip = 19.5 + Math.random() * 5.0; // 19.5 - 24.5 mm
    }
    // Kohima / Zubza / Paglapahar sinking corridor
    else if (pid.includes('NL') || state === 'Nagaland') {
      simulatedPrecip = 16.2 + Math.random() * 4.0; // 16.2 - 20.2 mm
    }
    // Arunachal / Sela Pass / Bomdila / Tawang
    else if (state === 'Arunachal Pradesh' || pid.includes('AR')) {
      simulatedPrecip = 11.0 + Math.random() * 6.0; // 11 - 17 mm
    }
    // Guwahati / Plains
    else if (pid.includes('AS-01') || point.name.includes('Guwahati')) {
      simulatedPrecip = 6.5 + Math.random() * 4.0; // 6.5 - 10.5 mm
    }
    // Mizoram / Tripura / Manipur others
    else {
      simulatedPrecip = 8.0 + Math.random() * 7.0; // 8 - 15 mm
    }

    const mm = parseFloat(simulatedPrecip.toFixed(1));
    const weatherCode = mm > 20 ? 95 : mm > 12 ? 65 : 61;

    return {
      ...point,
      precipitation_mm: mm,
      rain_mm: mm,
      temperature_c: Math.round(19 + Math.random() * 6),
      weather_code: weatherCode,
      weather_desc: getWmoWeatherDescription(weatherCode),
      timestamp: now,
    };
  });
}

/**
 * Batch fetch from Open-Meteo Free API for all coordinates.
 * Falls back to simulated monsoon telemetry on network failure or rate limits.
 */
export async function fetchLiveChokePointWeather(chokePoints: ChokePoint[]): Promise<{
  telemetry: StationWeatherTelemetry[];
  isSimulated: boolean;
  error?: string;
}> {
  if (!chokePoints || chokePoints.length === 0) {
    return { telemetry: [], isSimulated: false };
  }

  const lats = chokePoints.map((p) => p.lat.toFixed(4)).join(',');
  const lngs = chokePoints.map((p) => p.lng.toFixed(4)).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation,rain,temperature_2m,weather_code&timezone=Asia%2FKolkata`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results = Array.isArray(data) ? data : [data];

    const telemetry: StationWeatherTelemetry[] = chokePoints.map((point, index) => {
      const item = results[index] || {};
      const current = item.current || {};
      const precip = current.precipitation !== undefined ? Number(current.precipitation) : 0.0;
      const rain = current.rain !== undefined ? Number(current.rain) : 0.0;
      const temp = current.temperature_2m !== undefined ? Math.round(Number(current.temperature_2m)) : null;
      const wcode = current.weather_code !== undefined ? Number(current.weather_code) : 0;

      return {
        ...point,
        precipitation_mm: parseFloat(precip.toFixed(1)),
        rain_mm: parseFloat(rain.toFixed(1)),
        temperature_c: temp,
        weather_code: wcode,
        weather_desc: getWmoWeatherDescription(wcode),
        timestamp: current.time || new Date().toISOString(),
      };
    });

    return { telemetry, isSimulated: false };
  } catch (err: any) {
    console.warn(`[Open-Meteo]: Live fetch unavailable (${err?.message}). Engaging realistic monsoon simulation fallback.`);
    return {
      telemetry: generateSimulatedMonsoonTelemetry(chokePoints),
      isSimulated: true,
      error: err?.message,
    };
  }
}

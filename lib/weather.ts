import { Data, DailyLog } from './model';
export async function fetchWeather(
  settings: Data['settings'],
): Promise<DailyLog['weather']> {
  if (settings.latitude === null || settings.longitude === null)
    throw new Error('Configure latitude e longitude nas definições.');
  const params = new URLSearchParams({
    latitude: String(settings.latitude),
    longitude: String(settings.longitude),
    current:
      'temperature_2m,relative_humidity_2m,precipitation,surface_pressure',
    hourly: 'surface_pressure',
    past_days: '1',
    forecast_days: '1',
    timezone: 'auto',
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok)
    throw new Error(
      'Meteorologia indisponível. Pode continuar a registar normalmente.',
    );
  const json = await response.json();
  const current = json.current;
  const index =
    json.hourly?.time?.findIndex(
      (t: string) => t.slice(0, 13) === current.time.slice(0, 13),
    ) ?? -1;
  const old = index >= 24 ? json.hourly.surface_pressure[index - 24] : null;
  return {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    pressure: current.surface_pressure,
    rain: current.precipitation,
    pressureChange:
      typeof old === 'number' ? current.surface_pressure - old : null,
    source: 'Open-Meteo · ' + current.time,
  };
}

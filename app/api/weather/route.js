import { NextResponse } from 'next/server';

// KL University campus area (Vaddeswaram / Tadepalli).
// Fixed location: students are never asked for their location.
const LAT = 16.4419, LON = 80.6226;
const URL_ = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
  + '&current=weather_code,is_day,temperature_2m,cloud_cover&daily=sunrise,sunset'
  + '&timezone=Asia%2FKolkata&forecast_days=1';

export const revalidate = 600; // one upstream call per 10 minutes, shared by everyone

/** WMO weather code → the few looks the background supports */
function condition(code) {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}

const LABEL = { clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Misty', rain: 'Rain', storm: 'Thunderstorm' };

/**
 * GET /api/weather (public)
 * → { place, condition, label, temp, sunrise, sunset }  (sunrise/sunset = 'HH:MM' IST)
 */
export async function GET() {
  try {
    const r = await fetch(URL_, { next: { revalidate } });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const d = await r.json();
    const cond = condition(d.current?.weather_code);
    return NextResponse.json({
      place:     'KL University',
      condition: cond,
      label:     LABEL[cond],
      temp:      Math.round(d.current?.temperature_2m),
      sunrise:   d.daily?.sunrise?.[0]?.slice(11, 16) || '06:00',
      sunset:    d.daily?.sunset?.[0]?.slice(11, 16) || '18:00',
    });
  } catch {
    // Background falls back to clock-based phases
    return NextResponse.json({ error: 'weather unavailable' }, { status: 503 });
  }
}

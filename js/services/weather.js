// 現地の天気予報（Open-Meteo。登録不要）。日付ごとの { code, max, min, pop } を返す。
import { TRIP } from '../config.js';
import { cacheGet, cacheSet } from './trip-cache.js';

/** 天気の番号 → 絵文字と言葉。 */
export function weatherLabel(code) {
  if (code === 0) return { icon: '☀', label: '晴れ' };
  if (code <= 2) return { icon: '🌤', label: '晴れ時々くもり' };
  if (code === 3) return { icon: '☁', label: 'くもり' };
  if (code <= 48) return { icon: '🌫', label: '霧' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { icon: '☂', label: '雨' };
  if (code <= 77 || code === 85 || code === 86) return { icon: '❄', label: '雪' };
  return { icon: '⚡', label: '雷雨' };
}

/** 場所(lat/lon)の今日から16日分。通信できなければ例外。 */
export async function forecast(pos) {
  const key = `${pos.lat.toFixed(2)},${pos.lon.toFixed(2)}`;
  const hit = cacheGet('weather', key, TRIP.weatherTtl);
  if (hit) return hit;
  const url = `${TRIP.weatherApi}?latitude=${pos.lat}&longitude=${pos.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${TRIP.forecastDays}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather');
  const d = (await res.json()).daily;
  if (!d || !Array.isArray(d.time)) throw new Error('weather');
  const days = {};
  d.time.forEach((t, i) => {
    days[t] = { code: d.weather_code[i], max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]), pop: d.precipitation_probability_max[i] };
  });
  cacheSet('weather', key, days, 40);
  return days;
}

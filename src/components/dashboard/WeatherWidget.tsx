'use client';

import { useState, useEffect } from 'react';

function getWeatherInfo(code: number): { desc: string; icon: string } {
  if (code === 0) return { desc: 'Clear sky', icon: '☀️' };
  if (code === 1) return { desc: 'Mainly clear', icon: '🌤️' };
  if (code === 2) return { desc: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { desc: 'Overcast', icon: '☁️' };
  if (code <= 48) return { desc: 'Foggy', icon: '🌫️' };
  if (code <= 57) return { desc: 'Drizzle', icon: '🌦️' };
  if (code <= 65) return { desc: code <= 61 ? 'Light rain' : code <= 63 ? 'Rain' : 'Heavy rain', icon: '🌧️' };
  if (code <= 77) return { desc: 'Snow', icon: '❄️' };
  if (code <= 82) return { desc: 'Rain showers', icon: '🌦️' };
  if (code <= 86) return { desc: 'Snow showers', icon: '🌨️' };
  if (code <= 99) return { desc: 'Thunderstorm', icon: '⛈️' };
  return { desc: 'Unknown', icon: '🌡️' };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeatherData {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      setError(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
              `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
              `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
            ),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`),
          ]);

          const weatherData: WeatherData = await weatherRes.json();
          const geoData = await geoRes.json();

          setWeather(weatherData);
          setLocation(
            geoData.address?.town ??
            geoData.address?.city ??
            geoData.address?.village ??
            geoData.address?.county ??
            ''
          );
        } catch {
          setError(true);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError(true);
      },
      { timeout: 8000 }
    );
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-aas-blue border-t-transparent animate-spin" />
        <span className="text-xs text-gray-400">Loading weather…</span>
      </div>
    );
  }

  if (error || !weather) return null;

  const current = weather.current;
  const daily = weather.daily;
  const currentInfo = getWeatherInfo(current.weather_code);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          {location && <p className="text-xs text-gray-400 font-medium mb-0.5">{location}</p>}
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-800">{Math.round(current.temperature_2m)}°C</span>
            <span className="text-sm text-gray-400 mb-1">feels {Math.round(current.apparent_temperature)}°</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{currentInfo.desc}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
            <span>💨 {Math.round(current.wind_speed_10m)} km/h</span>
            <span>💧 {current.relative_humidity_2m}%</span>
          </div>
        </div>
        <span className="text-5xl leading-none">{currentInfo.icon}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
        {[1, 2, 3].map(i => {
          const date = new Date(daily.time[i] + 'T12:00:00');
          const info = getWeatherInfo(daily.weather_code[i]);
          return (
            <div key={i} className="text-center">
              <p className="text-xs text-gray-400 mb-1">{DAY_NAMES[date.getDay()]}</p>
              <span className="text-2xl">{info.icon}</span>
              <p className="text-xs font-medium text-gray-700 mt-1">
                {Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { GeoLocationInfo } from '../types';

/**
 * Utilitário de Geolocalização de Alta Precisão para MP CARGAS
 */
export async function getCurrentGPSPosition(): Promise<GeoLocationInfo> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: -12.9714,
        longitude: -38.5014,
        accuracy: 12.0,
        cityState: 'Salvador - BA (GPS Padrão Sede)',
        fullAddress: 'Salvador - BA (Base Operacional)',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy * 10) / 10;
        
        let cityState = 'Localização Corporativa';
        let fullAddress = `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
            {
              signal: controller.signal,
              headers: { 'Accept-Language': 'pt-BR' }
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.municipality || addr.village || 'Região Metropolitana';
            const state = addr.state_code || addr.state || 'BA';
            cityState = `${city} - ${state}`;
            fullAddress = `${cityState} • Precisão: ${acc}m`;
          } else {
            cityState = getHeuristicLocation(lat, lon);
            fullAddress = `${cityState} • Precisão: ${acc}m`;
          }
        } catch {
          cityState = getHeuristicLocation(lat, lon);
          fullAddress = `${cityState} • Precisão: ${acc}m`;
        }

        resolve({
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          cityState,
          fullAddress,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        console.warn('Aviso de GPS:', error.message);
        resolve({
          latitude: -12.9714,
          longitude: -38.5014,
          accuracy: 15.0,
          cityState: 'Salvador - BA (Local Padrão)',
          fullAddress: 'Salvador - BA • Precisão: ~15m (GPS Indisponível)',
          timestamp: new Date().toISOString(),
        });
      },
      options
    );
  });
}

function getHeuristicLocation(lat: number, lon: number): string {
  if (Math.abs(lat - (-12.97)) < 0.3 && Math.abs(lon - (-38.50)) < 0.3) {
    return 'Salvador - BA (Base Principal)';
  }
  if (Math.abs(lat - (-12.26)) < 0.3 && Math.abs(lon - (-38.96)) < 0.3) {
    return 'Feira de Santana - BA (Filial Cargas)';
  }
  if (Math.abs(lat - (-23.55)) < 0.5 && Math.abs(lon - (-46.63)) < 0.5) {
    return 'São Paulo - SP (Hub Logístico)';
  }
  return `Bahia - BR (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
}

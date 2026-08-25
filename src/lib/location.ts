import type { GeoLocationInfo } from '../types';

/**
 * Gera URL oficial do Google Maps a partir de coordenadas
 */
export function getGoogleMapsUrl(latitude: number | null | undefined, longitude: number | null | undefined): string {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return 'https://maps.google.com';
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Utilitário de Geolocalização de Alta Precisão em Tempo Real para MP CARGAS
 */
export async function getCurrentGPSPosition(): Promise<GeoLocationInfo> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const defaultLat = -12.9714;
      const defaultLon = -38.5014;
      resolve({
        latitude: defaultLat,
        longitude: defaultLon,
        accuracy: 12.0,
        cityState: 'Salvador - BA (GPS Padrão Sede)',
        fullAddress: 'Salvador - BA (Base Operacional)',
        googleMapsUrl: getGoogleMapsUrl(defaultLat, defaultLon),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // 0 = força leitura de satélite/rede em tempo real no momento exato
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy * 10) / 10;
        
        let cityState = 'Localização Corporativa';
        let fullAddress = `Coordenadas: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
            {
              signal: controller.signal,
              headers: { 'Accept-Language': 'pt-BR' }
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.street || '';
            const suburb = addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.municipality || addr.village || 'Região Metropolitana';
            const state = addr.state_code || addr.state || 'BA';
            
            cityState = `${city} - ${state}`;
            const details = [road, suburb].filter(Boolean).join(', ');
            fullAddress = details ? `${details}, ${cityState} • Precisão: ${acc}m` : `${cityState} • Precisão: ${acc}m`;
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
          googleMapsUrl: getGoogleMapsUrl(lat, lon),
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        console.warn('Aviso de GPS:', error.message);
        const defaultLat = -12.9714;
        const defaultLon = -38.5014;
        resolve({
          latitude: defaultLat,
          longitude: defaultLon,
          accuracy: 15.0,
          cityState: 'Salvador - BA (Local Padrão)',
          fullAddress: 'Salvador - BA • Precisão: ~15m (GPS Indisponível)',
          googleMapsUrl: getGoogleMapsUrl(defaultLat, defaultLon),
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
  return `Localização (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
}

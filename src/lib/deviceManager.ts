import type { Device } from '../types';

const DEVICE_ID_KEY = 'mp_cargas_device_identifier';
const DEVICE_NAME_KEY = 'mp_cargas_device_name';

/**
 * Obtém ou inicializa a identidade deste celular / dispositivo no PWA
 */
export function getLocalDeviceIdentifier(): string {
  let identifier = localStorage.getItem(DEVICE_ID_KEY);
  if (!identifier) {
    const randomHex = Math.random().toString(36).substring(2, 9).toUpperCase();
    identifier = `MP-DEV-${randomHex}`;
    localStorage.setItem(DEVICE_ID_KEY, identifier);
  }
  return identifier;
}

/**
 * Gera um nome descritivo para o dispositivo baseado no User-Agent
 */
export function getLocalDeviceName(): string {
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (name) return name;

  const ua = navigator.userAgent;
  let detected = 'Celular Corporativo';

  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+);?\s+([^;)]+)/);
    detected = match && match[2] ? `Android (${match[2].trim()})` : 'Android Corporativo';
  } else if (/iPhone|iPad/i.test(ua)) {
    detected = 'iOS Corporativo';
  } else if (/Windows/i.test(ua)) {
    detected = 'Terminal Windows (CD)';
  } else if (/Mac/i.test(ua)) {
    detected = 'Terminal macOS (Gestão)';
  }

  const idSuffix = getLocalDeviceIdentifier().replace('MP-DEV-', '');
  name = `${detected} #${idSuffix}`;
  localStorage.setItem(DEVICE_NAME_KEY, name);
  return name;
}

/**
 * Verifica se o dispositivo está com status ATIVO
 */
export function isDeviceAuthorized(device: Device | null): { authorized: boolean; message?: string } {
  if (!device) {
    return { authorized: true };
  }

  if (device.status === 'BLOQUEADO') {
    return {
      authorized: false,
      message: 'Este dispositivo foi bloqueado pela administração da MP CARGAS. Entre em contato com a gestão de frota.',
    };
  }

  return { authorized: true };
}

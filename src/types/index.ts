// Tipos do Sistema MP CARGAS — PONTO

export type EmployeeStatus = 'ATIVO' | 'INATIVO';

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  cpf: string;
  department: string;
  role: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
  has_face_profile?: boolean;
  photo_preview?: string; // Foto de referência cadastrada no 1º scan
}

export type FaceProfileStatus = 'ATIVO' | 'PENDENTE' | 'REVOGADO';

export interface FaceProfile {
  id: string;
  employee_id: string;
  provider_reference: string;
  template_version: string;
  descriptor: number[]; // Vetor de características faciais 64D/128D
  photo_preview?: string; // Miniatura de referência para conferência visual
  status: FaceProfileStatus;
  created_at: string;
  updated_at: string;
}

export type DeviceStatus = 'ATIVO' | 'BLOQUEADO' | 'RESERVA';

export interface Device {
  id: string;
  device_name: string;
  device_identifier: string;
  status: DeviceStatus;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export type RecordType = 'ENTRADA' | 'INICIO_INTERVALO' | 'RETORNO_INTERVALO' | 'SAIDA';

export type VerificationStatus = 'VALIDADO' | 'FALHA' | 'PENDENTE';

export type SyncStatus = 'SINCRONIZADO' | 'OFFLINE_PENDENTE';

export interface TimeRecord {
  id: string;
  employee_id: string;
  device_id: string;
  record_type: RecordType;
  recorded_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_address?: string;
  verification_method: string;
  verification_status: VerificationStatus;
  verification_score: number;
  sync_status: SyncStatus;
  idempotency_key: string;
  is_corrected: boolean;
  correction_reason?: string | null;
  original_record_id?: string | null;
  photo_preview?: string; // Foto comprobatória capturada no momento da batida
  google_maps_url?: string; // Link direto do Google Maps para auditoria
  created_at: string;
  
  // Relações expandidas para exibição
  employee?: Employee;
  device?: Device;
}

export type WorkSessionStatus = 'NAO_INICIADO' | 'EM_JORNADA' | 'EM_INTERVALO' | 'FINALIZADA';

export interface WorkSession {
  id: string;
  employee_id: string;
  session_date: string;
  started_at: string | null;
  break_started_at: string | null;
  break_ended_at: string | null;
  ended_at: string | null;
  status: WorkSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  employee_id?: string | null;
  action: string;
  device_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  
  // Auxiliares
  employee_name?: string;
  device_name?: string;
}

export interface GeoLocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  cityState: string;
  fullAddress: string;
  googleMapsUrl: string;
  timestamp: string;
}

export interface FacialVerificationResult {
  success: boolean;
  score: number;
  livenessPassed: boolean;
  errorMessage?: string;
  descriptor?: number[];
  photoPreview?: string;
}

export interface NextActionInfo {
  nextType: RecordType | null;
  label: string;
  description: string;
  allowed: boolean;
  reasonIfBlocked?: string;
  currentStatus: WorkSessionStatus;
}

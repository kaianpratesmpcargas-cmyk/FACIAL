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

export interface BiometricProfile {
  id: string;
  employee_id: string;
  provider: string; // 'face-api-resnet34'
  model_version: string; // 'v1.0'
  embedding: number[]; // 128D Float Vector
  quality_score: number;
  reference_photo_path?: string;
  photo_preview?: string; // Compatibilidade de visualização
  descriptor?: number[]; // Compatibilidade com código legado
  status: FaceProfileStatus;
  created_at: string;
  updated_at: string;
}

export type FaceProfile = BiometricProfile; // Alias para compatibilidade

export type BiometricVerificationStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';

export interface BiometricVerification {
  id: string;
  employee_id: string;
  session_token: string;
  verification_type: RecordType;
  status: BiometricVerificationStatus;
  match_score?: number | null;
  liveness_score?: number | null;
  challenge_type?: string | null;
  failure_reason?: string | null;
  capture_path?: string | null;
  device_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  location_address?: string | null;
  expires_at: string;
  created_at: string;
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
  verification_id?: string | null; // Vínculo com a sessão de verificação biométrica real
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
  verification?: BiometricVerification;
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

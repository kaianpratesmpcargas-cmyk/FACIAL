import { createClient } from '@supabase/supabase-js';
import type {
  Employee,
  FaceProfile,
  Device,
  TimeRecord,
  WorkSession,
  AuditLog,
  RecordType,
  DeviceStatus
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project.supabase.co'
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const STORAGE_KEYS = {
  EMPLOYEES: 'mp_cargas_db_employees',
  FACE_PROFILES: 'mp_cargas_db_face_profiles',
  DEVICES: 'mp_cargas_db_devices',
  TIME_RECORDS: 'mp_cargas_db_time_records',
  WORK_SESSIONS: 'mp_cargas_db_work_sessions',
  AUDIT_LOGS: 'mp_cargas_db_audit_logs',
};

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    employee_code: 'MP-0101',
    full_name: 'João Silva Santos',
    cpf: '123.456.789-01',
    department: 'Operações / Transporte',
    role: 'Motorista Carreteiro',
    status: 'ATIVO',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    has_face_profile: true,
  },
  {
    id: 'a2222222-2222-4222-8222-222222222222',
    employee_code: 'MP-0102',
    full_name: 'Marcos Oliveira Lima',
    cpf: '234.567.890-12',
    department: 'Operações / Transporte',
    role: 'Motorista Truck',
    status: 'ATIVO',
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date().toISOString(),
    has_face_profile: true,
  },
  {
    id: 'a3333333-3333-4333-8333-333333333333',
    employee_code: 'MP-0201',
    full_name: 'Ana Paula Ferreira',
    cpf: '345.678.901-23',
    department: 'Centro de Distribuição',
    role: 'Conferente de Cargas',
    status: 'ATIVO',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date().toISOString(),
    has_face_profile: true,
  },
  {
    id: 'a4444444-4444-4444-8444-444444444444',
    employee_code: 'MP-0202',
    full_name: 'Carlos Eduardo Souza',
    cpf: '456.789.012-34',
    department: 'Manutenção & Frota',
    role: 'Mecânico de Linha Pesada',
    status: 'ATIVO',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
    has_face_profile: false,
  },
  {
    id: 'a5555555-5555-4555-8555-555555555555',
    employee_code: 'MP-0301',
    full_name: 'Kaian Administrador',
    cpf: '567.890.123-45',
    department: 'Gestão Operacional',
    role: 'Supervisor de Ponto',
    status: 'ATIVO',
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date().toISOString(),
    has_face_profile: true,
  }
];

const INITIAL_DEVICES: Device[] = [
  {
    id: 'b1111111-1111-4111-8111-111111111111',
    device_name: 'CEL-001 (Samsung XCover Pro - Frota 12)',
    device_identifier: 'MP-DEV-SAMS-001',
    status: 'ATIVO',
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    device_name: 'CEL-002 (Samsung Galaxy Tab Active - CD)',
    device_identifier: 'MP-DEV-TAB-002',
    status: 'ATIVO',
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b3333333-3333-4333-8333-333333333333',
    device_name: 'CEL-003 (Motorola Defy - Apoio)',
    device_identifier: 'MP-DEV-MOTO-003',
    status: 'RESERVA',
    last_seen: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b4444444-4444-4444-8444-444444444444',
    device_name: 'CEL-004 (Dispositivo Antigo Danificado)',
    device_identifier: 'MP-DEV-SAMS-004',
    status: 'BLOQUEADO',
    last_seen: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const INITIAL_FACE_PROFILES: FaceProfile[] = [
  {
    id: 'c1111111-1111-4111-8111-111111111111',
    employee_id: 'a1111111-1111-4111-8111-111111111111',
    provider_reference: 'mp_biometrics_v1',
    template_version: 'v1.0',
    descriptor: [0.045, -0.122, 0.089, 0.231, -0.012, 0.156, -0.078, 0.091, -0.044, 0.115, 0.034, -0.092, 0.187, -0.023, 0.065, 0.143],
    status: 'ATIVO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    employee_id: 'a2222222-2222-4222-8222-222222222222',
    provider_reference: 'mp_biometrics_v1',
    template_version: 'v1.0',
    descriptor: [-0.032, 0.114, -0.095, 0.198, 0.054, -0.133, 0.082, -0.071, 0.063, -0.102, 0.041, 0.088, -0.165, 0.031, -0.058, -0.129],
    status: 'ATIVO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    employee_id: 'a3333333-3333-4333-8333-333333333333',
    provider_reference: 'mp_biometrics_v1',
    template_version: 'v1.0',
    descriptor: [0.078, -0.088, 0.142, -0.105, 0.089, 0.045, -0.112, 0.134, -0.021, 0.095, -0.067, -0.043, 0.122, -0.076, 0.088, 0.094],
    status: 'ATIVO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c5555555-5555-4555-8555-555555555555',
    employee_id: 'a5555555-5555-4555-8555-555555555555',
    provider_reference: 'mp_biometrics_v1',
    template_version: 'v1.0',
    descriptor: [-0.091, 0.067, -0.054, 0.143, -0.112, 0.087, 0.064, -0.098, 0.103, -0.045, 0.082, -0.061, -0.094, 0.108, -0.042, 0.073],
    status: 'ATIVO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const now = new Date();
const todayDateStr = now.toISOString().split('T')[0];

const INITIAL_TIME_RECORDS: TimeRecord[] = [
  {
    id: 'd1111111-1111-4111-8111-111111111111',
    employee_id: 'a1111111-1111-4111-8111-111111111111',
    device_id: 'b1111111-1111-4111-8111-111111111111',
    record_type: 'ENTRADA',
    recorded_at: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
    latitude: -12.9714,
    longitude: -38.5014,
    location_accuracy: 6.4,
    location_address: 'Salvador - BA (Base Principal)',
    verification_method: 'FACIAL_LIVENESS',
    verification_status: 'VALIDADO',
    verification_score: 0.99,
    sync_status: 'SINCRONIZADO',
    idempotency_key: 'seed-idemp-001',
    is_corrected: false,
    created_at: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
  },
  {
    id: 'd2222222-2222-4222-8222-222222222222',
    employee_id: 'a2222222-2222-4222-8222-222222222222',
    device_id: 'b1111111-1111-4111-8111-111111111111',
    record_type: 'ENTRADA',
    recorded_at: new Date(now.getTime() - 4.2 * 3600000).toISOString(),
    latitude: -12.2664,
    longitude: -38.9663,
    location_accuracy: 8.1,
    location_address: 'Feira de Santana - BA (Filial Cargas)',
    verification_method: 'FACIAL_LIVENESS',
    verification_status: 'VALIDADO',
    verification_score: 0.97,
    sync_status: 'SINCRONIZADO',
    idempotency_key: 'seed-idemp-002',
    is_corrected: false,
    created_at: new Date(now.getTime() - 4.2 * 3600000).toISOString(),
  },
  {
    id: 'd3333333-3333-4333-8333-333333333333',
    employee_id: 'a2222222-2222-4222-8222-222222222222',
    device_id: 'b1111111-1111-4111-8111-111111111111',
    record_type: 'INICIO_INTERVALO',
    recorded_at: new Date(now.getTime() - 0.5 * 3600000).toISOString(),
    latitude: -12.2664,
    longitude: -38.9663,
    location_accuracy: 7.5,
    location_address: 'Feira de Santana - BA (Filial Cargas)',
    verification_method: 'FACIAL_LIVENESS',
    verification_status: 'VALIDADO',
    verification_score: 0.98,
    sync_status: 'SINCRONIZADO',
    idempotency_key: 'seed-idemp-003',
    is_corrected: false,
    created_at: new Date(now.getTime() - 0.5 * 3600000).toISOString(),
  },
  {
    id: 'd4444444-4444-4444-8444-444444444444',
    employee_id: 'a3333333-3333-4333-8333-333333333333',
    device_id: 'b2222222-2222-4222-8222-222222222222',
    record_type: 'ENTRADA',
    recorded_at: new Date(now.getTime() - 2.8 * 3600000).toISOString(),
    latitude: -12.9714,
    longitude: -38.5014,
    location_accuracy: 5.2,
    location_address: 'Salvador - BA (Centro Logístico)',
    verification_method: 'FACIAL_LIVENESS',
    verification_status: 'VALIDADO',
    verification_score: 0.99,
    sync_status: 'SINCRONIZADO',
    idempotency_key: 'seed-idemp-004',
    is_corrected: false,
    created_at: new Date(now.getTime() - 2.8 * 3600000).toISOString(),
  }
];

const INITIAL_WORK_SESSIONS: WorkSession[] = [
  {
    id: 'e1111111-1111-4111-8111-111111111111',
    employee_id: 'a1111111-1111-4111-8111-111111111111',
    session_date: todayDateStr,
    started_at: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
    break_started_at: null,
    break_ended_at: null,
    ended_at: null,
    status: 'EM_JORNADA',
    created_at: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e2222222-2222-4222-8222-222222222222',
    employee_id: 'a2222222-2222-4222-8222-222222222222',
    session_date: todayDateStr,
    started_at: new Date(now.getTime() - 4.2 * 3600000).toISOString(),
    break_started_at: new Date(now.getTime() - 0.5 * 3600000).toISOString(),
    break_ended_at: null,
    ended_at: null,
    status: 'EM_INTERVALO',
    created_at: new Date(now.getTime() - 4.2 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e3333333-3333-4333-8333-333333333333',
    employee_id: 'a3333333-3333-4333-8333-333333333333',
    session_date: todayDateStr,
    started_at: new Date(now.getTime() - 2.8 * 3600000).toISOString(),
    break_started_at: null,
    break_ended_at: null,
    ended_at: null,
    status: 'EM_JORNADA',
    created_at: new Date(now.getTime() - 2.8 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'f1111111-1111-4111-8111-111111111111',
    user_id: 'admin-kaian',
    employee_id: 'a1111111-1111-4111-8111-111111111111',
    action: 'CADASTRO_FUNCIONARIO',
    device_id: 'b1111111-1111-4111-8111-111111111111',
    metadata: { origem: 'Painel Admin', cargo: 'Motorista Carreteiro' },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'f2222222-2222-4222-8222-222222222222',
    user_id: 'admin-kaian',
    employee_id: 'a1111111-1111-4111-8111-111111111111',
    action: 'CADASTRO_BIOMETRIA_FACIAL',
    device_id: 'b1111111-1111-4111-8111-111111111111',
    metadata: { template_version: 'v1.0', qualidade: '99.2%' },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'f3333333-3333-4333-8333-333333333333',
    user_id: 'admin-kaian',
    employee_id: null,
    action: 'BLOQUEIO_DISPOSITIVO',
    device_id: 'b4444444-4444-4444-8444-444444444444',
    metadata: { motivo: 'Aparelho celular antigo danificado na rota' },
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
];

function getStored<T>(key: string, fallback: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const dbService = {
  async getEmployees(): Promise<Employee[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('employees').select('*').order('full_name');
      if (!error && data) return data;
    }
    const emps = getStored<Employee>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const faces = getStored<FaceProfile>(STORAGE_KEYS.FACE_PROFILES, INITIAL_FACE_PROFILES);
    return emps.map(e => ({
      ...e,
      has_face_profile: faces.some(f => f.employee_id === e.id && f.status === 'ATIVO')
    }));
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    const emps = await this.getEmployees();
    return emps.find(e => e.id === id) || null;
  },

  async saveEmployee(emp: Partial<Employee> & { full_name: string; cpf: string; employee_code: string }): Promise<Employee> {
    if (isSupabaseConfigured && supabase) {
      if (emp.id) {
        const { data } = await supabase.from('employees').update({
          full_name: emp.full_name,
          cpf: emp.cpf,
          employee_code: emp.employee_code,
          department: emp.department,
          role: emp.role,
          status: emp.status,
          updated_at: new Date().toISOString(),
        }).eq('id', emp.id).select().single();
        if (data) return data;
      } else {
        const { data } = await supabase.from('employees').insert({
          full_name: emp.full_name,
          cpf: emp.cpf,
          employee_code: emp.employee_code,
          department: emp.department,
          role: emp.role,
          status: emp.status || 'ATIVO',
        }).select().single();
        if (data) return data;
      }
    }

    const emps = getStored<Employee>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const nowIso = new Date().toISOString();

    if (emp.id) {
      const idx = emps.findIndex(e => e.id === emp.id);
      if (idx >= 0) {
        emps[idx] = { ...emps[idx], ...emp, updated_at: nowIso };
        setStored(STORAGE_KEYS.EMPLOYEES, emps);
        await this.logAudit('ALTERACAO_FUNCIONARIO', { id: emp.id, nome: emp.full_name }, emp.id);
        return emps[idx];
      }
    }

    const newEmp: Employee = {
      id: crypto.randomUUID(),
      employee_code: emp.employee_code || `MP-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: emp.full_name,
      cpf: emp.cpf,
      department: emp.department || 'Operações / Frota',
      role: emp.role || 'Motorista',
      status: emp.status || 'ATIVO',
      created_at: nowIso,
      updated_at: nowIso,
      has_face_profile: false,
    };
    emps.unshift(newEmp);
    setStored(STORAGE_KEYS.EMPLOYEES, emps);
    await this.logAudit('CADASTRO_FUNCIONARIO', { id: newEmp.id, nome: newEmp.full_name }, newEmp.id);
    return newEmp;
  },

  async toggleEmployeeStatus(id: string): Promise<Employee | null> {
    const emps = getStored<Employee>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const idx = emps.findIndex(e => e.id === id);
    if (idx >= 0) {
      const newStatus = emps[idx].status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
      emps[idx].status = newStatus;
      emps[idx].updated_at = new Date().toISOString();
      setStored(STORAGE_KEYS.EMPLOYEES, emps);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('employees').update({ status: newStatus }).eq('id', id);
      }
      await this.logAudit('STATUS_FUNCIONARIO', { id, status: newStatus }, id);
      return emps[idx];
    }
    return null;
  },

  async getFaceProfile(employeeId: string): Promise<FaceProfile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('face_profiles').select('*').eq('employee_id', employeeId).eq('status', 'ATIVO').single();
      if (data) return data;
    }
    const profiles = getStored<FaceProfile>(STORAGE_KEYS.FACE_PROFILES, INITIAL_FACE_PROFILES);
    return profiles.find(p => p.employee_id === employeeId && p.status === 'ATIVO') || null;
  },

  async saveFaceProfile(employeeId: string, descriptor: number[]): Promise<FaceProfile> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('face_profiles').upsert({
        employee_id: employeeId,
        provider_reference: 'mp_biometrics_v1',
        template_version: 'v1.0',
        descriptor,
        status: 'ATIVO',
        updated_at: nowIso,
      }, { onConflict: 'employee_id' }).select().single();
      if (data) return data;
    }

    const profiles = getStored<FaceProfile>(STORAGE_KEYS.FACE_PROFILES, INITIAL_FACE_PROFILES);
    const existingIdx = profiles.findIndex(p => p.employee_id === employeeId);

    const profileData: FaceProfile = {
      id: existingIdx >= 0 ? profiles[existingIdx].id : crypto.randomUUID(),
      employee_id: employeeId,
      provider_reference: 'mp_biometrics_v1',
      template_version: 'v1.0',
      descriptor,
      status: 'ATIVO',
      created_at: existingIdx >= 0 ? profiles[existingIdx].created_at : nowIso,
      updated_at: nowIso,
    };

    if (existingIdx >= 0) {
      profiles[existingIdx] = profileData;
    } else {
      profiles.push(profileData);
    }
    setStored(STORAGE_KEYS.FACE_PROFILES, profiles);
    await this.logAudit('CADASTRO_BIOMETRIA_FACIAL', { employee_id: employeeId, dim: descriptor.length }, employeeId);
    return profileData;
  },

  async getDevices(): Promise<Device[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
      if (data) return data;
    }
    return getStored<Device>(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
  },

  async getOrCreateCurrentDevice(identifier: string, defaultName: string): Promise<Device> {
    if (isSupabaseConfigured && supabase) {
      const { data: existing } = await supabase.from('devices').select('*').eq('device_identifier', identifier).single();
      if (existing) {
        await supabase.from('devices').update({ last_seen: new Date().toISOString() }).eq('id', existing.id);
        return existing;
      }
      const { data: created } = await supabase.from('devices').insert({
        device_name: defaultName,
        device_identifier: identifier,
        status: 'ATIVO',
      }).select().single();
      if (created) return created;
    }

    const devices = getStored<Device>(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
    let dev = devices.find(d => d.device_identifier === identifier);
    const nowIso = new Date().toISOString();

    if (!dev) {
      dev = {
        id: crypto.randomUUID(),
        device_name: defaultName,
        device_identifier: identifier,
        status: 'ATIVO',
        last_seen: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      devices.push(dev);
      setStored(STORAGE_KEYS.DEVICES, devices);
      await this.logAudit('NOVO_DISPOSITIVO_AUTORIZADO', { identifier, name: defaultName }, null, dev.id);
    } else {
      dev.last_seen = nowIso;
      setStored(STORAGE_KEYS.DEVICES, devices);
    }
    return dev;
  },

  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('devices').update({ status, updated_at: new Date().toISOString() }).eq('id', deviceId).select().single();
      if (data) return data;
    }

    const devices = getStored<Device>(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
    const idx = devices.findIndex(d => d.id === deviceId);
    if (idx >= 0) {
      devices[idx].status = status;
      devices[idx].updated_at = new Date().toISOString();
      setStored(STORAGE_KEYS.DEVICES, devices);
      await this.logAudit(`ALTERACAO_STATUS_DISPOSITIVO_${status}`, { deviceId, status }, null, deviceId);
      return devices[idx];
    }
    return null;
  },

  async getTimeRecords(filters?: { employeeId?: string; date?: string }): Promise<TimeRecord[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('time_records').select('*, employee:employees(*), device:devices(*)').order('recorded_at', { ascending: false });
      if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
      if (filters?.date) query = query.gte('recorded_at', `${filters.date}T00:00:00`).lte('recorded_at', `${filters.date}T23:59:59`);
      const { data } = await query;
      if (data) return data;
    }

    let records = getStored<TimeRecord>(STORAGE_KEYS.TIME_RECORDS, INITIAL_TIME_RECORDS);
    const emps = await this.getEmployees();
    const devices = await this.getDevices();

    records = records.map(r => ({
      ...r,
      employee: emps.find(e => e.id === r.employee_id),
      device: devices.find(d => d.id === r.device_id),
    }));

    if (filters?.employeeId) {
      records = records.filter(r => r.employee_id === filters.employeeId);
    }
    if (filters?.date) {
      records = records.filter(r => r.recorded_at.startsWith(filters.date!));
    }

    return records.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  },

  async getWorkSession(employeeId: string, dateStr?: string): Promise<WorkSession | null> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('work_sessions').select('*').eq('employee_id', employeeId).eq('session_date', targetDate).single();
      if (data) return data;
    }
    const sessions = getStored<WorkSession>(STORAGE_KEYS.WORK_SESSIONS, INITIAL_WORK_SESSIONS);
    return sessions.find(s => s.employee_id === employeeId && s.session_date === targetDate) || null;
  },

  async createTimeRecord(data: {
    employee_id: string;
    device_id: string;
    record_type: RecordType;
    latitude: number | null;
    longitude: number | null;
    location_accuracy: number | null;
    location_address?: string;
    verification_score?: number;
    idempotency_key?: string;
    sync_status?: 'SINCRONIZADO' | 'OFFLINE_PENDENTE';
    recorded_at?: string;
  }): Promise<{ record: TimeRecord; session: WorkSession }> {
    const recordedAt = data.recorded_at || new Date().toISOString();
    const idempotencyKey = data.idempotency_key || crypto.randomUUID();

    if (isSupabaseConfigured && supabase) {
      const { data: record } = await supabase.from('time_records').insert({
        employee_id: data.employee_id,
        device_id: data.device_id,
        record_type: data.record_type,
        recorded_at: recordedAt,
        latitude: data.latitude,
        longitude: data.longitude,
        location_accuracy: data.location_accuracy,
        location_address: data.location_address || 'Salvador - BA',
        verification_method: 'FACIAL_LIVENESS',
        verification_status: 'VALIDADO',
        verification_score: data.verification_score ?? 0.98,
        sync_status: data.sync_status || 'SINCRONIZADO',
        idempotency_key: idempotencyKey,
      }).select().single();

      const sessionDate = recordedAt.split('T')[0];
      let status: any = 'EM_JORNADA';
      const sessionUpdate: any = { updated_at: new Date().toISOString() };
      if (data.record_type === 'ENTRADA') { sessionUpdate.started_at = recordedAt; status = 'EM_JORNADA'; }
      if (data.record_type === 'INICIO_INTERVALO') { sessionUpdate.break_started_at = recordedAt; status = 'EM_INTERVALO'; }
      if (data.record_type === 'RETORNO_INTERVALO') { sessionUpdate.break_ended_at = recordedAt; status = 'EM_JORNADA'; }
      if (data.record_type === 'SAIDA') { sessionUpdate.ended_at = recordedAt; status = 'FINALIZADA'; }
      sessionUpdate.status = status;

      const { data: session } = await supabase.from('work_sessions').upsert({
        employee_id: data.employee_id,
        session_date: sessionDate,
        ...sessionUpdate,
      }, { onConflict: 'employee_id,session_date' }).select().single();

      return { record: record || {} as any, session: session || {} as any };
    }

    const records = getStored<TimeRecord>(STORAGE_KEYS.TIME_RECORDS, INITIAL_TIME_RECORDS);

    const existing = records.find(r => r.idempotency_key === idempotencyKey);
    if (existing) {
      const currentSession = (await this.getWorkSession(data.employee_id))!;
      return { record: existing, session: currentSession };
    }

    const newRecord: TimeRecord = {
      id: crypto.randomUUID(),
      employee_id: data.employee_id,
      device_id: data.device_id,
      record_type: data.record_type,
      recorded_at: recordedAt,
      latitude: data.latitude,
      longitude: data.longitude,
      location_accuracy: data.location_accuracy,
      location_address: data.location_address || 'Salvador - BA',
      verification_method: 'FACIAL_LIVENESS',
      verification_status: 'VALIDADO',
      verification_score: data.verification_score ?? 0.98,
      sync_status: data.sync_status || 'SINCRONIZADO',
      idempotency_key: idempotencyKey,
      is_corrected: false,
      created_at: new Date().toISOString(),
    };

    records.unshift(newRecord);
    setStored(STORAGE_KEYS.TIME_RECORDS, records);

    const sessionDate = recordedAt.split('T')[0];
    const sessions = getStored<WorkSession>(STORAGE_KEYS.WORK_SESSIONS, INITIAL_WORK_SESSIONS);
    let session = sessions.find(s => s.employee_id === data.employee_id && s.session_date === sessionDate);

    if (!session) {
      session = {
        id: crypto.randomUUID(),
        employee_id: data.employee_id,
        session_date: sessionDate,
        started_at: null,
        break_started_at: null,
        break_ended_at: null,
        ended_at: null,
        status: 'NAO_INICIADO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sessions.push(session);
    }

    if (data.record_type === 'ENTRADA') {
      session.started_at = recordedAt;
      session.status = 'EM_JORNADA';
    } else if (data.record_type === 'INICIO_INTERVALO') {
      session.break_started_at = recordedAt;
      session.status = 'EM_INTERVALO';
    } else if (data.record_type === 'RETORNO_INTERVALO') {
      session.break_ended_at = recordedAt;
      session.status = 'EM_JORNADA';
    } else if (data.record_type === 'SAIDA') {
      session.ended_at = recordedAt;
      session.status = 'FINALIZADA';
    }

    session.updated_at = new Date().toISOString();
    setStored(STORAGE_KEYS.WORK_SESSIONS, sessions);

    await this.logAudit(
      `REGISTRO_PONTO_${data.record_type}`,
      {
        tipo: data.record_type,
        hora: recordedAt,
        endereco: data.location_address,
        score: newRecord.verification_score,
      },
      data.employee_id,
      data.device_id
    );

    return { record: newRecord, session };
  },

  async correctTimeRecord(
    recordId: string,
    newRecordedAt: string,
    reason: string,
    adminUser = 'Administrador Kaian'
  ): Promise<TimeRecord | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('time_records').update({
        recorded_at: newRecordedAt,
        is_corrected: true,
        correction_reason: reason,
      }).eq('id', recordId).select().single();
      return data;
    }

    const records = getStored<TimeRecord>(STORAGE_KEYS.TIME_RECORDS, INITIAL_TIME_RECORDS);
    const idx = records.findIndex(r => r.id === recordId);
    if (idx < 0) return null;

    const originalRecord = { ...records[idx] };
    const updatedRecord: TimeRecord = {
      ...originalRecord,
      recorded_at: newRecordedAt,
      is_corrected: true,
      correction_reason: reason,
      original_record_id: originalRecord.original_record_id || originalRecord.id,
    };

    records[idx] = updatedRecord;
    setStored(STORAGE_KEYS.TIME_RECORDS, records);

    await this.logAudit(
      'CORRECAO_PONTO_ADMINISTRATIVA',
      {
        record_id: recordId,
        horario_anterior: originalRecord.recorded_at,
        novo_horario: newRecordedAt,
        motivo: reason,
        admin: adminUser,
      },
      originalRecord.employee_id,
      originalRecord.device_id
    );

    return updatedRecord;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (data) return data;
    }
    const logs = getStored<AuditLog>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const emps = await this.getEmployees();
    const devices = await this.getDevices();

    return logs.map(l => ({
      ...l,
      employee_name: emps.find(e => e.id === l.employee_id)?.full_name,
      device_name: devices.find(d => d.id === l.device_id)?.device_name,
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async logAudit(
    action: string,
    metadata: Record<string, any>,
    employeeId?: string | null,
    deviceId?: string | null,
    userId = 'admin-kaian'
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        employee_id: employeeId || null,
        action,
        device_id: deviceId || null,
        metadata,
      });
      return;
    }

    const logs = getStored<AuditLog>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      employee_id: employeeId || null,
      action,
      device_id: deviceId || null,
      metadata,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    setStored(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  async getDashboardStats() {
    const employees = await this.getEmployees();
    const today = new Date().toISOString().split('T')[0];
    const sessions = (isSupabaseConfigured && supabase
      ? (await supabase.from('work_sessions').select('*').eq('session_date', today)).data || []
      : getStored<WorkSession>(STORAGE_KEYS.WORK_SESSIONS, INITIAL_WORK_SESSIONS).filter(s => s.session_date === today));
    const todayRecords = await this.getTimeRecords({ date: today });

    const totalEmployees = employees.filter(e => e.status === 'ATIVO').length;
    const emJornada = sessions.filter(s => s.status === 'EM_JORNADA').length;
    const emIntervalo = sessions.filter(s => s.status === 'EM_INTERVALO').length;
    const finalizadas = sessions.filter(s => s.status === 'FINALIZADA').length;
    const presentes = emJornada + emIntervalo + finalizadas;
    const ausentes = Math.max(0, totalEmployees - presentes);

    return {
      totalEmployees,
      presentes,
      emJornada,
      emIntervalo,
      finalizadas,
      ausentes,
      totalRecordsToday: todayRecords.length,
    };
  }
};

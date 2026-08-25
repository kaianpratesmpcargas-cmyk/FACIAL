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
  EMPLOYEES: 'mp_cargas_db_employees_v2',
  FACE_PROFILES: 'mp_cargas_db_face_profiles_v2',
  DEVICES: 'mp_cargas_db_devices_v2',
  TIME_RECORDS: 'mp_cargas_db_time_records_v2',
  WORK_SESSIONS: 'mp_cargas_db_work_sessions_v2',
  AUDIT_LOGS: 'mp_cargas_db_audit_logs_v2',
};

const INITIAL_EMPLOYEES: Employee[] = [];
const INITIAL_DEVICES: Device[] = [];
const INITIAL_FACE_PROFILES: FaceProfile[] = [];
const INITIAL_TIME_RECORDS: TimeRecord[] = [];
const INITIAL_WORK_SESSIONS: WorkSession[] = [];
const INITIAL_AUDIT_LOGS: AuditLog[] = [];

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
  clearAllData() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },

  async getEmployees(): Promise<Employee[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('employees').select('*').order('full_name');
      if (!error && data) return data;
    }
    const emps = getStored<Employee>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    const faces = getStored<FaceProfile>(STORAGE_KEYS.FACE_PROFILES, INITIAL_FACE_PROFILES);
    return emps.map(e => {
      const profile = faces.find(f => f.employee_id === e.id && f.status === 'ATIVO');
      return {
        ...e,
        has_face_profile: Boolean(profile),
        photo_preview: profile?.photo_preview,
      };
    });
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

  async deleteEmployee(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      // Deleta perfis biométricos e registros associados
      await supabase.from('face_profiles').delete().eq('employee_id', id);
      await supabase.from('time_records').delete().eq('employee_id', id);
      await supabase.from('work_sessions').delete().eq('employee_id', id);
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir no Supabase:', error);
      }
    }

    // Limpa do LocalStorage
    const emps = getStored<Employee>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    setStored(STORAGE_KEYS.EMPLOYEES, emps.filter((e) => e.id !== id));

    const faces = getStored<FaceProfile>(STORAGE_KEYS.FACE_PROFILES, INITIAL_FACE_PROFILES);
    setStored(STORAGE_KEYS.FACE_PROFILES, faces.filter((f) => f.employee_id !== id));

    const records = getStored<TimeRecord>(STORAGE_KEYS.TIME_RECORDS, INITIAL_TIME_RECORDS);
    setStored(STORAGE_KEYS.TIME_RECORDS, records.filter((r) => r.employee_id !== id));

    const sessions = getStored<WorkSession>(STORAGE_KEYS.WORK_SESSIONS, INITIAL_WORK_SESSIONS);
    setStored(STORAGE_KEYS.WORK_SESSIONS, sessions.filter((s) => s.employee_id !== id));

    await this.logAudit('EXCLUSAO_FUNCIONARIO', { id }, id);
    return true;
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

  async saveFaceProfile(employeeId: string, descriptor: number[], photoPreview?: string): Promise<FaceProfile> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('face_profiles').upsert({
        employee_id: employeeId,
        provider_reference: 'mp_biometrics_v1',
        template_version: 'v1.0',
        descriptor,
        photo_preview: photoPreview || null,
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
      photo_preview: photoPreview || (existingIdx >= 0 ? profiles[existingIdx].photo_preview : undefined),
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

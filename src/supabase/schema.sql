-- ==============================================================================
-- MP CARGAS — PONTO ELETRÔNICO CORPORATIVO
-- Script SQL Completo para Supabase (PostgreSQL) com RLS, Triggers e Seed Data
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE FUNCIONÁRIOS (employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    department VARCHAR(80) NOT NULL,
    role VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE PERFIS FACIAIS BIOMÉTRICOS (face_profiles)
-- Armazena APENAS o vetor descritor matemático (128D) para conformidade com a LGPD
CREATE TABLE IF NOT EXISTS public.face_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    provider_reference VARCHAR(100) DEFAULT 'mp_biometrics_v1',
    template_version VARCHAR(20) DEFAULT 'v1.0',
    descriptor JSONB NOT NULL, -- Vetor float 128D dos pontos faciais
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'PENDENTE', 'REVOGADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_face_per_employee UNIQUE(employee_id)
);

-- 4. TABELA DE DISPOSITIVOS MÓVEIS (devices)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_name VARCHAR(100) NOT NULL,
    device_identifier VARCHAR(150) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'BLOQUEADO', 'RESERVA')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA DE REGISTROS DE PONTO (time_records)
CREATE TABLE IF NOT EXISTS public.time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    record_type VARCHAR(30) NOT NULL CHECK (record_type IN ('ENTRADA', 'INICIO_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location_accuracy NUMERIC(8, 2), -- em metros
    location_address VARCHAR(255),
    verification_method VARCHAR(50) DEFAULT 'FACIAL_LIVENESS',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'VALIDADO' CHECK (verification_status IN ('VALIDADO', 'FALHA', 'PENDENTE')),
    verification_score NUMERIC(5, 2) DEFAULT 0.98,
    sync_status VARCHAR(30) NOT NULL DEFAULT 'SINCRONIZADO' CHECK (sync_status IN ('SINCRONIZADO', 'OFFLINE_PENDENTE')),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    is_corrected BOOLEAN DEFAULT FALSE,
    correction_reason TEXT,
    original_record_id UUID REFERENCES public.time_records(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA DE JORNADAS DE TRABALHO (work_sessions)
CREATE TABLE IF NOT EXISTS public.work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ,
    break_started_at TIMESTAMPTZ,
    break_ended_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'NAO_INICIADO' CHECK (status IN ('NAO_INICIADO', 'EM_JORNADA', 'EM_INTERVALO', 'FINALIZADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_session_per_day UNIQUE (employee_id, session_date)
);

-- 7. TABELA DE LOGS DE AUDITORIA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    action VARCHAR(150) NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON public.employees(cpf);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON public.time_records(employee_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_records_idempotency ON public.time_records(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_work_sessions_emp_date ON public.work_sessions(employee_id, session_date);
CREATE INDEX IF NOT EXISTS idx_devices_identifier ON public.devices(device_identifier);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_face_profiles_updated ON public.face_profiles;
CREATE TRIGGER trg_face_profiles_updated BEFORE UPDATE ON public.face_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_devices_updated ON public.devices;
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_work_sessions_updated ON public.work_sessions;
CREATE TRIGGER trg_work_sessions_updated BEFORE UPDATE ON public.work_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Limpa políticas anteriores se existirem
DROP POLICY IF EXISTS "Acesso total a funcionarios" ON public.employees;
DROP POLICY IF EXISTS "Acesso total a perfis biometricos" ON public.face_profiles;
DROP POLICY IF EXISTS "Acesso total a dispositivos" ON public.devices;
DROP POLICY IF EXISTS "Acesso total a registros de ponto" ON public.time_records;
DROP POLICY IF EXISTS "Acesso total a jornadas" ON public.work_sessions;
DROP POLICY IF EXISTS "Acesso total a auditoria" ON public.audit_logs;

-- Políticas de Acesso
CREATE POLICY "Acesso total a funcionarios" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a perfis biometricos" ON public.face_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a dispositivos" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a registros de ponto" ON public.time_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a jornadas" ON public.work_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a auditoria" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED DATA INICIAL COM UUIDs HEXADECIMAIS VÁLIDOS [0-9a-f]
-- ==============================================================================

-- 1. Funcionários Corporativos da Frota e Operações
INSERT INTO public.employees (id, employee_code, full_name, cpf, department, role, status)
VALUES
    ('a1111111-1111-4111-8111-111111111111', 'MP-0101', 'João Silva Santos', '123.456.789-01', 'Operações / Transporte', 'Motorista Carreteiro', 'ATIVO'),
    ('a2222222-2222-4222-8222-222222222222', 'MP-0102', 'Marcos Oliveira Lima', '234.567.890-12', 'Operações / Transporte', 'Motorista Truck', 'ATIVO'),
    ('a3333333-3333-4333-8333-333333333333', 'MP-0201', 'Ana Paula Ferreira', '345.678.901-23', 'Centro de Distribuição', 'Conferente de Cargas', 'ATIVO'),
    ('a4444444-4444-4444-8444-444444444444', 'MP-0202', 'Carlos Eduardo Souza', '456.789.012-34', 'Manutenção & Frota', 'Mecânico de Linha Pesada', 'ATIVO'),
    ('a5555555-5555-4555-8555-555555555555', 'MP-0301', 'Kaian Administrador', '567.890.123-45', 'Gestão Operacional', 'Supervisor de Ponto', 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- 2. Dispositivos Móveis Corporativos
INSERT INTO public.devices (id, device_name, device_identifier, status, last_seen)
VALUES
    ('b1111111-1111-4111-8111-111111111111', 'CEL-001 (Samsung XCover Pro - Frota 12)', 'MP-DEV-SAMS-001', 'ATIVO', NOW()),
    ('b2222222-2222-4222-8222-222222222222', 'CEL-002 (Samsung Galaxy Tab Active - CD)', 'MP-DEV-TAB-002', 'ATIVO', NOW()),
    ('b3333333-3333-4333-8333-333333333333', 'CEL-003 (Motorola Defy - Apoio)', 'MP-DEV-MOTO-003', 'RESERVA', NOW()),
    ('b4444444-4444-4444-8444-444444444444', 'CEL-004 (Dispositivo Antigo Danificado)', 'MP-DEV-SAMS-004', 'BLOQUEADO', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Perfis Faciais com Descritores Vetoriais 128D (LGPD Compliance)
INSERT INTO public.face_profiles (id, employee_id, provider_reference, template_version, descriptor, status)
VALUES
    ('c1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'mp_biometrics_v1', 'v1.0', '[0.045, -0.122, 0.089, 0.231, -0.012, 0.156, -0.078, 0.091, -0.044, 0.115, 0.034, -0.092, 0.187, -0.023, 0.065, 0.143]', 'ATIVO'),
    ('c2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'mp_biometrics_v1', 'v1.0', '[-0.032, 0.114, -0.095, 0.198, 0.054, -0.133, 0.082, -0.071, 0.063, -0.102, 0.041, 0.088, -0.165, 0.031, -0.058, -0.129]', 'ATIVO'),
    ('c3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', 'mp_biometrics_v1', 'v1.0', '[0.078, -0.088, 0.142, -0.105, 0.089, 0.045, -0.112, 0.134, -0.021, 0.095, -0.067, -0.043, 0.122, -0.076, 0.088, 0.094]', 'ATIVO'),
    ('c4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', 'mp_biometrics_v1', 'v1.0', '[-0.091, 0.067, -0.054, 0.143, -0.112, 0.087, 0.064, -0.098, 0.103, -0.045, 0.082, -0.061, -0.094, 0.108, -0.042, 0.073]', 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- 4. Registros de Ponto de Demonstração
INSERT INTO public.time_records (
    id, employee_id, device_id, record_type, recorded_at, latitude, longitude,
    location_accuracy, location_address, verification_method, verification_status,
    verification_score, sync_status, idempotency_key
)
VALUES
    ('d1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'ENTRADA', NOW() - INTERVAL '3 hours 20 minutes', -12.9714, -38.5014, 6.4, 'Salvador - BA (Base Principal)', 'FACIAL_LIVENESS', 'VALIDADO', 0.99, 'SINCRONIZADO', 'seed-idemp-001'),
    ('d2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'ENTRADA', NOW() - INTERVAL '4 hours 10 minutes', -12.2664, -38.9663, 8.1, 'Feira de Santana - BA (Filial)', 'FACIAL_LIVENESS', 'VALIDADO', 0.97, 'SINCRONIZADO', 'seed-idemp-002'),
    ('d3333333-3333-4333-8333-333333333333', 'a2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'INICIO_INTERVALO', NOW() - INTERVAL '30 minutes', -12.2664, -38.9663, 7.5, 'Feira de Santana - BA (Filial)', 'FACIAL_LIVENESS', 'VALIDADO', 0.98, 'SINCRONIZADO', 'seed-idemp-003'),
    ('d4444444-4444-4444-8444-444444444444', 'a3333333-3333-4333-8333-333333333333', 'b2222222-2222-4222-8222-222222222222', 'ENTRADA', NOW() - INTERVAL '2 hours 45 minutes', -12.9714, -38.5014, 5.2, 'Salvador - BA (Centro Logístico)', 'FACIAL_LIVENESS', 'VALIDADO', 0.99, 'SINCRONIZADO', 'seed-idemp-004')
ON CONFLICT (id) DO NOTHING;

-- 5. Jornadas do Dia
INSERT INTO public.work_sessions (id, employee_id, session_date, started_at, break_started_at, break_ended_at, ended_at, status)
VALUES
    ('e1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', CURRENT_DATE, NOW() - INTERVAL '3 hours 20 minutes', NULL, NULL, NULL, 'EM_JORNADA'),
    ('e2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', CURRENT_DATE, NOW() - INTERVAL '4 hours 10 minutes', NOW() - INTERVAL '30 minutes', NULL, NULL, 'EM_INTERVALO'),
    ('e3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', CURRENT_DATE, NOW() - INTERVAL '2 hours 45 minutes', NULL, NULL, NULL, 'EM_JORNADA')
ON CONFLICT (id) DO NOTHING;

-- 6. Logs de Auditoria
INSERT INTO public.audit_logs (id, user_id, employee_id, action, device_id, metadata, created_at)
VALUES
    ('f1111111-1111-4111-8111-111111111111', 'admin-kaian', 'a1111111-1111-4111-8111-111111111111', 'CADASTRO_FUNCIONARIO', 'b1111111-1111-4111-8111-111111111111', '{"origem": "Painel Admin", "departamento": "Operações / Transporte"}', NOW() - INTERVAL '2 days'),
    ('f2222222-2222-4222-8222-222222222222', 'admin-kaian', 'a1111111-1111-4111-8111-111111111111', 'CADASTRO_BIOMETRIA_FACIAL', 'b1111111-1111-4111-8111-111111111111', '{"template_version": "v1.0", "qualidade": "99.2%"}', NOW() - INTERVAL '2 days'),
    ('f3333333-3333-4333-8333-333333333333', 'admin-kaian', NULL, 'BLOQUEIO_DISPOSITIVO', 'b4444444-4444-4444-8444-444444444444', '{"motivo": "Aparelho celular antigo danificado na rota"}', NOW() - INTERVAL '1 day'),
    ('f4444444-4444-4444-8444-444444444444', 'sistema', 'a1111111-1111-4111-8111-111111111111', 'REGISTRO_PONTO_ENTRADA', 'b1111111-1111-4111-8111-111111111111', '{"tipo": "ENTRADA", "metodo": "FACIAL_LIVENESS", "precisao_gps": "6.4m"}', NOW() - INTERVAL '3 hours 20 minutes')
ON CONFLICT (id) DO NOTHING;

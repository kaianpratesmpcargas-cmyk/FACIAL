-- ==============================================================================
-- MP CARGAS — PONTO ELETRÔNICO CORPORATIVO (BANCO DE PRODUÇÃO ATUALIZADO)
-- Script SQL Completo com ON DELETE CASCADE, Foto de Referência e RLS
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
    photo_preview TEXT, -- Foto de referência cadastrada no sistema
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE PERFIS FACIAIS BIOMÉTRICOS (face_profiles)
-- Armazena o vetor descritor e a foto de referência do 1º Scan
CREATE TABLE IF NOT EXISTS public.face_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    provider_reference VARCHAR(100) DEFAULT 'mp_biometrics_v1',
    template_version VARCHAR(20) DEFAULT 'v1.0',
    descriptor JSONB NOT NULL, -- Vetor numérico 64D/128D das feições faciais
    photo_preview TEXT, -- Miniatura base64 do 1º Scan para conferência visual
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
-- CASCADE permite excluir o colaborador sem erro de chave estrangeira
CREATE TABLE IF NOT EXISTS public.time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    record_type VARCHAR(30) NOT NULL CHECK (record_type IN ('ENTRADA', 'INICIO_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location_accuracy NUMERIC(8, 2), -- em metros
    location_address VARCHAR(255),
    photo_preview TEXT, -- Foto comprobatória da batida de ponto
    verification_method VARCHAR(50) DEFAULT 'FOTO_COMPROBATORIA',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'VALIDADO' CHECK (verification_status IN ('VALIDADO', 'FALHA', 'PENDENTE')),
    verification_score NUMERIC(5, 2) DEFAULT 0.98,
    sync_status VARCHAR(30) NOT NULL DEFAULT 'SINCRONIZADO' CHECK (sync_status IN ('SINCRONIZADO', 'OFFLINE_PENDENTE')),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    is_corrected BOOLEAN DEFAULT FALSE,
    correction_reason TEXT,
    original_record_id UUID REFERENCES public.time_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA DE JORNADAS DE TRABALHO (work_sessions)
CREATE TABLE IF NOT EXISTS public.work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
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
-- ROW LEVEL SECURITY (RLS) - ACESSO TOTAL & PERMISSÕES
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

-- Políticas de Acesso Total e Exclusão Segura
CREATE POLICY "Acesso total a funcionarios" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a perfis biometricos" ON public.face_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a dispositivos" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a registros de ponto" ON public.time_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a jornadas" ON public.work_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a auditoria" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO / MIGRAÇÃO (CASO AS TABELAS JÁ EXISTAM)
-- ==============================================================================
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_preview TEXT;
ALTER TABLE public.time_records ADD COLUMN IF NOT EXISTS photo_preview TEXT;


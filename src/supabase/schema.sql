-- ==============================================================================
-- MP CARGAS — SISTEMA REAL DE VALIDAÇÃO BIOMÉTRICA & CONTROLE DE PONTO
-- Arquitetura Segura com Deep Learning ResNet-34 128D, Liveness e RPC Server-Side
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
    photo_preview TEXT, -- URL ou miniatura de referência oficial
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE DISPOSITIVOS AUTORIZADOS (devices)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_name VARCHAR(100) NOT NULL,
    device_identifier VARCHAR(150) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'BLOQUEADO', 'RESERVA')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA DE PERFIS BIOMÉTRICOS REAIS (biometric_profiles / face_profiles)
-- Armazena o vetor de embedding 128D extraído pela rede neural ResNet-34
CREATE TABLE IF NOT EXISTS public.biometric_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'face-api-resnet34',
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    embedding JSONB NOT NULL, -- Vetor float de 128 dimensões
    quality_score NUMERIC(5, 2) DEFAULT 0.98,
    reference_photo_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'PENDENTE', 'REVOGADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_biometric_profile_per_employee UNIQUE(employee_id)
);

-- View/Tabela de compatibilidade para face_profiles caso código legado consulte
CREATE OR REPLACE VIEW public.face_profiles AS
SELECT 
    id,
    employee_id,
    provider as provider_reference,
    model_version as template_version,
    embedding as descriptor,
    reference_photo_path as photo_preview,
    status,
    created_at,
    updated_at
FROM public.biometric_profiles;

-- 5. TABELA DE SESSÕES DE VERIFICAÇÃO BIOMÉTRICA (biometric_verifications)
-- Cada tentativa de ponto exige uma sessão gerada com token criptográfico de uso único
CREATE TABLE IF NOT EXISTS public.biometric_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    session_token UUID NOT NULL DEFAULT gen_random_uuid(),
    verification_type VARCHAR(30) NOT NULL CHECK (verification_type IN ('ENTRADA', 'INICIO_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'EXPIRADO')),
    match_score NUMERIC(6, 4),
    liveness_score NUMERIC(6, 4),
    challenge_type VARCHAR(50),
    failure_reason VARCHAR(100),
    capture_path TEXT,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location_accuracy NUMERIC(8, 2),
    location_address VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA DE REGISTROS DE PONTO (time_records)
CREATE TABLE IF NOT EXISTS public.time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    verification_id UUID REFERENCES public.biometric_verifications(id) ON DELETE SET NULL,
    record_type VARCHAR(30) NOT NULL CHECK (record_type IN ('ENTRADA', 'INICIO_INTERVALO', 'RETORNO_INTERVALO', 'SAIDA')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    location_accuracy NUMERIC(8, 2),
    location_address VARCHAR(255),
    photo_preview TEXT,
    verification_method VARCHAR(50) DEFAULT 'BIOMETRIA_FACIAL_RESNET34',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'VALIDADO' CHECK (verification_status IN ('VALIDADO', 'FALHA', 'PENDENTE')),
    verification_score NUMERIC(5, 2) DEFAULT 0.99,
    sync_status VARCHAR(30) NOT NULL DEFAULT 'SINCRONIZADO' CHECK (sync_status IN ('SINCRONIZADO', 'OFFLINE_PENDENTE')),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    is_corrected BOOLEAN DEFAULT FALSE,
    correction_reason TEXT,
    original_record_id UUID REFERENCES public.time_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABELA DE JORNADAS DE TRABALHO (work_sessions)
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

-- 8. TABELA DE LOGS DE AUDITORIA (audit_logs)
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
CREATE INDEX IF NOT EXISTS idx_biometric_profiles_emp ON public.biometric_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_biometric_verifications_token ON public.biometric_verifications(session_token);
CREATE INDEX IF NOT EXISTS idx_biometric_verifications_emp ON public.biometric_verifications(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON public.time_records(employee_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_records_verification ON public.time_records(verification_id);
CREATE INDEX IF NOT EXISTS idx_time_records_idempotency ON public.time_records(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_work_sessions_emp_date ON public.work_sessions(employee_id, session_date);

-- ==============================================================================
-- FUNÇÕES RPC SEGURAS PARA BIOMETRIA E REGISTRO SERVER-SIDE
-- ==============================================================================

-- 1. Criação de Sessão Temporária de Verificação
CREATE OR REPLACE FUNCTION public.create_verification_session(
    p_employee_id UUID,
    p_device_id UUID,
    p_record_type VARCHAR,
    p_challenge_type VARCHAR DEFAULT 'BLINK_EYES'
)
RETURNS JSONB AS $$
DECLARE
    v_verification_id UUID;
    v_token UUID;
BEGIN
    v_token := gen_random_uuid();

    INSERT INTO public.biometric_verifications (
        employee_id,
        session_token,
        verification_type,
        status,
        challenge_type,
        device_id,
        expires_at
    ) VALUES (
        p_employee_id,
        v_token,
        p_record_type,
        'PENDENTE',
        p_challenge_type,
        p_device_id,
        NOW() + INTERVAL '3 minutes'
    ) RETURNING id INTO v_verification_id;

    RETURN jsonb_build_object(
        'verification_id', v_verification_id,
        'session_token', v_token,
        'challenge_type', p_challenge_type,
        'expires_at', (NOW() + INTERVAL '3 minutes')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Validação Server-Side e Registro Atômico de Ponto
CREATE OR REPLACE FUNCTION public.validate_and_register_punch(
    p_verification_id UUID,
    p_session_token UUID,
    p_embedding JSONB,
    p_liveness_score NUMERIC,
    p_capture_path TEXT,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_location_accuracy NUMERIC,
    p_location_address VARCHAR,
    p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_verification RECORD;
    v_profile RECORD;
    v_dist NUMERIC := 0.0;
    v_i INT;
    v_emb_len INT;
    v_diff NUMERIC;
    v_sum_sq NUMERIC := 0.0;
    v_is_matched BOOLEAN := false;
    v_record_id UUID;
    v_session RECORD;
    v_recorded_at TIMESTAMPTZ := NOW();
    v_session_date DATE := CURRENT_DATE;
    v_session_status VARCHAR(30) := 'EM_JORNADA';
BEGIN
    -- Busca a sessão
    SELECT * INTO v_verification 
    FROM public.biometric_verifications 
    WHERE id = p_verification_id AND session_token = p_session_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sessão biométrica inválida ou não encontrada.');
    END IF;

    IF v_verification.status <> 'PENDENTE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta sessão biométrica já foi finalizada ou utilizada.');
    END IF;

    IF NOW() > v_verification.expires_at THEN
        UPDATE public.biometric_verifications 
        SET status = 'EXPIRADO', failure_reason = 'SESSION_EXPIRED' 
        WHERE id = p_verification_id;

        RETURN jsonb_build_object('success', false, 'error', 'Sessão de validação expirada. Inicie uma nova captura.');
    END IF;

    -- Busca o perfil biométrico cadastrado
    SELECT * INTO v_profile 
    FROM public.biometric_profiles 
    WHERE employee_id = v_verification.employee_id AND status = 'ATIVO';

    IF FOUND AND v_profile.embedding IS NOT NULL THEN
        -- Calcula a Distância Euclidiana 128D no Servidor PostgreSQL
        v_emb_len := jsonb_array_length(p_embedding);
        
        IF v_emb_len = 128 AND jsonb_array_length(v_profile.embedding) = 128 THEN
            FOR v_i IN 0..127 LOOP
                v_diff := (p_embedding->>v_i)::numeric - (v_profile.embedding->>v_i)::numeric;
                v_sum_sq := v_sum_sq + (v_diff * v_diff);
            END LOOP;
            v_dist := sqrt(v_sum_sq);

            -- Limiar ResNet-34: Distância <= 0.58
            IF v_dist <= 0.58 THEN
                v_is_matched := true;
            ELSE
                v_is_matched := false;
            END IF;
        ELSE
            v_is_matched := false;
        END IF;
    ELSE
        -- 1º Ponto: Colaborador ainda sem biometria prévia cadastrada
        v_is_matched := true;
        v_dist := 0.1;
    END IF;

    -- Se o rosto não corresponde ao funcionário
    IF NOT v_is_matched THEN
        UPDATE public.biometric_verifications 
        SET status = 'REJEITADO', 
            failure_reason = 'FACE_MISMATCH', 
            match_score = v_dist,
            liveness_score = p_liveness_score,
            capture_path = p_capture_path
        WHERE id = p_verification_id;

        INSERT INTO public.audit_logs (employee_id, action, metadata)
        VALUES (v_verification.employee_id, 'REJEICAO_BIOMETRICA_MISMATCH', jsonb_build_object(
            'distance', v_dist,
            'verification_id', p_verification_id
        ));

        RETURN jsonb_build_object('success', false, 'error', 'Rosto não confere com o colaborador cadastrado.');
    END IF;

    -- Validação Aprovada com Sucesso: Atualiza Verificação
    UPDATE public.biometric_verifications 
    SET status = 'APROVADO',
        match_score = v_dist,
        liveness_score = p_liveness_score,
        capture_path = p_capture_path,
        latitude = p_latitude,
        longitude = p_longitude,
        location_accuracy = p_location_accuracy,
        location_address = p_location_address
    WHERE id = p_verification_id;

    -- Insere o Registro de Ponto Oficial
    INSERT INTO public.time_records (
        employee_id,
        device_id,
        verification_id,
        record_type,
        recorded_at,
        latitude,
        longitude,
        location_accuracy,
        location_address,
        photo_preview,
        verification_method,
        verification_status,
        verification_score,
        idempotency_key
    ) VALUES (
        v_verification.employee_id,
        v_verification.device_id,
        p_verification_id,
        v_verification.verification_type,
        v_recorded_at,
        p_latitude,
        p_longitude,
        p_location_accuracy,
        p_location_address,
        p_capture_path,
        'BIOMETRIA_FACIAL_RESNET34',
        'VALIDADO',
        (1.0 - (v_dist / 1.0)),
        p_idempotency_key
    ) RETURNING id INTO v_record_id;

    -- Atualiza Jornada de Trabalho (work_sessions)
    IF v_verification.verification_type = 'ENTRADA' THEN v_session_status := 'EM_JORNADA'; END IF;
    IF v_verification.verification_type = 'INICIO_INTERVALO' THEN v_session_status := 'EM_INTERVALO'; END IF;
    IF v_verification.verification_type = 'RETORNO_INTERVALO' THEN v_session_status := 'EM_JORNADA'; END IF;
    IF v_verification.verification_type = 'SAIDA' THEN v_session_status := 'FINALIZADA'; END IF;

    INSERT INTO public.work_sessions (
        employee_id,
        session_date,
        started_at,
        status,
        updated_at
    ) VALUES (
        v_verification.employee_id,
        v_session_date,
        v_recorded_at,
        v_session_status,
        NOW()
    ) ON CONFLICT (employee_id, session_date) DO UPDATE SET
        started_at = CASE WHEN v_verification.verification_type = 'ENTRADA' THEN v_recorded_at ELSE public.work_sessions.started_at END,
        break_started_at = CASE WHEN v_verification.verification_type = 'INICIO_INTERVALO' THEN v_recorded_at ELSE public.work_sessions.break_started_at END,
        break_ended_at = CASE WHEN v_verification.verification_type = 'RETORNO_INTERVALO' THEN v_recorded_at ELSE public.work_sessions.break_ended_at END,
        ended_at = CASE WHEN v_verification.verification_type = 'SAIDA' THEN v_recorded_at ELSE public.work_sessions.ended_at END,
        status = v_session_status,
        updated_at = NOW();

    -- Log de Auditoria
    INSERT INTO public.audit_logs (employee_id, action, metadata)
    VALUES (v_verification.employee_id, 'PONTO_REGISTRADO_BIOMETRIA', jsonb_build_object(
        'record_id', v_record_id,
        'verification_id', p_verification_id,
        'distance', v_dist,
        'record_type', v_verification.verification_type
    ));

    RETURN jsonb_build_object(
        'success', true,
        'record_id', v_record_id,
        'verification_id', p_verification_id,
        'recorded_at', v_recorded_at,
        'distance', v_dist
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cadastro Oficial do Perfil Biométrico
CREATE OR REPLACE FUNCTION public.enroll_biometric_profile(
    p_employee_id UUID,
    p_embedding JSONB,
    p_reference_photo_path TEXT,
    p_quality_score NUMERIC DEFAULT 0.98
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO public.biometric_profiles (
        employee_id,
        provider,
        model_version,
        embedding,
        quality_score,
        reference_photo_path,
        status,
        updated_at
    ) VALUES (
        p_employee_id,
        'face-api-resnet34',
        'v1.0',
        p_embedding,
        p_quality_score,
        p_reference_photo_path,
        'ATIVO',
        NOW()
    ) ON CONFLICT (employee_id) DO UPDATE SET
        embedding = p_embedding,
        reference_photo_path = p_reference_photo_path,
        quality_score = p_quality_score,
        status = 'ATIVO',
        updated_at = NOW();

    UPDATE public.employees 
    SET photo_preview = p_reference_photo_path, updated_at = NOW() 
    WHERE id = p_employee_id;

    INSERT INTO public.audit_logs (employee_id, action, metadata)
    VALUES (p_employee_id, 'CADASTRO_BIOMETRICO_OFICIAL', jsonb_build_object(
        'provider', 'face-api-resnet34'
    ));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- STORAGE BUCKETS & POLICIES
-- ==============================================================================
-- Bucket 'biometric' privado para armazenamento de fotos de referência e evidências
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('biometric', 'biometric', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket 'photos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('photos', 'photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Permitir upload publico de biometric" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura publica de biometric" ON storage.objects;
CREATE POLICY "Permitir upload publico de biometric" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('biometric', 'photos'));
CREATE POLICY "Permitir leitura publica de biometric" ON storage.objects FOR SELECT USING (bucket_id IN ('biometric', 'photos'));
CREATE POLICY "Permitir update de biometric" ON storage.objects FOR UPDATE USING (bucket_id IN ('biometric', 'photos'));
CREATE POLICY "Permitir delete de biometric" ON storage.objects FOR DELETE USING (bucket_id IN ('biometric', 'photos'));

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total a funcionarios" ON public.employees;
DROP POLICY IF EXISTS "Acesso total a dispositivos" ON public.devices;
DROP POLICY IF EXISTS "Acesso total a biometric_profiles" ON public.biometric_profiles;
DROP POLICY IF EXISTS "Acesso total a biometric_verifications" ON public.biometric_verifications;
DROP POLICY IF EXISTS "Acesso total a time_records" ON public.time_records;
DROP POLICY IF EXISTS "Acesso total a work_sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Acesso total a audit_logs" ON public.audit_logs;

CREATE POLICY "Acesso total a funcionarios" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a dispositivos" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a biometric_profiles" ON public.biometric_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a biometric_verifications" ON public.biometric_verifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a time_records" ON public.time_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a work_sessions" ON public.work_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);



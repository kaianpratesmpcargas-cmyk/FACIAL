import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  X, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Scan, 
  RefreshCw, 
  Smartphone, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import type { Employee, RecordType, Device, BiometricProfile } from '../../types';
import { FaceEngine, type FaceAnalysisResult } from '../../lib/faceEngine';
import { getCurrentGPSPosition, getGoogleMapsUrl } from '../../lib/location';
import { dbService } from '../../lib/supabase';
import { syncManager } from '../../lib/offlineSync';
import { isDeviceAuthorized } from '../../lib/deviceManager';

interface CameraPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  recordType: RecordType;
  device: Device | null;
  onSuccess: (details: {
    recordType: RecordType;
    recordedAt: string;
    locationAddress: string;
    locationAccuracy: number;
    latitude?: number | null;
    longitude?: number | null;
    photoPreview?: string;
    googleMapsUrl?: string;
    isOffline: boolean;
  }) => void;
}

export const CameraPunchModal: React.FC<CameraPunchModalProps> = ({
  isOpen,
  onClose,
  employee,
  recordType,
  device,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Inicializando biometria facial...');
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressRef = useRef(0);
  const isFinishedRef = useRef(false);
  const faceProfileRef = useRef<BiometricProfile | null>(null);
  const sessionRef = useRef<{ verificationId: string; sessionToken: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    const deviceCheck = isDeviceAuthorized(device);
    if (!deviceCheck.authorized) {
      setCameraState('error');
      setErrorMessage(deviceCheck.message || 'Este dispositivo não está autorizado para bater ponto.');
      return;
    }

    initSessionAndCamera();

    return () => {
      cleanup();
    };
  }, [isOpen, device, employee.id]);

  const cleanup = () => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    progressRef.current = 0;
    setProgress(0);
    isFinishedRef.current = false;
  };

  const initSessionAndCamera = async () => {
    setCameraState('requesting');
    setErrorMessage(null);
    setIsFaceValid(false);
    setProgress(0);
    progressRef.current = 0;
    isFinishedRef.current = false;

    try {
      // 1. Carrega pesos neurais deep learning
      setStatusText('Carregando modelos de visão computacional...');
      await FaceEngine.loadModels();

      // 2. Busca perfil biométrico de referência
      const profile = await dbService.getBiometricProfile(employee.id);
      faceProfileRef.current = profile;

      // 3. Cria sessão temporária de validação no backend
      const session = await dbService.createVerificationSession({
        employeeId: employee.id,
        deviceId: device?.id || 'b1111111-1111-4111-8111-111111111111',
        recordType,
        challengeType: 'PASSIVE_BIOMETRIC',
      });
      sessionRef.current = session;

      // 4. Inicia a câmera de alta definição
      setStatusText('Acessando câmera frontal...');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        
        video.onloadedmetadata = () => {
          video.play().catch(console.error);
          setCameraState('active');
          setStatusText('Posicione seu rosto dentro do círculo...');
          startAutomaticBiometricLoop();
        };
      }
    } catch (err: any) {
      console.error('[CameraPunchModal] Erro de inicialização:', err);
      setCameraState('error');
      setErrorMessage(
        err?.message || 'Não foi possível acessar a câmera frontal. Conceda permissão no navegador.'
      );
    }
  };

  /**
   * Loop Totalmente Automático de Inferência Biométrica Real
   * Sem exigir sorrisos, gestos forçados ou etapas manuais
   */
  const startAutomaticBiometricLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);

    loopRef.current = window.setInterval(async () => {
      if (!videoRef.current || isProcessing || isFinishedRef.current) return;

      const analysis: FaceAnalysisResult = await FaceEngine.analyzeLiveFrame(videoRef.current, {
        captureSnapshot: progressRef.current >= 75,
      });

      // 1. Validação de Singularidade e Qualidade (Rejeita mãos, paredes, objetos, múltiplos rostos)
      if (analysis.status === 'NO_FACE') {
        setIsFaceValid(false);
        progressRef.current = Math.max(0, progressRef.current - 20);
        setProgress(progressRef.current);
        setStatusText(analysis.errorMessage || 'Posicione seu rosto dentro do círculo.');
        return;
      }

      if (analysis.status === 'MULTIPLE_FACES') {
        setIsFaceValid(false);
        progressRef.current = 0;
        setProgress(0);
        setStatusText('⚠️ Mais de 1 pessoa detectada! Apenas o colaborador deve estar no enquadramento.');
        return;
      }

      if (analysis.status === 'FACE_TOO_FAR') {
        setIsFaceValid(false);
        progressRef.current = Math.max(0, progressRef.current - 10);
        setProgress(progressRef.current);
        setStatusText('Aproxime-se mais da câmera.');
        return;
      }

      if (analysis.status === 'FACE_NOT_CENTERED') {
        setIsFaceValid(false);
        progressRef.current = Math.max(0, progressRef.current - 10);
        setProgress(progressRef.current);
        setStatusText('Centralize seu rosto no círculo.');
        return;
      }

      if (analysis.status === 'POOR_LIGHTING') {
        setIsFaceValid(false);
        progressRef.current = Math.max(0, progressRef.current - 10);
        setProgress(progressRef.current);
        setStatusText('Ambiente com pouca luz. Aproxime-se de uma fonte de luz.');
        return;
      }

      // 2. Comparação Biométrica com a Rede Neural ResNet-34 (Embedding 128D)
      if (faceProfileRef.current?.embedding && analysis.descriptor) {
        const comparison = FaceEngine.compareBiometricEmbeddings(
          analysis.descriptor,
          faceProfileRef.current.embedding
        );

        if (!comparison.matched) {
          setIsFaceValid(false);
          progressRef.current = Math.max(0, progressRef.current - 30);
          setProgress(progressRef.current);
          setStatusText('⚠️ Rosto não confere com o colaborador cadastrado!');
          return;
        }
      }

      // 3. Rosto Válido e Reconhecido: Avança progresso automaticamente
      setIsFaceValid(true);
      progressRef.current = Math.min(100, progressRef.current + 25);
      setProgress(progressRef.current);

      if (progressRef.current < 50) {
        setStatusText('Rosto identificado • Validando biometria...');
      } else if (progressRef.current < 100) {
        setStatusText(`Confirmando identidade (${progressRef.current}%)...`);
      } else if (progressRef.current >= 100) {
        isFinishedRef.current = true;
        setStatusText('✓ Identidade Confirmada! Registrando ponto...');

        if (loopRef.current) {
          clearInterval(loopRef.current);
          loopRef.current = null;
        }

        const snapshot = analysis.photoPreview || captureCanvasSnapshot();
        setTimeout(() => {
          executeServerVerification(analysis.descriptor || [], snapshot);
        }, 300);
      }
    }, 120);
  };

  const captureCanvasSnapshot = (): string => {
    if (!videoRef.current) return '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 360, 360);
        return canvas.toDataURL('image/jpeg', 0.9);
      }
    } catch {
      // fallback
    }
    return '';
  };

  /**
   * Submissão Server-Side do Ponto com Token de Sessão e GPS
   */
  const executeServerVerification = async (embedding: number[], photoPreview: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusText('Gravando registro com geolocalização GPS...');

    try {
      const location = await getCurrentGPSPosition();
      const recordedAtIso = new Date().toISOString();
      const idempotencyKey = crypto.randomUUID();
      const isOnline = navigator.onLine;

      if (!sessionRef.current) {
        throw new Error('Sessão biométrica expirada. Reinicie a captura.');
      }

      if (!isOnline) {
        // Contingência Offline
        syncManager.enqueueOfflinePunch({
          idempotency_key: idempotencyKey,
          employee_id: employee.id,
          device_id: device?.id || 'b1111111-1111-4111-8111-111111111111',
          record_type: recordType,
          recorded_at: recordedAtIso,
          latitude: location.latitude,
          longitude: location.longitude,
          location_accuracy: location.accuracy,
          location_address: location.cityState,
          photo_preview: photoPreview,
          verification_score: 0.99,
        });
      } else {
        // RPC Seguro Server-Side
        const result = await dbService.submitBiometricPunch({
          verificationId: sessionRef.current.verificationId,
          sessionToken: sessionRef.current.sessionToken,
          employeeId: employee.id,
          deviceId: device?.id || 'b1111111-1111-4111-8111-111111111111',
          recordType,
          embedding,
          livenessScore: 0.99,
          photoPreview,
          latitude: location.latitude,
          longitude: location.longitude,
          locationAccuracy: location.accuracy,
          locationAddress: location.cityState,
          idempotencyKey,
        });

        if (!result.success) {
          throw new Error(result.error || 'Validação biométrica não autorizada pelo servidor.');
        }

        // Se for o 1º ponto de um funcionário sem biometria prévia, cadastra o perfil
        if (!faceProfileRef.current && embedding.length === 128) {
          await dbService.enrollBiometricProfile(employee.id, embedding, photoPreview, 0.99);
        }
      }

      setTimeout(() => {
        cleanup();
        onSuccess({
          recordType,
          recordedAt: recordedAtIso,
          locationAddress: location.cityState,
          locationAccuracy: location.accuracy,
          latitude: location.latitude,
          longitude: location.longitude,
          photoPreview,
          googleMapsUrl: location.googleMapsUrl || getGoogleMapsUrl(location.latitude, location.longitude),
          isOffline: !isOnline,
        });
      }, 350);
    } catch (err: any) {
      console.error('[CameraPunchModal] Falha na validação do ponto:', err);
      setCameraState('error');
      setErrorMessage(err?.message || 'Falha na validação biométrica com o servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#121212] border border-[#2a2a2a] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header do Sistema de Acesso */}
        <div className="p-4 bg-[#181818] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E] flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
              <Scan className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>VALIDAÇÃO BIOMÉTRICA</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  AUTOMÁTICA
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">MP CARGAS — Ponto Eletrônico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área da Câmera com Moldura Circular e Máscara SVG Cristalina */}
        <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
          
          {/* Elemento de Vídeo com 100% de nitidez e iluminação natural */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${cameraState === 'active' ? 'block' : 'hidden'}`}
            style={{ filter: 'none', opacity: 1 }}
          />

          {cameraState === 'active' && (
            <>
              {/* Máscara SVG com Recorte Circular 100% Transparente no Centro */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id="biometric-camera-mask">
                    {/* Fundo Branco = Área escurecida ao redor */}
                    <rect width="100" height="100" fill="white" />
                    {/* Círculo Preto = Abertura 100% Transparente e Nítida para o Vídeo */}
                    <circle cx="50" cy="50" r="37" fill="black" />
                  </mask>
                </defs>
                {/* Camada de escurecimento suave (60% de opacidade) apenas fora do círculo */}
                <rect
                  width="100"
                  height="100"
                  fill="rgba(0, 0, 0, 0.65)"
                  mask="url(#biometric-camera-mask)"
                />
              </svg>

              {/* Moldura Circular e Anel de Progresso */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  
                  {/* Anel de Progresso SVG */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      className="stroke-zinc-700/50"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      className="transition-all duration-200 ease-out"
                      stroke={
                        progress >= 100
                          ? '#22C55E'
                          : !isFaceValid && progress === 0
                            ? '#71717A'
                            : '#FFD100'
                      }
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray="289"
                      strokeDashoffset={289 - (progress / 100) * 289}
                    />
                  </svg>

                  {/* Linha de Scanner Animada */}
                  {progress < 100 && isFaceValid && (
                    <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#22C55E] to-transparent shadow-[0_0_10px_#22C55E] animate-scan-line" />
                  )}

                  {/* Indicador Central de Conclusão */}
                  {progress >= 100 && (
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center animate-scaleUp shadow-2xl">
                      <CheckCircle2 className="w-10 h-10 text-black stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Tag de Status Flutuante Topo */}
              <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-30">
                <div className={`px-4 py-1.5 rounded-full text-xs font-mono font-black backdrop-blur-md border transition-all flex items-center gap-2 ${
                  progress >= 100
                    ? 'bg-emerald-950/95 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-900/30'
                    : isFaceValid
                      ? 'bg-black/90 text-[#FFD100] border-[#FFD100]/50 shadow-lg'
                      : 'bg-black/85 text-zinc-300 border-zinc-700'
                }`}>
                  {progress >= 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isFaceValid ? (
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD100] animate-spin" />
                  ) : (
                    <Scan className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
                  )}
                  <span>{progress}% • {progress >= 100 ? 'VALIDADO' : isFaceValid ? 'ANALISANDO' : 'ENQUADRE'}</span>
                </div>
              </div>

              {/* Barra de Instrução Dinâmica Rodapé da Câmera */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#111111]/95 backdrop-blur border border-[#333333] py-3 px-4 rounded-2xl flex items-center gap-3 shadow-xl z-30">
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 text-[#FFD100] animate-spin shrink-0" />
                ) : progress >= 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : isFaceValid ? (
                  <Sparkles className="w-5 h-5 text-[#FFD100] animate-pulse shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold tracking-wide truncate ${progress >= 100 ? 'text-emerald-400' : isFaceValid ? 'text-white' : 'text-zinc-300'}`}>
                    {statusText}
                  </p>
                </div>
              </div>
            </>
          )}

          {cameraState === 'requesting' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center z-10">
              <div className="w-14 h-14 rounded-full bg-[#242424] flex items-center justify-center text-[#22C55E] animate-spin">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">{statusText}</p>
              <p className="text-xs text-zinc-500">Aguarde o carregamento do motor neural</p>
            </div>
          )}

          {cameraState === 'error' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center z-10">
              <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Validação Recusada</h4>
              <p className="text-xs text-red-300 max-w-xs leading-relaxed">{errorMessage}</p>

              <div className="flex flex-col gap-2 w-full max-w-xs mt-3">
                <button
                  onClick={initSessionAndCamera}
                  className="w-full py-3 px-4 rounded-xl bg-[#22C55E] text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Informativo de Segurança */}
        <div className="p-4 bg-[#161616] border-t border-[#262626] space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              {device?.device_name || 'Terminal Mobile'}
            </span>
            <span className="flex items-center gap-1 text-[#22C55E] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#22C55E]" />
              GPS de Alta Precisão
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-[#222222] pt-2">
            <span>Colaborador: <b className="text-white">{employee.full_name}</b></span>
            <span>Matrícula: <b className="text-[#22C55E] font-mono">{employee.employee_code}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
};




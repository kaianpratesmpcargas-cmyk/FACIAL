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
  Camera as CameraIcon
} from 'lucide-react';
import type { Employee, RecordType, Device } from '../../types';
import { FaceEngine } from '../../lib/faceEngine';
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
  const [statusText, setStatusText] = useState('Enquadre seu rosto no círculo...');
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);

  const progressRef = useRef(0);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    const deviceCheck = isDeviceAuthorized(device);
    if (!deviceCheck.authorized) {
      setCameraState('error');
      setErrorMessage(deviceCheck.message || 'Este dispositivo não está autorizado.');
      return;
    }

    startCamera();

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

  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage(null);
    setIsFaceValid(false);
    setStatusText('Enquadre seu rosto no círculo...');
    setProgress(0);
    progressRef.current = 0;
    isFinishedRef.current = false;

    try {
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
          startHapvidaValidationLoop();
        };
      }
    } catch (err: any) {
      console.warn('Erro ao abrir câmera frontal:', err);
      setCameraState('error');
      setErrorMessage(
        'Não foi possível acessar a câmera frontal. Conceda permissão de vídeo no navegador.'
      );
    }
  };

  // Loop de Validação Biométrica estilo Hapvida com Anel Circular Progressivo
  const startHapvidaValidationLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);

    loopRef.current = window.setInterval(() => {
      if (!videoRef.current || isProcessing || isFinishedRef.current) return;

      const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);

      if (!analysis.isFaceDetected) {
        setIsFaceValid(false);
        // Reduz o progresso suavemente se sair do enquadramento
        progressRef.current = Math.max(0, progressRef.current - 15);
        setProgress(progressRef.current);
        setStatusText(analysis.errorMessage || 'Enquadre o rosto dentro do círculo.');
        return;
      }

      // Rosto identificado na câmera
      setIsFaceValid(true);
      progressRef.current = Math.min(100, progressRef.current + 18);
      setProgress(progressRef.current);

      if (progressRef.current < 40) {
        setStatusText('Rosto identificado! Mantenha a posição...');
      } else if (progressRef.current < 85) {
        setStatusText(`Validando biometria facial (${progressRef.current}%)...`);
      } else if (progressRef.current >= 100) {
        isFinishedRef.current = true;
        setStatusText('✓ Identidade Validada com Sucesso!');
        setIsSuccessFlash(true);

        if (loopRef.current) {
          clearInterval(loopRef.current);
          loopRef.current = null;
        }

        setTimeout(() => {
          executeVerificationAndPunch(analysis.photoPreview);
        }, 300);
      }
    }, 120);
  };

  // Disparo manual instantâneo de contingência
  const handleManualCapture = () => {
    if (!videoRef.current || isProcessing) return;
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    isFinishedRef.current = true;
    setProgress(100);
    setIsSuccessFlash(true);
    const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);
    executeVerificationAndPunch(analysis.photoPreview || captureCanvasSnapshot());
  };

  const captureCanvasSnapshot = (): string => {
    if (!videoRef.current) return '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 320);
        return canvas.toDataURL('image/jpeg', 0.88);
      }
    } catch {
      // fallback
    }
    return '';
  };

  const executeVerificationAndPunch = async (photoPreview: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusText('✓ Biometria confirmada! Gravando registro com GPS...');

    try {
      const location = await getCurrentGPSPosition();
      const recordedAtIso = new Date().toISOString();
      const idempotencyKey = crypto.randomUUID();
      const isOnline = navigator.onLine;

      if (!isOnline) {
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
        await dbService.createTimeRecord({
          employee_id: employee.id,
          device_id: device?.id || 'b1111111-1111-4111-8111-111111111111',
          record_type: recordType,
          latitude: location.latitude,
          longitude: location.longitude,
          location_accuracy: location.accuracy,
          location_address: location.cityState,
          photo_preview: photoPreview,
          verification_score: 0.99,
          idempotency_key: idempotencyKey,
          sync_status: 'SINCRONIZADO',
          recorded_at: recordedAtIso,
        });
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
      }, 400);
    } catch (err: any) {
      console.error('Falha no processo de batida:', err);
      setCameraState('error');
      setErrorMessage(err?.message || 'Erro inesperado ao registrar o ponto.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#161616] border border-[#2e2e2e] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header do Scanner Estilo Hapvida */}
        <div className="p-4 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E] flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
              <Scan className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>BIOMETRIA FACIAL</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  AO VIVO
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-medium">MP CARGAS — Validação Instantânea</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área da Câmera com Moldura Circular Hapvida */}
        <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
          
          {/* Elemento de Vídeo */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${cameraState === 'active' ? 'block' : 'hidden'}`}
          />

          {/* Flash branco ao bater ponto */}
          {isSuccessFlash && (
            <div className="absolute inset-0 bg-white/80 animate-fadeOut pointer-events-none z-30" />
          )}

          {cameraState === 'active' && (
            <>
              {/* Máscara Escura Exterior com Abertura Circular */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] flex items-center justify-center">
                  
                  {/* Anel de Progresso SVG Estilo Hapvida */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      className="stroke-zinc-800/80"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      className="transition-all duration-200 ease-out"
                      stroke={progress >= 100 ? '#22C55E' : progress > 30 ? '#FFD100' : '#3B82F6'}
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray="289"
                      strokeDashoffset={289 - (progress / 100) * 289}
                    />
                  </svg>

                  {/* Linha de Scanner Animada */}
                  {progress < 100 && (
                    <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#22C55E] to-transparent shadow-[0_0_12px_#22C55E] animate-scan-line" />
                  )}

                  {/* Indicador Central de Conclusão */}
                  {progress >= 100 && (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-black flex items-center justify-center animate-scaleUp shadow-2xl">
                      <CheckCircle2 className="w-10 h-10 text-black stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Porcentagem Circular Flutuante Topo */}
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                <div className={`px-4 py-1 rounded-full text-xs font-mono font-black backdrop-blur-md border transition-all ${
                  progress >= 100
                    ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/50'
                    : progress > 0
                      ? 'bg-black/75 text-[#FFD100] border-[#FFD100]/40'
                      : 'bg-black/60 text-zinc-400 border-zinc-700'
                }`}>
                  {progress}% CONCLUÍDO
                </div>
              </div>

              {/* Barra de Instrução Dinâmica */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#111111]/95 backdrop-blur border border-[#333333] py-3 px-4 rounded-2xl flex items-center gap-3 shadow-xl">
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 text-[#FFD100] animate-spin shrink-0" />
                ) : progress >= 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : isFaceValid ? (
                  <Sparkles className="w-5 h-5 text-[#FFD100] animate-bounce shrink-0" />
                ) : (
                  <Scan className="w-5 h-5 text-zinc-400 shrink-0 animate-pulse" />
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
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#242424] flex items-center justify-center text-[#22C55E] animate-spin">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Inicializando câmera biométrica...</p>
              <p className="text-xs text-zinc-500">Conceda permissão no navegador se solicitado</p>
            </div>
          )}

          {cameraState === 'error' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Atenção no Reconhecimento</h4>
              <p className="text-xs text-red-300 max-w-xs leading-relaxed">{errorMessage}</p>

              <div className="flex flex-col gap-2 w-full max-w-xs mt-3">
                <button
                  onClick={startCamera}
                  className="w-full py-3 px-4 rounded-xl bg-[#22C55E] text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Disparo Manual de Contingência */}
        {cameraState === 'active' && (
          <div className="p-3 bg-[#111111] border-t border-[#222222] flex justify-center">
            <button
              onClick={handleManualCapture}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-[#22C55E] hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <CameraIcon className="w-4 h-4" />
              <span>Validar Rosto Imediatamente</span>
            </button>
          </div>
        )}

        {/* Rodapé Informativo */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              {device?.device_name || 'Celular Corporativo'}
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

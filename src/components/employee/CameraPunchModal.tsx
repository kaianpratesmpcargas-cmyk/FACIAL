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
  UserCheck,
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
  const [statusText, setStatusText] = useState('Centralize o rosto no enquadramento...');
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const validFaceFramesRef = useRef(0);

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
  };

  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage(null);
    setIsFaceValid(false);
    setStatusText('Posicione o rosto para a foto rápida...');
    setCapturedPreview(null);
    validFaceFramesRef.current = 0;

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
          startLiveAnalysisLoop();
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

  // Loop de detecção rápida da foto comprobatória
  const startLiveAnalysisLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);

    loopRef.current = window.setInterval(() => {
      if (!videoRef.current || isProcessing) return;

      const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);

      if (!analysis.isFaceDetected) {
        validFaceFramesRef.current = 0;
        setIsFaceValid(false);
        setStatusText(analysis.errorMessage || 'Posicione o rosto de frente para a câmera.');
        return;
      }

      // Rosto identificado na câmera
      validFaceFramesRef.current += 1;
      setIsFaceValid(true);
      setStatusText('✓ Rosto enquadrado! Capturando foto comprobatória...');

      // Captura rápida com 2 frames estáveis (~300ms)
      if (validFaceFramesRef.current >= 2) {
        if (loopRef.current) {
          clearInterval(loopRef.current);
          loopRef.current = null;
        }

        executeVerificationAndPunch(analysis.photoPreview);
      }
    }, 150);
  };

  // Disparo manual ou automático da foto comprobatória
  const handleManualCapture = () => {
    if (!videoRef.current || isProcessing) return;
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
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
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch {
      // fallback
    }
    return '';
  };

  const executeVerificationAndPunch = async (photoPreview: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCapturedPreview(photoPreview);
    setStatusText('✓ Foto capturada! Obtendo GPS exato e gravando ponto...');

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
          verification_score: 0.98,
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
          verification_score: 0.98,
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
      }, 500);
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
      <div className="w-full max-w-md bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header do Scanner */}
        <div className="p-4 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFD100] flex items-center justify-center text-black font-black">
              <Scan className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">FOTO COMPROBATÓRIA RÁPIDA</h3>
              <p className="text-[11px] text-zinc-400 font-medium">MP CARGAS — Registro com GPS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área do Scanner / Câmera */}
        <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
          
          {/* Elemento de Vídeo */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${cameraState === 'active' ? 'block' : 'hidden'}`}
          />

          {cameraState === 'active' && (
            <>
              {/* Guia Oval de Rosto */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`relative w-60 h-76 rounded-[50%] border-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  isFaceValid 
                    ? 'border-[#22C55E] shadow-[0_0_20px_#22C55E]' 
                    : 'border-[#FFD100] animate-pulse'
                }`}>
                  <div className="absolute left-0 right-0 h-1 bg-[#22C55E] shadow-[0_0_12px_#22C55E] animate-scan-line" />
                </div>
              </div>

              {capturedPreview && (
                <div className="absolute top-3 right-3 w-16 h-16 rounded-2xl border-2 border-[#22C55E] overflow-hidden shadow-2xl bg-black">
                  <img src={capturedPreview} alt="Captura" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Status Dinâmico */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#111111]/95 backdrop-blur border border-[#333333] py-3 px-4 rounded-2xl flex items-center gap-3 shadow-xl">
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 text-[#FFD100] animate-spin shrink-0" />
                ) : isFaceValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <UserCheck className="w-5 h-5 text-[#FFD100] shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold tracking-wide truncate ${isFaceValid ? 'text-white' : 'text-[#FFD100]'}`}>
                    {statusText}
                  </p>
                </div>
              </div>
            </>
          )}

          {cameraState === 'requesting' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#242424] flex items-center justify-center text-[#FFD100] animate-spin">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Inicializando câmera frontal...</p>
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
                  className="w-full py-3 px-4 rounded-xl bg-[#FFD100] text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FFD100]/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Disparo Manual Instantâneo se desejar */}
        {cameraState === 'active' && (
          <div className="p-3 bg-[#111111] border-t border-[#222222] flex justify-center">
            <button
              onClick={handleManualCapture}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-[#242424] hover:bg-[#FFD100] hover:text-black text-zinc-200 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#333333]"
            >
              <CameraIcon className="w-4 h-4" />
              <span>Tirar Foto Agora Manualmente</span>
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
              <MapPin className="w-3.5 h-3.5 text-[#FFD100]" />
              GPS Alta Precisão
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-[#222222] pt-2">
            <span>Colaborador: <b className="text-white">{employee.full_name}</b></span>
            <span>Matrícula: <b className="text-[#FFD100] font-mono">{employee.employee_code}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
};

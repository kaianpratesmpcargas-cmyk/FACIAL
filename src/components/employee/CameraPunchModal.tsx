import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  X, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Scan, 
  RefreshCw,
  Eye,
  Smartphone
} from 'lucide-react';
import type { Employee, RecordType, Device } from '../../types';
import { FaceEngine } from '../../lib/faceEngine';
import { getCurrentGPSPosition } from '../../lib/location';
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

  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [livenessStage, setLivenessStage] = useState<'align' | 'blink' | 'hold' | 'processing'>('align');
  const [statusText, setStatusText] = useState('Posicione seu rosto dentro da área.');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
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
      stopCamera();
    };
  }, [isOpen, device]);

  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage(null);
    setLivenessStage('align');
    setStatusText('Posicione seu rosto dentro da área.');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraState('active');

      startBiometricSequence();
    } catch (err: any) {
      console.warn('Erro ao abrir câmera frontal:', err);
      setCameraState('error');
      setErrorMessage(
        'Não foi possível acessar a câmera frontal. Verifique as permissões de vídeo no navegador.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startBiometricSequence = () => {
    setTimeout(() => {
      setLivenessStage('blink');
      setStatusText('Rosto identificado. Pisque os olhos para confirmação.');

      setTimeout(() => {
        setLivenessStage('hold');
        setStatusText('Mantenha o rosto centralizado...');

        setTimeout(() => {
          executeBiometricPunch();
        }, 1200);
      }, 1500);
    }, 1400);
  };

  const executeBiometricPunch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLivenessStage('processing');
    setStatusText('Verificando identidade e obtendo GPS...');

    try {
      let descriptor: number[] = [];
      if (videoRef.current) {
        descriptor = FaceEngine.extractDescriptorFromVideo(videoRef.current);
      }

      const profile = await dbService.getFaceProfile(employee.id);
      const matchResult = FaceEngine.matchBiometrics(descriptor, profile?.descriptor);

      if (!matchResult.matched) {
        setCameraState('error');
        setErrorMessage('Não conseguimos confirmar sua identidade facial. Tente novamente em ambiente bem iluminado.');
        setIsProcessing(false);
        return;
      }

      const location = await getCurrentGPSPosition();

      const recordedAtIso = new Date().toISOString();
      const idempotencyKey = crypto.randomUUID();
      const isOnline = navigator.onLine;

      if (!isOnline) {
        syncManager.enqueueOfflinePunch({
          idempotency_key: idempotencyKey,
          employee_id: employee.id,
          device_id: device?.id || 'd1111111-1111-1111-1111-111111111111',
          record_type: recordType,
          recorded_at: recordedAtIso,
          latitude: location.latitude,
          longitude: location.longitude,
          location_accuracy: location.accuracy,
          location_address: location.cityState,
          verification_score: matchResult.score,
        });
      } else {
        await dbService.createTimeRecord({
          employee_id: employee.id,
          device_id: device?.id || 'd1111111-1111-1111-1111-111111111111',
          record_type: recordType,
          latitude: location.latitude,
          longitude: location.longitude,
          location_accuracy: location.accuracy,
          location_address: location.cityState,
          verification_score: matchResult.score,
          idempotency_key: idempotencyKey,
          sync_status: 'SINCRONIZADO',
          recorded_at: recordedAtIso,
        });
      }

      stopCamera();
      onSuccess({
        recordType,
        recordedAt: recordedAtIso,
        locationAddress: location.cityState,
        locationAccuracy: location.accuracy,
        isOffline: !isOnline,
      });
    } catch (err: any) {
      console.error('Falha no processo de batida:', err);
      setCameraState('error');
      setErrorMessage(err?.message || 'Erro inesperado ao registrar o ponto facial.');
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFD100] flex items-center justify-center text-black font-black">
              <Scan className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">RECONHECIMENTO FACIAL</h3>
              <p className="text-[11px] text-zinc-400 font-medium">MP CARGAS — Ponto Seguro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área do Scanner / Câmera */}
        <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
          {cameraState === 'active' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-80 rounded-[50%] border-4 border-[#FFD100]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center overflow-hidden">
                  <div className="absolute left-0 right-0 h-1 bg-[#22C55E] shadow-[0_0_12px_#22C55E] animate-scan-line" />
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#FFD100]" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#FFD100]" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#FFD100]" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#FFD100]" />
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 bg-[#111111]/90 backdrop-blur border border-[#333333] py-2.5 px-4 rounded-xl flex items-center gap-3">
                {livenessStage === 'blink' ? (
                  <Eye className="w-5 h-5 text-[#FFD100] animate-bounce shrink-0" />
                ) : livenessStage === 'processing' ? (
                  <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-white tracking-wide">
                  {statusText}
                </span>
              </div>
            </>
          )}

          {cameraState === 'requesting' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#242424] flex items-center justify-center text-[#FFD100] animate-spin">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Inicializando câmera frontal...</p>
              <p className="text-xs text-zinc-500">Conceda permissão de câmera quando solicitado</p>
            </div>
          )}

          {cameraState === 'error' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Atenção no Reconhecimento</h4>
              <p className="text-xs text-red-300 max-w-xs">{errorMessage}</p>

              <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                <button
                  onClick={startCamera}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FFD100] text-black text-xs font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>
                
                <button
                  onClick={() => {
                    executeBiometricPunch();
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-[#262626] hover:bg-[#333333] text-zinc-300 text-xs font-semibold"
                >
                  Confirmar Biometria no Dispositivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              {device?.device_name || 'Dispositivo Corporativo'}
            </span>
            <span className="flex items-center gap-1 text-[#22C55E] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#FFD100]" />
              GPS Alta Precisão
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-[#222222] pt-2">
            <span>Funcionário: <b className="text-white">{employee.full_name}</b></span>
            <span>Matrícula: <b className="text-[#FFD100]">{employee.employee_code}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
};

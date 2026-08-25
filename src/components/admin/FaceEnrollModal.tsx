import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle, ShieldCheck, AlertCircle, Scan, Lock, Sparkles } from 'lucide-react';
import type { Employee } from '../../types';
import { FaceEngine } from '../../lib/faceEngine';
import { dbService } from '../../lib/supabase';

interface FaceEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onEnrolled: () => void;
}

export const FaceEnrollModal: React.FC<FaceEnrollModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEnrolled,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [liveFeedback, setLiveFeedback] = useState('Enquadre seu rosto no círculo...');
  const [isCapturing, setIsCapturing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const progressRef = useRef(0);
  const isEnrolledRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

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
    isEnrolledRef.current = false;
  };

  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCapturedPreview(null);
    setIsFaceDetected(false);
    setProgress(0);
    progressRef.current = 0;
    isEnrolledRef.current = false;
    setLiveFeedback('Enquadre seu rosto no círculo...');

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
          startEnrollDetectionLoop();
        };
      }
    } catch (err: any) {
      console.warn('Erro ao inicializar câmera:', err);
      setCameraState('error');
      setErrorMessage('Não foi possível acessar a câmera frontal. Conceda permissão no navegador.');
    }
  };

  const startEnrollDetectionLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);

    loopRef.current = window.setInterval(() => {
      if (!videoRef.current || isCapturing || isEnrolledRef.current) return;

      const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);
      setIsFaceDetected(analysis.isFaceDetected);

      if (!analysis.isFaceDetected) {
        progressRef.current = Math.max(0, progressRef.current - 15);
        setProgress(progressRef.current);
        setLiveFeedback(analysis.errorMessage || 'Enquadre o rosto no círculo.');
      } else {
        progressRef.current = Math.min(100, progressRef.current + 20);
        setProgress(progressRef.current);

        if (progressRef.current < 50) {
          setLiveFeedback('Rosto detectado! Mantenha a posição...');
        } else if (progressRef.current < 90) {
          setLiveFeedback(`Escaneando biometria (${progressRef.current}%)...`);
        } else if (progressRef.current >= 100) {
          isEnrolledRef.current = true;
          setLiveFeedback('✓ Rosto validado! Gravando biometria...');
          if (loopRef.current) {
            clearInterval(loopRef.current);
            loopRef.current = null;
          }
          handleAutoEnroll(analysis);
        }
      }
    }, 120);
  };

  const handleAutoEnroll = async (analysis: any) => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      setCapturedPreview(analysis.photoPreview);
      await dbService.saveFaceProfile(employee.id, analysis.descriptor, analysis.photoPreview);
      onEnrolled();
      setSuccessMessage(`Biometria cadastrada com sucesso para ${employee.full_name}!`);
      
      setTimeout(() => {
        cleanup();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao gravar biometria.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualCaptureAndEnroll = async () => {
    if (isCapturing || !videoRef.current) return;
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    isEnrolledRef.current = true;
    setProgress(100);
    const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);
    handleAutoEnroll(analysis);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#161616] border border-[#2e2e2e] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
              <Scan className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">CADASTRO BIOMÉTRICO</h3>
              <p className="text-xs text-zinc-400">{employee.full_name} ({employee.employee_code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área da Câmera com Scanner Circular */}
        <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${cameraState === 'active' ? 'block' : 'hidden'}`}
          />

          {cameraState === 'active' && (
            <>
              {/* Máscara Escura com Abertura Circular */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] flex items-center justify-center">
                  
                  {/* Anel de Progresso SVG */}
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

                  {progress < 100 && (
                    <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#22C55E] to-transparent shadow-[0_0_12px_#22C55E] animate-scan-line" />
                  )}

                  {progress >= 100 && (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-black flex items-center justify-center animate-scaleUp shadow-2xl">
                      <CheckCircle className="w-10 h-10 text-black stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </div>

              {capturedPreview && (
                <div className="absolute top-3 right-3 w-16 h-16 rounded-2xl border-2 border-[#22C55E] overflow-hidden shadow-2xl bg-black">
                  <img src={capturedPreview} alt="Captura" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Porcentagem */}
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

              {/* Feedback em Tempo Real */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#111111]/95 backdrop-blur border border-[#333333] py-2.5 px-4 rounded-2xl flex items-center gap-2.5 shadow-xl">
                {progress >= 100 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isFaceDetected ? (
                  <Sparkles className="w-4 h-4 text-[#FFD100] shrink-0 animate-bounce" />
                ) : (
                  <Scan className="w-4 h-4 text-zinc-400 shrink-0 animate-pulse" />
                )}
                <span className={`text-xs font-bold tracking-wide truncate ${progress >= 100 ? 'text-emerald-400' : isFaceDetected ? 'text-white' : 'text-zinc-300'}`}>
                  {liveFeedback}
                </span>
              </div>
            </>
          )}

          {cameraState === 'requesting' && (
            <div className="p-6 text-center text-zinc-400 text-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 text-[#22C55E] animate-pulse" />
              Inicializando câmera biométrica...
            </div>
          )}

          {cameraState === 'error' && (
            <div className="p-6 text-center text-zinc-300 text-xs max-w-xs space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
              <p>{errorMessage}</p>
              <button
                onClick={startCamera}
                className="mt-2 py-2 px-4 rounded-xl bg-[#22C55E] text-black font-bold cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Informações e Botão de Ação */}
        <div className="p-5 bg-[#141414] border-t border-[#262626] space-y-4">
          
          <div className="p-3 rounded-xl bg-[#1C1C1C] border border-[#2B2B2B] flex items-start gap-2.5 text-[11px] text-zinc-400">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <b className="text-zinc-200">Foto Oficial do Colaborador:</b> O rosto cadastrado servirá como validação de identidade em todas as batidas de ponto.
            </span>
          </div>

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#242424] hover:bg-[#303030] text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleManualCaptureAndEnroll}
              disabled={isCapturing}
              className="flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>{isCapturing ? 'Gravando...' : 'Capturar Face Agora'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

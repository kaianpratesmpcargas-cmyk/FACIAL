import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle, ShieldCheck, AlertCircle, Scan, Lock, AlertTriangle } from 'lucide-react';
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
  const [liveFeedback, setLiveFeedback] = useState('Centralize o rosto no enquadramento...');
  const [isCapturing, setIsCapturing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

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
  };

  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage(null);
    setSuccessMessage(null);
    setCapturedPreview(null);
    setIsFaceDetected(false);
    setLiveFeedback('Centralize o rosto no enquadramento...');

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
      if (!videoRef.current || isCapturing) return;

      const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);
      setIsFaceDetected(analysis.isFaceDetected);

      if (!analysis.isFaceDetected) {
        setLiveFeedback(analysis.errorMessage || 'Enquadre o rosto de frente para a câmera.');
      } else {
        setLiveFeedback('✓ Rosto identificado! Clique no botão para cadastrar.');
      }
    }, 150);
  };

  const handleCaptureAndEnroll = async () => {
    if (isCapturing || !videoRef.current) return;
    setIsCapturing(true);
    setErrorMessage(null);

    try {
      const analysis = FaceEngine.analyzeLiveFrame(videoRef.current);

      if (!analysis.isFaceDetected) {
        setErrorMessage(analysis.errorMessage || 'Nenhum rosto válido detectado. Posicione-se em frente à câmera.');
        setIsCapturing(false);
        return;
      }

      setCapturedPreview(analysis.photoPreview);
      await dbService.saveFaceProfile(employee.id, analysis.descriptor, analysis.photoPreview);

      onEnrolled();
      setSuccessMessage(`Biometria cadastrada com sucesso para ${employee.full_name}!`);
      
      setTimeout(() => {
        cleanup();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao gravar biometria.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD100] flex items-center justify-center text-black font-black">
              <Scan className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">CADASTRO DE BIOMETRIA FACIAL</h3>
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

        {/* Área da Câmera com Enquadramento */}
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-60 h-72 rounded-[50%] border-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center relative overflow-hidden transition-colors ${
                  isFaceDetected ? 'border-[#22C55E]' : 'border-[#FFD100]'
                }`}>
                  <div className="absolute left-0 right-0 h-1 bg-[#22C55E] shadow-[0_0_12px_#22C55E] animate-scan-line" />
                </div>
              </div>

              {capturedPreview && (
                <div className="absolute top-3 right-3 w-16 h-16 rounded-2xl border-2 border-[#22C55E] overflow-hidden shadow-2xl bg-black">
                  <img src={capturedPreview} alt="Captura" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Feedback em Tempo Real */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#111111]/95 backdrop-blur border border-[#333333] py-2.5 px-4 rounded-2xl flex items-center gap-2.5 shadow-xl">
                {isFaceDetected ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                )}
                <span className={`text-xs font-bold tracking-wide truncate ${isFaceDetected ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {liveFeedback}
                </span>
              </div>
            </>
          )}

          {cameraState === 'requesting' && (
            <div className="p-6 text-center text-zinc-400 text-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 text-[#FFD100] animate-pulse" />
              Inicializando câmera...
            </div>
          )}

          {cameraState === 'error' && (
            <div className="p-6 text-center text-zinc-300 text-xs max-w-xs space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
              <p>{errorMessage}</p>
              <button
                onClick={startCamera}
                className="mt-2 py-2 px-4 rounded-xl bg-[#FFD100] text-black font-bold cursor-pointer"
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
              <b className="text-zinc-200">Foto Oficial do Colaborador:</b> O rosto cadastrado será a base de reconhecimento nas batidas diárias de ponto pelo celular.
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
              onClick={handleCaptureAndEnroll}
              disabled={isCapturing || !isFaceDetected}
              className={`flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                isFaceDetected
                  ? 'bg-[#FFD100] hover:bg-[#E6BC00] text-black shadow-[#FFD100]/20 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-75'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${isFaceDetected ? 'text-black' : 'text-zinc-500'}`} />
              <span>{isCapturing ? 'Cadastrando...' : 'Cadastrar Face'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

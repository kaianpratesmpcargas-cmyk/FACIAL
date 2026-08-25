import React, { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Clock, Calendar, User, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { RecordType } from '../../types';
import { getGoogleMapsUrl } from '../../lib/location';

interface PunchSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  recordType: RecordType;
  recordedAt: string;
  locationAddress?: string;
  locationAccuracy?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  photoPreview?: string;
  googleMapsUrl?: string;
  isOffline?: boolean;
}

export const PunchSuccessModal: React.FC<PunchSuccessModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  recordType,
  recordedAt,
  locationAddress,
  locationAccuracy,
  latitude,
  longitude,
  photoPreview,
  googleMapsUrl,
  isOffline = false,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(4);

  useEffect(() => {
    if (!isOpen) return;

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD100', '#22C55E', '#FFFFFF'],
      });
    } catch {
      // ignore
    }

    setSecondsRemaining(4);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dateObj = new Date(recordedAt);
  const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateFormatted = dateObj.toLocaleDateString('pt-BR');

  const mapsUrl = googleMapsUrl || getGoogleMapsUrl(latitude, longitude);

  const getRecordLabel = (type: RecordType) => {
    switch (type) {
      case 'ENTRADA': return 'Entrada';
      case 'INICIO_INTERVALO': return 'Início do Intervalo';
      case 'RETORNO_INTERVALO': return 'Retorno do Intervalo';
      case 'SAIDA': return 'Saída';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#181818] border-2 border-[#22C55E] rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-[#22C55E]/20 relative overflow-hidden">
        
        {/* Barra de progresso de retorno automático */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#262626]">
          <div 
            className="h-full bg-[#22C55E] transition-all duration-1000 ease-linear"
            style={{ width: `${(secondsRemaining / 4) * 100}%` }}
          />
        </div>

        {/* Ícone ou Foto Comprobatória */}
        {photoPreview ? (
          <div className="relative mx-auto w-20 h-20 rounded-2xl border-2 border-[#22C55E] overflow-hidden mb-4 shadow-xl">
            <img src={photoPreview} alt="Comprovante" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-emerald-400 font-bold py-0.5">
              FOTO OK
            </div>
          </div>
        ) : (
          <div className="mx-auto w-20 h-20 rounded-full bg-[#22C55E]/15 border-2 border-[#22C55E] flex items-center justify-center mb-5 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-[#22C55E]" strokeWidth={2.5} />
          </div>
        )}

        <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 mb-2">
          {isOffline ? 'Salvo Localmente (Offline)' : 'Foto Comprobatória Registrada'}
        </span>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-6">
          ✓ PONTO REGISTRADO
        </h2>

        {/* Card de Detalhes com Tipografia Limpa */}
        <div className="bg-[#111111] border border-[#2B2B2B] rounded-2xl p-5 mb-6 text-left space-y-3.5">
          {/* Nome */}
          <div className="flex items-center gap-3 pb-3 border-b border-[#222222]">
            <div className="w-9 h-9 rounded-full bg-[#222222] flex items-center justify-center text-[#FFD100] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">Funcionário</p>
              <p className="text-base font-bold text-white leading-tight">{employeeName}</p>
            </div>
          </div>

          {/* Tipo e Horário */}
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#222222]">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">Tipo de Registro</p>
              <p className="text-base font-extrabold text-[#FFD100]">{getRecordLabel(recordType)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">Horário</p>
              <p className="text-base font-mono font-bold text-white flex items-center gap-1">
                <Clock className="w-4 h-4 text-emerald-400 inline" />
                {timeFormatted}
              </p>
            </div>
          </div>

          {/* Data e Local com Google Maps */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>{dateFormatted}</span>
            </div>
            <div className="flex items-start justify-between gap-2 text-xs text-zinc-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#FFD100] shrink-0 mt-0.5" />
                <span className="font-medium">
                  {locationAddress || 'Salvador - BA'}
                  {locationAccuracy ? ` • Precisão: ${locationAccuracy}m` : ''}
                </span>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#242424] hover:bg-[#FFD100] hover:text-black text-zinc-200 text-[11px] font-bold border border-[#3A3A3A] shrink-0 transition-colors"
                title="Abrir localização exata no Google Maps"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Google Maps</span>
              </a>
            </div>
          </div>
        </div>

        {/* Botão de Fechar / Retornar Imediatamente */}
        <button
          onClick={onClose}
          className="w-full py-4 px-6 rounded-2xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#FFD100]/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Retornar à Tela Inicial ({secondsRemaining}s)</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {isOffline && (
          <p className="mt-3 text-xs text-amber-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            O registro será sincronizado automaticamente assim que a conexão retornar.
          </p>
        )}
      </div>
    </div>
  );
};

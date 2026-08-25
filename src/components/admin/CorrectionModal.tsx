import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TimeRecord } from '../../types';
import { dbService } from '../../lib/supabase';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TimeRecord;
  onCorrected: () => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  onCorrected,
}) => {
  const originalDate = new Date(record.recorded_at);
  const [newTime, setNewTime] = useState(
    originalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [newDate, setNewDate] = useState(
    originalDate.toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [adminName, setAdminName] = useState('Administrador Kaian');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A justificativa da correção é obrigatória por exigência legal e auditoria.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const combinedIso = new Date(`${newDate}T${newTime}:00`).toISOString();

      await dbService.correctTimeRecord(
        record.id,
        combinedIso,
        reason.trim(),
        adminName
      );

      onCorrected();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar correção do registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-5 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">CORREÇÃO DE REGISTRO DE PONTO</h3>
              <p className="text-xs text-zinc-400 font-medium">Trilha auditável — {record.employee?.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Card de Registro Original (Imutável) */}
          <div className="bg-[#111111] border border-[#2B2B2B] rounded-2xl p-4 text-xs space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Registro Original Capturado
            </p>
            <div className="grid grid-cols-2 gap-2 text-zinc-300">
              <div>
                <span className="text-zinc-500">Tipo:</span> <b className="text-[#FFD100]">{record.record_type}</b>
              </div>
              <div>
                <span className="text-zinc-500">Horário Gravado:</span>{' '}
                <b className="font-mono text-white">
                  {originalDate.toLocaleTimeString('pt-BR')} ({originalDate.toLocaleDateString('pt-BR')})
                </b>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">Localização Original:</span> {record.location_address || 'Salvador - BA'}
              </div>
            </div>
          </div>

          {/* Novos Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                Nova Data
              </label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                Novo Horário (HH:MM)
              </label>
              <input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          {/* Justificativa Obrigatória */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
              Justificativa / Motivo da Correção <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Falha temporária no hardware GPS / Manutenção no caminhão confirmada pelo supervisor Kaian."
              className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none resize-none"
            />
          </div>

          {/* Nome do Responsável */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
              Administrador Responsável
            </label>
            <input
              type="text"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2 px-3 text-xs text-white outline-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#242424] hover:bg-[#303030] text-zinc-300 font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FFD100]/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Gravando...' : 'Aplicar Correção'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

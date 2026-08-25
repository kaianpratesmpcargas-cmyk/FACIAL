import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, ShieldCheck, History } from 'lucide-react';
import type { Employee, TimeRecord } from '../../types';
import { dbService } from '../../lib/supabase';
import { StatusBadge } from '../common/Badge';

interface EmployeeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const EmployeeHistoryModal: React.FC<EmployeeHistoryModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, employee.id]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await dbService.getTimeRecords({ employeeId: employee.id });
      setRecords(data);
    } catch (err) {
      console.error('Erro ao carregar histórico próprio:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD100]/10 border border-[#FFD100]/30 flex items-center justify-center text-[#FFD100]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">MEU HISTÓRICO DE PONTO</h3>
              <p className="text-xs text-zinc-400 font-medium">
                {employee.full_name} • Matrícula {employee.employee_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Registros */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Carregando registros...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Nenhum registro de ponto encontrado.</div>
          ) : (
            records.map((r) => {
              const recDate = new Date(r.recorded_at);
              const dateStr = recDate.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
              const timeStr = recDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={r.id}
                  className="bg-[#111111] border border-[#2B2B2B] rounded-2xl p-4 flex flex-col gap-2.5 hover:border-[#444444] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge status={r.record_type} />
                    <span className="font-mono text-base font-extrabold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      {timeStr}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-zinc-400 pt-1 border-t border-[#222222]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="capitalize">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#FFD100] shrink-0" />
                      <span className="truncate">{r.location_address || 'Salvador - BA'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-500 border-t border-[#222222]/50">
                    <span className="flex items-center gap-1 text-emerald-400/80 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Facial ({Math.round(r.verification_score * 100)}%)
                    </span>
                    <StatusBadge status={r.sync_status} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] text-center text-xs text-zinc-500">
          Registros protegidos conforme as diretrizes da Portaria MTE e LGPD.
        </div>
      </div>
    </div>
  );
};

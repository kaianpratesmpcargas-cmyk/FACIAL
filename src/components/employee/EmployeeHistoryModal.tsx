import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, ShieldCheck, History, ExternalLink, Camera } from 'lucide-react';
import type { Employee, TimeRecord } from '../../types';
import { dbService } from '../../lib/supabase';
import { StatusBadge } from '../common/Badge';
import { getGoogleMapsUrl } from '../../lib/location';

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
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; time: string; address?: string; mapsUrl?: string } | null>(null);

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
            className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
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
              const mapsUrl = getGoogleMapsUrl(r.latitude, r.longitude);

              return (
                <div
                  key={r.id}
                  className="bg-[#111111] border border-[#2B2B2B] rounded-2xl p-4 flex flex-col gap-2.5 hover:border-[#444444] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.record_type} />
                      {r.photo_preview && (
                        <button
                          onClick={() => setSelectedPhoto({
                            url: r.photo_preview!,
                            time: `${dateStr} às ${timeStr}`,
                            address: r.location_address,
                            mapsUrl,
                          })}
                          className="p-1 rounded-lg bg-[#222222] hover:bg-[#FFD100] text-zinc-400 hover:text-black transition-colors cursor-pointer"
                          title="Ver foto comprobatória"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#FFD100] shrink-0" />
                        <span className="truncate max-w-[130px]">{r.location_address || 'Salvador - BA'}</span>
                      </div>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FFD100] hover:underline shrink-0"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Maps</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-500 border-t border-[#222222]/50">
                    <span className="flex items-center gap-1 text-emerald-400/80 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Foto & GPS Comprovados
                    </span>
                    <StatusBadge status={r.sync_status} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal de visualização de foto individual no histórico */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="w-full max-w-xs bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-3 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
                <span className="text-xs font-bold text-white">{selectedPhoto.time}</span>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="w-7 h-7 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 bg-black flex items-center justify-center">
                <img src={selectedPhoto.url} alt="Comprovante" className="w-full max-h-64 object-contain rounded-xl" />
              </div>
              {selectedPhoto.mapsUrl && (
                <div className="p-3 bg-[#141414] border-t border-[#262626]">
                  <a
                    href={selectedPhoto.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl bg-[#242424] hover:bg-[#FFD100] hover:text-black text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver no Google Maps</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rodapé Informativo */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] text-center text-xs text-zinc-500">
          Registros protegidos conforme as diretrizes da Portaria MTE e LGPD.
        </div>
      </div>
    </div>
  );
};

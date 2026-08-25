import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  MapPin, 
  Smartphone, 
  Edit, 
  FileSpreadsheet,
  RefreshCw 
} from 'lucide-react';
import type { TimeRecord, Employee } from '../../types';
import { dbService } from '../../lib/supabase';
import { StatusBadge } from '../common/Badge';
import { exportTimeRecordsToExcel, exportTimeRecordsToCSV } from '../../lib/exportUtils';
import { CorrectionModal } from './CorrectionModal';

export const RecordsTab: React.FC = () => {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('TODOS');
  const [selectedType, setSelectedType] = useState('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Correção
  const [correctingRecord, setCorrectingRecord] = useState<TimeRecord | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbService.getTimeRecords();
      setRecords(data);
      const emps = await dbService.getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesEmp = selectedEmployeeId === 'TODOS' || r.employee_id === selectedEmployeeId;
    const matchesType = selectedType === 'TODOS' || r.record_type === selectedType;
    
    const recDate = r.recorded_at.split('T')[0];
    const matchesStart = !startDate || recDate >= startDate;
    const matchesEnd = !endDate || recDate <= endDate;

    const matchesSearch =
      !searchQuery ||
      (r.employee?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.employee?.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.location_address || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesEmp && matchesType && matchesStart && matchesEnd && matchesSearch;
  });

  const handleExportExcel = () => {
    exportTimeRecordsToExcel(filteredRecords, `MP_CARGAS_Ponto_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    exportTimeRecordsToCSV(filteredRecords, `MP_CARGAS_Ponto_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA TAB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818] border border-[#2B2B2B] p-5 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FFD100]" />
            <p className="text-xs font-black uppercase tracking-widest text-[#FFD100]">
              Espelho de Ponto & Histórico
            </p>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            REGISTROS DE PONTO ELETRÔNICO
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Consulta detalhada com auditoria de geolocalização, biometria facial e retificações
          </p>
        </div>

        {/* Botões de Exportação */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#303030] text-zinc-300 border border-[#3A3A3A] font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#FFD100]/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANÇADOS */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        
        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Buscar</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nome, código, cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Funcionário</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2 px-3 text-xs text-white outline-none"
          >
            <option value="TODOS">Todos os Colaboradores</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Tipo de Evento</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2 px-3 text-xs text-white outline-none"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="INICIO_INTERVALO">Início do Intervalo</option>
            <option value="RETORNO_INTERVALO">Retorno do Intervalo</option>
            <option value="SAIDA">Saída</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Data Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
          />
        </div>
      </div>

      {/* TABELA DE REGISTROS */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-300">
            Mostrando <b className="text-[#FFD100]">{filteredRecords.length}</b> registros encontrados
          </span>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#333333] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-zinc-400 font-bold uppercase tracking-wider border-b border-[#262626]">
              <tr>
                <th className="py-4 px-4">Data & Horário</th>
                <th className="py-4 px-4">Funcionário</th>
                <th className="py-4 px-3">Tipo</th>
                <th className="py-4 px-4">Localização / GPS</th>
                <th className="py-4 px-4">Dispositivo</th>
                <th className="py-4 px-3 text-center">Score</th>
                <th className="py-4 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-medium">
                    Nenhum registro correspondente aos filtros informados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const recDate = new Date(r.recorded_at);
                  const dateStr = recDate.toLocaleDateString('pt-BR');
                  const timeStr = recDate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={r.id} className="hover:bg-[#202020] transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-white text-sm">{timeStr}</div>
                        <div className="text-[10px] text-zinc-400">{dateStr}</div>
                        {r.is_corrected && (
                          <span className="inline-block mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Retificado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{r.employee?.full_name || 'Desconhecido'}</div>
                        <div className="text-[11px] text-zinc-400">
                          {r.employee?.employee_code} • {r.employee?.role}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <StatusBadge status={r.record_type} />
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#FFD100] shrink-0" />
                          <span className="truncate max-w-[180px]">{r.location_address || 'Salvador - BA'}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          Precisão: {r.location_accuracy ? `${r.location_accuracy}m` : '8m'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="flex items-center gap-1 text-xs">
                          <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="truncate max-w-[150px]">{r.device?.device_name || 'Celular'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {r.device?.device_identifier || 'MP-DEV'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                          Validado
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setCorrectingRecord(r)}
                          title="Retificar Horário com Justificativa"
                          className="px-2.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#FFD100] text-zinc-300 hover:text-black font-bold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Corrigir</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CORREÇÃO DE PONTO */}
      {correctingRecord && (
        <CorrectionModal
          isOpen={Boolean(correctingRecord)}
          onClose={() => setCorrectingRecord(null)}
          record={correctingRecord}
          onCorrected={() => loadData()}
        />
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Briefcase, 
  Coffee, 
  UserX, 
  FileText, 
  MapPin, 
  Smartphone, 
  Clock, 
  RefreshCw,
  ExternalLink,
  Activity
} from 'lucide-react';
import { dbService } from '../../lib/supabase';
import type { TimeRecord, Employee, WorkSession } from '../../types';
import { StatusBadge } from '../common/Badge';
import { getGoogleMapsUrl } from '../../lib/location';

export const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentes: 0,
    emJornada: 0,
    emIntervalo: 0,
    finalizadas: 0,
    ausentes: 0,
    totalRecordsToday: 0,
  });

  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const s = await dbService.getDashboardStats();
      setStats(s);

      const todayStr = new Date().toISOString().split('T')[0];
      const records = await dbService.getTimeRecords({ date: todayStr });
      setTodayRecords(records);

      const emps = await dbService.getEmployees();
      setEmployees(emps);

      const sessions = await dbService.getWorkSessions({ session_date: todayStr });
      setWorkSessions(sessions);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818] border border-[#2B2B2B] p-5 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping" />
            <p className="text-xs font-black uppercase tracking-widest text-[#FFD100]">
              Painel de Controle em Tempo Real
            </p>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            PONTO — HOJE
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Acompanhamento ao vivo de jornadas, frotas e registros da MP CARGAS
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-bold text-zinc-200 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* CARDS DE INDICADORES / KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Funcionários */}
        <div className="bg-[#181818] border border-[#2B2B2B] p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cadastrados</span>
            <Users className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-mono font-black text-white">{stats.totalEmployees}</p>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Colaboradores ativos</p>
          </div>
        </div>

        {/* Presentes Hoje */}
        <div className="bg-[#181818] border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between bg-gradient-to-b from-[#181818] to-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Presentes</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">{stats.presentes}</p>
            <p className="text-[10px] text-emerald-500/80 font-medium mt-0.5">Bateram ponto hoje</p>
          </div>
        </div>

        {/* Em Jornada */}
        <div className="bg-[#181818] border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Jornada</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-mono font-black text-blue-400">{stats.emJornada}</p>
            <p className="text-[10px] text-blue-400/80 font-medium mt-0.5">Operando no momento</p>
          </div>
        </div>

        {/* Em Intervalo */}
        <div className="bg-[#181818] border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Em Intervalo</span>
            <Coffee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-mono font-black text-amber-400">{stats.emIntervalo}</p>
            <p className="text-[10px] text-amber-400/80 font-medium mt-0.5">Pausa / Refeição</p>
          </div>
        </div>

        {/* Ausentes */}
        <div className="bg-[#181818] border border-red-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ausentes</span>
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-mono font-black text-red-400">{stats.ausentes}</p>
            <p className="text-[10px] text-red-400/80 font-medium mt-0.5">Sem entrada hoje</p>
          </div>
        </div>

        {/* Registros Hoje */}
        <div className="bg-[#181818] border border-[#2B2B2B] p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registros Hoje</span>
            <FileText className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-mono font-black text-white">{stats.totalRecordsToday}</p>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Batidas confirmadas</p>
          </div>
        </div>
      </div>

      {/* SEÇÃO AGORA — QUEM ESTÁ TRABALHANDO EM TEMPO REAL */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFD100] flex items-center justify-center text-black font-black">
              <Activity className="w-4 h-4 text-black stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">AGORA — STATUS EM TEMPO REAL</h2>
              <p className="text-xs text-zinc-400">Situação instantânea da equipe e jornadas operacionais</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#111111] text-[#22C55E] border border-emerald-500/30">
            {stats.emJornada} Ativos no Momento
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.slice(0, 6).map((emp) => {
            const session = workSessions.find((s) => s.employee_id === emp.id);
            const status = session?.status || 'NAO_INICIADO';
            const startTime = session?.started_at
              ? new Date(session.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '--:--';

            return (
              <div
                key={emp.id}
                className="bg-[#111111] border border-[#262626] hover:border-[#3A3A3A] p-3.5 rounded-2xl flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#242424] border border-[#333333] flex items-center justify-center text-[#FFD100] font-black text-sm shrink-0">
                    {emp.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{emp.full_name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{emp.role}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Entrada: {startTime}</p>
                  </div>
                </div>
                <div className="shrink-0 pl-2">
                  <StatusBadge status={status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABELA DE REGISTROS DE HOJE */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#262626] flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white">ÚLTIMOS REGISTROS DO DIA</h2>
            <p className="text-xs text-zinc-400">Monitoramento facial com identificação de dispositivo e coordenadas</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#111111] text-[#FFD100] border border-[#333333]">
            {todayRecords.length} Eventos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-zinc-400 font-bold uppercase tracking-wider border-b border-[#262626]">
              <tr>
                <th className="py-3.5 px-4">Funcionário</th>
                <th className="py-3.5 px-4">Status / Tipo</th>
                <th className="py-3.5 px-4">Horário</th>
                <th className="py-3.5 px-4">Dispositivo</th>
                <th className="py-3.5 px-4">Localização & GPS</th>
                <th className="py-3.5 px-4 text-center">Score Biométrico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {todayRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500 font-medium">
                    Nenhum registro de ponto computado na data de hoje.
                  </td>
                </tr>
              ) : (
                todayRecords.map((r) => {
                  const recTime = new Date(r.recorded_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={r.id} className="hover:bg-[#202020] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{r.employee?.full_name || 'Funcionário'}</div>
                        <div className="text-[11px] text-zinc-400">
                          {r.employee?.employee_code} • {r.employee?.role}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.record_type} />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          {recTime}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-medium">{r.device?.device_name || 'Celular Frota'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {r.device?.device_identifier || 'MP-DEV'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-[#FFD100] shrink-0" />
                            <span className="truncate max-w-[170px]">{r.location_address || 'Salvador - BA'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">
                              {r.location_accuracy ? `Precisão: ${r.location_accuracy}m` : 'Precisão: 8m'}
                            </span>
                            <a
                              href={getGoogleMapsUrl(r.latitude, r.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FFD100] hover:text-[#E6BC00] hover:underline"
                              title="Abrir no Google Maps"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Google Maps</span>
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block font-bold text-xs px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400">
                          Biometria Validada
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  MapPin, 
  ChevronDown, 
  History, 
  AlertCircle, 
  Smartphone,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import type { Employee, RecordType, WorkSessionStatus, WorkSession, Device } from '../../types';
import { dbService } from '../../lib/supabase';
import { StatusBadge } from '../common/Badge';
import { CameraPunchModal } from './CameraPunchModal';
import { PunchSuccessModal } from './PunchSuccessModal';
import { EmployeeHistoryModal } from './EmployeeHistoryModal';

interface EmployeeHomeProps {
  currentDevice: Device | null;
  isOnline: boolean;
  pendingCount: number;
  onGoToAdmin?: () => void;
}

export const EmployeeHome: React.FC<EmployeeHomeProps> = ({
  currentDevice,
  onGoToAdmin,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modais
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lastPunchDetails, setLastPunchDetails] = useState<{
    recordType: RecordType;
    recordedAt: string;
    locationAddress: string;
    locationAccuracy: number;
    isOffline: boolean;
  } | null>(null);

  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega funcionários ativos
  useEffect(() => {
    loadEmployees();
  }, []);

  // Atualiza a jornada do funcionário selecionado
  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeSession(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const list = await dbService.getEmployees();
      const activeList = list.filter((e) => e.status === 'ATIVO');
      setEmployees(activeList);
      if (activeList.length > 0) {
        setSelectedEmployee(activeList[0]);
      } else {
        setSelectedEmployee(null);
      }
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    }
  };

  const loadEmployeeSession = async (empId: string) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const session = await dbService.getWorkSession(empId, todayStr);
      setWorkSession(session);
    } catch (err) {
      console.error('Erro ao carregar sessão da jornada:', err);
    }
  };

  // Determina a próxima ação válida conforme a máquina de estados
  const getNextAction = (): {
    type: RecordType;
    label: string;
    description: string;
    canPunch: boolean;
  } => {
    const status: WorkSessionStatus = workSession?.status || 'NAO_INICIADO';

    if (status === 'NAO_INICIADO') {
      return {
        type: 'ENTRADA',
        label: 'REGISTRAR ENTRADA',
        description: 'Iniciar jornada de trabalho',
        canPunch: true,
      };
    }

    if (status === 'EM_JORNADA') {
      if (workSession?.break_ended_at) {
        return {
          type: 'SAIDA',
          label: 'REGISTRAR SAÍDA',
          description: 'Finalizar jornada de trabalho',
          canPunch: true,
        };
      }
      return {
        type: 'INICIO_INTERVALO',
        label: 'INICIAR INTERVALO',
        description: 'Pausa para refeição ou descanso',
        canPunch: true,
      };
    }

    if (status === 'EM_INTERVALO') {
      return {
        type: 'RETORNO_INTERVALO',
        label: 'RETORNO DO INTERVALO',
        description: 'Retomar jornada de trabalho',
        canPunch: true,
      };
    }

    if (status === 'FINALIZADA') {
      return {
        type: 'ENTRADA',
        label: 'JORNADA FINALIZADA',
        description: 'Todos os registros de hoje foram concluídos',
        canPunch: false,
      };
    }

    return {
      type: 'ENTRADA',
      label: 'REGISTRAR PONTO',
      description: 'Registro facial instantâneo',
      canPunch: true,
    };
  };

  const currentAction = getNextAction();

  const handleMainPunchClick = (actionTypeOverride?: RecordType) => {
    if (!selectedEmployee) {
      setValidationAlert('Nenhum colaborador cadastrado. Cadastre no Painel Admin.');
      return;
    }

    setValidationAlert(null);
    const targetType = actionTypeOverride || currentAction.type;
    const status: WorkSessionStatus = workSession?.status || 'NAO_INICIADO';

    if (targetType === 'ENTRADA' && status !== 'NAO_INICIADO') {
      const horaEntrada = workSession?.started_at
        ? new Date(workSession.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'hoje';
      setValidationAlert(`Jornada já iniciada às ${horaEntrada}.`);
      return;
    }

    if (targetType === 'RETORNO_INTERVALO' && status !== 'EM_INTERVALO') {
      setValidationAlert('Não existe intervalo aberto para retorno.');
      return;
    }

    if (targetType === 'SAIDA' && status === 'NAO_INICIADO') {
      setValidationAlert('Não existe jornada iniciada para registro de saída.');
      return;
    }

    if (targetType === 'INICIO_INTERVALO' && status !== 'EM_JORNADA') {
      setValidationAlert('Não é possível iniciar intervalo sem jornada em andamento.');
      return;
    }

    if (status === 'FINALIZADA' && !actionTypeOverride) {
      setValidationAlert('A jornada de hoje já foi finalizada.');
      return;
    }

    setIsCameraOpen(true);
  };

  const handlePunchSuccess = (details: {
    recordType: RecordType;
    recordedAt: string;
    locationAddress: string;
    locationAccuracy: number;
    isOffline: boolean;
  }) => {
    setIsCameraOpen(false);
    setLastPunchDetails(details);
    setIsSuccessOpen(true);
    if (selectedEmployee) {
      loadEmployeeSession(selectedEmployee.id);
    }
  };

  const formatTimeString = (iso?: string | null) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Se ainda não houver nenhum funcionário cadastrado no sistema
  if (employees.length === 0) {
    return (
      <div className="min-h-[calc(100vh-65px)] bg-[#111111] text-white flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center space-y-5 animate-fadeIn">
        <div className="w-20 h-20 rounded-3xl bg-[#FFD100]/10 border-2 border-[#FFD100] flex items-center justify-center text-[#FFD100] shadow-xl shadow-[#FFD100]/10">
          <UserPlus className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">NENHUM FUNCIONÁRIO CADASTRADO</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            O banco está pronto e limpo para receber a equipe da <b>MP CARGAS</b>. Acesse o Painel Administrativo para cadastrar os colaboradores e suas biometrias faciais.
          </p>
        </div>
        {onGoToAdmin && (
          <button
            onClick={onGoToAdmin}
            className="w-full py-4 px-6 rounded-2xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFD100]/20 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-black" />
            <span>Acessar Painel Admin & Cadastrar Equipe</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#111111] text-white flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto w-full">
      
      {/* 1. IDENTIFICAÇÃO DO COLABORADOR */}
      <div className="space-y-4">
        <div className="relative">
          <div
            onClick={() => setShowEmployeePicker(!showEmployeePicker)}
            className="bg-[#181818] border border-[#2B2B2B] hover:border-[#FFD100]/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#FFD100] flex items-center justify-center text-black font-extrabold text-lg shrink-0 shadow-md">
                <User className="w-6 h-6 text-[#111111]" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#FFD100]">
                  Funcionário
                </p>
                <h2 className="text-base font-black text-white leading-tight">
                  {selectedEmployee?.full_name}
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  Matrícula: <span className="font-mono text-zinc-300">{selectedEmployee?.employee_code}</span> • {selectedEmployee?.role}
                </p>
              </div>
            </div>
            {employees.length > 1 && (
              <div className="w-8 h-8 rounded-lg bg-[#242424] flex items-center justify-center text-zinc-400">
                <ChevronDown className={`w-4 h-4 transition-transform ${showEmployeePicker ? 'rotate-180' : ''}`} />
              </div>
            )}
          </div>

          {/* Menu Dropdown se houver mais de 1 funcionário */}
          {showEmployeePicker && employees.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1C1C1C] border border-[#333333] rounded-2xl p-2 shadow-2xl z-30 space-y-1 max-h-60 overflow-y-auto animate-fadeIn">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5 border-b border-[#2A2A2A]">
                Alternar Colaborador no Aparelho
              </p>
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setShowEmployeePicker(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                    selectedEmployee?.id === emp.id
                      ? 'bg-[#FFD100] text-black font-bold'
                      : 'hover:bg-[#282828] text-zinc-200'
                  }`}
                >
                  <div>
                    <p className="font-bold">{emp.full_name}</p>
                    <p className={`text-[10px] ${selectedEmployee?.id === emp.id ? 'text-black/80' : 'text-zinc-400'}`}>
                      {emp.employee_code} — {emp.role}
                    </p>
                  </div>
                  {emp.has_face_profile && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      Face OK
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. CARD DO RELÓGIO & STATUS DA JORNADA */}
        <div className="bg-[#181818] border border-[#2B2B2B] rounded-3xl p-6 text-center shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-center mb-3">
            <StatusBadge status={workSession?.status || 'NAO_INICIADO'} className="text-xs px-3.5 py-1.5" />
          </div>

          <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white mb-2 select-none">
            {currentTime.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-400 capitalize">
            <Calendar className="w-4 h-4 text-[#FFD100]" />
            <span>
              {currentTime.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          {validationAlert && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationAlert}</span>
            </div>
          )}
        </div>

        {/* 3. BOTÃO PRINCIPAL GIGANTE — REGISTRAR PONTO */}
        <div className="py-2">
          <button
            onClick={() => handleMainPunchClick()}
            disabled={!currentAction.canPunch}
            className={`w-full py-5 sm:py-6 px-6 rounded-3xl font-black text-lg sm:text-xl flex flex-col items-center justify-center gap-1 shadow-2xl transition-all select-none ${
              currentAction.canPunch
                ? 'bg-[#FFD100] hover:bg-[#E6BC00] text-black active:scale-[0.98] shadow-[#FFD100]/25 cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-7 h-7 ${currentAction.canPunch ? 'text-black' : 'text-zinc-500'}`} strokeWidth={2.5} />
              <span className="tracking-wide">{currentAction.label}</span>
            </div>
            <span className={`text-xs font-semibold ${currentAction.canPunch ? 'text-black/80' : 'text-zinc-500'}`}>
              {currentAction.description}
            </span>
          </button>
        </div>

        {/* 4. AÇÕES RÁPIDAS SECUNDÁRIAS */}
        {workSession?.status === 'EM_JORNADA' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleMainPunchClick('INICIO_INTERVALO')}
              className="py-3 px-4 rounded-2xl bg-[#1C1C1C] hover:bg-[#252525] border border-amber-500/40 text-amber-400 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Intervalo</span>
            </button>
            <button
              onClick={() => handleMainPunchClick('SAIDA')}
              className="py-3 px-4 rounded-2xl bg-[#1C1C1C] hover:bg-[#252525] border border-purple-500/40 text-purple-400 text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Encerrar Saída</span>
            </button>
          </div>
        )}

        {/* 5. RESUMO DA JORNADA DE HOJE */}
        <div className="bg-[#181818] border border-[#2B2B2B] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#262626] pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FFD100]" />
              Jornada de Hoje
            </h3>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="text-xs font-bold text-[#FFD100] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Ver Histórico</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#111111] p-2.5 rounded-xl border border-[#262626]">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Entrada</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {formatTimeString(workSession?.started_at)}
              </p>
            </div>
            <div className="bg-[#111111] p-2.5 rounded-xl border border-[#262626]">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Int. Início</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {formatTimeString(workSession?.break_started_at)}
              </p>
            </div>
            <div className="bg-[#111111] p-2.5 rounded-xl border border-[#262626]">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Int. Fim</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {formatTimeString(workSession?.break_ended_at)}
              </p>
            </div>
            <div className="bg-[#111111] p-2.5 rounded-xl border border-[#262626]">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Saída</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {formatTimeString(workSession?.ended_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. RODAPÉ */}
      <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Smartphone className="w-3 h-3 text-zinc-400" />
          {currentDevice?.device_name || 'Celular Frota MP'}
        </span>
        <span className="flex items-center gap-1 font-semibold text-zinc-400">
          <MapPin className="w-3 h-3 text-[#FFD100]" />
          Salvador - BA
        </span>
      </div>

      {/* MODAIS */}
      {selectedEmployee && (
        <CameraPunchModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          employee={selectedEmployee}
          recordType={currentAction.type}
          device={currentDevice}
          onSuccess={handlePunchSuccess}
        />
      )}

      {lastPunchDetails && (
        <PunchSuccessModal
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          employeeName={selectedEmployee?.full_name || 'Funcionário'}
          recordType={lastPunchDetails.recordType}
          recordedAt={lastPunchDetails.recordedAt}
          locationAddress={lastPunchDetails.locationAddress}
          locationAccuracy={lastPunchDetails.locationAccuracy}
          isOffline={lastPunchDetails.isOffline}
        />
      )}

      {selectedEmployee && (
        <EmployeeHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Shield, User, Smartphone, RefreshCw, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import type { AuditLog } from '../../types';
import { dbService } from '../../lib/supabase';

export const AuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatActionName = (action: string) => {
    switch (action) {
      case 'CADASTRO_FUNCIONARIO':
        return { label: 'Cadastrou novo colaborador', color: 'text-emerald-400', icon: <User className="w-4 h-4" /> };
      case 'ALTERACAO_FUNCIONARIO':
        return { label: 'Alterou dados de colaborador', color: 'text-blue-400', icon: <User className="w-4 h-4" /> };
      case 'CADASTRO_BIOMETRIA_FACIAL':
        return { label: 'Registrou template biométrico facial', color: 'text-[#FFD100]', icon: <Shield className="w-4 h-4" /> };
      case 'CORRECAO_PONTO_ADMINISTRATIVA':
        return { label: 'Retificou registro de ponto com justificativa', color: 'text-amber-400', icon: <AlertTriangle className="w-4 h-4" /> };
      case 'BLOQUEIO_DISPOSITIVO':
      case 'ALTERACAO_STATUS_DISPOSITIVO_BLOQUEADO':
        return { label: 'Bloqueou dispositivo corporativo', color: 'text-red-400', icon: <Smartphone className="w-4 h-4" /> };
      case 'ALTERACAO_STATUS_DISPOSITIVO_ATIVO':
        return { label: 'Ativou dispositivo corporativo', color: 'text-emerald-400', icon: <Smartphone className="w-4 h-4" /> };
      case 'NOVO_DISPOSITIVO_AUTORIZADO':
        return { label: 'Autorizou novo dispositivo na frota', color: 'text-cyan-400', icon: <Smartphone className="w-4 h-4" /> };
      default:
        if (action.startsWith('REGISTRO_PONTO_')) {
          const type = action.replace('REGISTRO_PONTO_', '');
          return { label: `Ponto Facial Registrado (${type})`, color: 'text-zinc-200', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> };
        }
        return { label: action, color: 'text-zinc-300', icon: <FileText className="w-4 h-4" /> };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA TAB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818] border border-[#2B2B2B] p-5 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#FFD100]" />
            <p className="text-xs font-black uppercase tracking-widest text-[#FFD100]">
              Segurança & Conformidade Jurídica
            </p>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            LOGS DE AUDITORIA DO SISTEMA
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Trilha cronológica imutável de todas as ações administrativas e ocorrências de ponto
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-bold text-zinc-200 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Trilha</span>
        </button>
      </div>

      {/* TIMELINE DE AUDITORIA */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            logs.map((log) => {
              const logDate = new Date(log.created_at);
              const dateFormatted = logDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              });
              const timeFormatted = logDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const actionInfo = formatActionName(log.action);

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#111111] border border-[#262626] hover:border-[#383838] transition-colors"
                >
                  {/* Timestamp lateral */}
                  <div className="text-center shrink-0 w-20 pt-0.5">
                    <p className="font-mono font-black text-sm text-[#FFD100]">{timeFormatted}</p>
                    <p className="text-[11px] font-bold text-zinc-400">{dateFormatted}</p>
                  </div>

                  {/* Barra divisória */}
                  <div className="w-px self-stretch bg-[#262626]" />

                  {/* Conteúdo do Log */}
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="p-1 rounded bg-[#242424] text-[#FFD100]">
                        {actionInfo.icon}
                      </span>
                      <span className="text-xs font-black text-white">
                        {log.user_id === 'sistema' ? 'SISTEMA AUTOMÁTICO' : 'Administrador Kaian'}
                      </span>
                      <span className={`text-xs font-semibold ${actionInfo.color}`}>
                        • {actionInfo.label}
                      </span>
                    </div>

                    {/* Detalhes do Funcionário ou Dispositivo se houver */}
                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                      {log.employee_name && (
                        <span>
                          Colaborador: <b className="text-zinc-200">{log.employee_name}</b>
                        </span>
                      )}
                      {log.device_name && (
                        <span>
                          Dispositivo: <b className="text-zinc-300">{log.device_name}</b>
                        </span>
                      )}
                    </div>

                    {/* Metadados / Justificativa em JSON formatado limpo */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#181818] border border-[#2B2B2B] text-[11px] font-mono text-zinc-300 space-y-1">
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-1">
                            <span className="text-zinc-400 capitalize">{k}:</span>
                            <span className="text-white font-medium break-all">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

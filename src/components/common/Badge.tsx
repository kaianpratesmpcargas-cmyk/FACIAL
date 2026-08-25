import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'EM_JORNADA':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Em Jornada
        </span>
      );
    case 'EM_INTERVALO':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/40 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Em Intervalo
        </span>
      );
    case 'FINALIZADA':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
          Jornada Finalizada
        </span>
      );
    case 'NAO_INICIADO':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
          Não Iniciado
        </span>
      );
    case 'ATIVO':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Ativo
        </span>
      );
    case 'INATIVO':
    case 'BLOQUEADO':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          {status === 'BLOQUEADO' ? 'Bloqueado' : 'Inativo'}
        </span>
      );
    case 'RESERVA':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          Reserva
        </span>
      );
    case 'ENTRADA':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ${className}`}>
          ENTRADA
        </span>
      );
    case 'INICIO_INTERVALO':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 ${className}`}>
          INÍCIO INTERVALO
        </span>
      );
    case 'RETORNO_INTERVALO':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 ${className}`}>
          RETORNO INTERVALO
        </span>
      );
    case 'SAIDA':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 ${className}`}>
          SAÍDA
        </span>
      );
    case 'SINCRONIZADO':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-emerald-400 ${className}`}>
          ✓ Sincronizado
        </span>
      );
    case 'OFFLINE_PENDENTE':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-500/30 ${className}`}>
          ⏳ Salvo Offline
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 ${className}`}>
          {status}
        </span>
      );
  }
};

import React from 'react';
import { Truck, Shield, Smartphone, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentView: 'employee' | 'admin';
  onViewChange: (view: 'employee' | 'admin') => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  isOnline,
  isSyncing,
  pendingCount,
}) => {
  return (
    <header className="bg-[#111111] border-b border-[#262626] sticky top-0 z-40 px-4 py-3 select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo Corporativo MP CARGAS */}
        <div 
          onClick={() => onViewChange('employee')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#FFD100] flex items-center justify-center text-black font-black text-xl shadow-lg shadow-[#FFD100]/20 group-hover:scale-105 transition-transform">
            <Truck className="w-6 h-6 text-[#111111]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-wider text-[#FFD100]">MP CARGAS</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[#262626] text-zinc-300 border border-[#333333]">
                PONTO
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
              Controle de Jornada Facial
            </p>
          </div>
        </div>

        {/* Status de Conexão & Navegação de Perfil */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Indicador de Conexão / Fila Offline */}
          <div className="flex items-center">
            {isSyncing ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-400 text-xs font-medium animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Sincronizando...</span>
              </div>
            ) : !isOnline || pendingCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>
                  {pendingCount > 0 ? `${pendingCount} offline` : 'Modo Offline'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </div>
            )}
          </div>

          {/* Botão de Alternância de Visão (Ponto Móvel vs Painel Admin) */}
          <div className="flex items-center bg-[#1A1A1A] p-1 rounded-lg border border-[#333333]">
            <button
              onClick={() => onViewChange('employee')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentView === 'employee'
                  ? 'bg-[#FFD100] text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ponto Móvel</span>
            </button>
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentView === 'admin'
                  ? 'bg-[#FFD100] text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Painel Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Truck, Wifi, WifiOff, RefreshCw, LogOut, Shield } from 'lucide-react';
import type { Employee } from '../../types';

interface HeaderProps {
  currentView: 'employee' | 'admin';
  loggedEmployee?: Employee | null;
  onLogout: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  loggedEmployee,
  onLogout,
  isOnline,
  isSyncing,
  pendingCount,
}) => {
  return (
    <header className="bg-[#111111] border-b border-[#262626] sticky top-0 z-40 px-4 py-3 select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Logo Corporativo MP CARGAS */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD100] flex items-center justify-center text-black font-black text-xl shadow-lg shadow-[#FFD100]/20 shrink-0">
            <Truck className="w-6 h-6 text-[#111111]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-wider text-[#FFD100]">MP CARGAS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#262626] text-zinc-300 border border-[#333333]">
                {currentView === 'admin' ? 'ADMIN' : 'PONTO'}
              </span>
            </div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-medium">
              {currentView === 'admin' ? 'Gestão Corporativa' : (loggedEmployee?.full_name || 'Registro Facial')}
            </p>
          </div>
        </div>

        {/* Status de Conexão & Botão Sair */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
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
                  {pendingCount > 0 ? `${pendingCount} offline` : 'Offline'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </div>
            )}
          </div>

          {/* Badge de Admin quando logado como admin */}
          {currentView === 'admin' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#242424] border border-[#3A3A3A] text-xs font-bold text-[#FFD100]">
              <Shield className="w-3.5 h-3.5" />
              <span>Painel Admin</span>
            </div>
          )}

          {/* Botão Sair / Trocar Usuário */}
          <button
            onClick={onLogout}
            title="Sair da Sessão"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-red-950/80 border border-[#333333] hover:border-red-500/40 text-zinc-300 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};

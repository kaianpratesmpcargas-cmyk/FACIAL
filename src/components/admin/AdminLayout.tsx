import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Smartphone, 
  ShieldAlert, 
  Database,
  LogOut
} from 'lucide-react';
import { DashboardTab } from './DashboardTab';
import { EmployeesTab } from './EmployeesTab';
import { RecordsTab } from './RecordsTab';
import { DevicesTab } from './DevicesTab';
import { AuditLogsTab } from './AuditLogsTab';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AdminLayoutProps {
  onBackToEmployee: () => void;
}

type AdminTab = 'dashboard' | 'employees' | 'records' | 'devices' | 'audit';

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToEmployee }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard Hoje', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'employees' as AdminTab, label: 'Funcionários', icon: <Users className="w-4 h-4" /> },
    { id: 'records' as AdminTab, label: 'Registros de Ponto', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'devices' as AdminTab, label: 'Dispositivos', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'audit' as AdminTab, label: 'Auditoria & Logs', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* BARRA SUPERIOR DE NAVEGAÇÃO ADMINISTRATIVA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        
        {/* Abas */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#181818] p-1.5 rounded-2xl border border-[#2B2B2B]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === item.id
                  ? 'bg-[#FFD100] text-black shadow-md shadow-[#FFD100]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-[#222222]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Status do Backend Supabase e Botão Sair */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181818] border border-[#2B2B2B] text-xs">
            <Database className="w-3.5 h-3.5 text-[#FFD100]" />
            <span className="text-zinc-400">Banco:</span>
            <span className="font-bold text-white">
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Supabase (Modo Integrado Ativo)'}
            </span>
          </div>

          <button
            onClick={onBackToEmployee}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#242424] hover:bg-red-950/80 border border-[#3A3A3A] hover:border-red-500/40 text-xs font-bold text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      <div className="animate-fadeIn">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'records' && <RecordsTab />}
        {activeTab === 'devices' && <DevicesTab />}
        {activeTab === 'audit' && <AuditLogsTab />}
      </div>
    </div>
  );
};

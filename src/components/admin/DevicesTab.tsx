import React, { useEffect, useState } from 'react';
import { 
  Smartphone, 
  Plus, 
  Lock, 
  Unlock, 
  Tablet,
  Laptop
} from 'lucide-react';
import type { Device, DeviceStatus } from '../../types';
import { dbService } from '../../lib/supabase';
import { StatusBadge } from '../common/Badge';

export const DevicesTab: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);

  // Modal de Novo Dispositivo
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIdentifier, setNewDeviceIdentifier] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const data = await dbService.getDevices();
      setDevices(data);
    } catch (err) {
      console.error('Erro ao carregar dispositivos:', err);
    }
  };

  const handleUpdateStatus = async (device: Device, newStatus: DeviceStatus) => {
    const actionText = newStatus === 'BLOQUEADO' ? 'BLOQUEAR' : newStatus === 'ATIVO' ? 'ATIVAR' : 'marcar como RESERVA';
    if (confirm(`Deseja realmente ${actionText} o dispositivo "${device.device_name}"?`)) {
      await dbService.updateDeviceStatus(device.id, newStatus);
      loadDevices();
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName || !newDeviceIdentifier) return;

    try {
      await dbService.getOrCreateCurrentDevice(newDeviceIdentifier, newDeviceName);
      setIsAddOpen(false);
      setNewDeviceName('');
      setNewDeviceIdentifier('');
      loadDevices();
    } catch (err) {
      console.error('Erro ao autorizar novo dispositivo:', err);
    }
  };

  const getDeviceIcon = (name: string) => {
    if (name.toLowerCase().includes('tab')) return <Tablet className="w-5 h-5 text-[#FFD100]" />;
    if (name.toLowerCase().includes('terminal') || name.toLowerCase().includes('windows') || name.toLowerCase().includes('mac')) {
      return <Laptop className="w-5 h-5 text-[#FFD100]" />;
    }
    return <Smartphone className="w-5 h-5 text-[#FFD100]" />;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DA TAB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818] border border-[#2B2B2B] p-5 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#FFD100]" />
            <p className="text-xs font-black uppercase tracking-widest text-[#FFD100]">
              Gestão de Frota & Aparelhos Móveis
            </p>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            DISPOSITIVOS CORPORATIVOS
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Autorização, bloqueio remoto de celulares perdidos/danificados e segurança de acesso
          </p>
        </div>

        <button
          onClick={() => {
            setNewDeviceIdentifier(`MP-DEV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-black text-xs transition-all shadow-lg shadow-[#FFD100]/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-black" strokeWidth={3} />
          <span>Autorizar Novo Dispositivo</span>
        </button>
      </div>

      {/* CARDS DE DISPOSITIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => {
          const lastSeenDate = new Date(device.last_seen);
          const isBlocked = device.status === 'BLOQUEADO';

          return (
            <div
              key={device.id}
              className={`bg-[#181818] border rounded-3xl p-5 flex flex-col justify-between transition-all ${
                isBlocked
                  ? 'border-red-500/40 bg-red-950/10'
                  : 'border-[#2B2B2B] hover:border-[#444444]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#242424] border border-[#333333] flex items-center justify-center shrink-0">
                      {getDeviceIcon(device.device_name)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base leading-tight">
                        {device.device_name}
                      </h3>
                      <p className="font-mono text-xs text-zinc-400 mt-0.5">
                        ID: <span className="text-[#FFD100]">{device.device_identifier}</span>
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={device.status} />
                </div>

                <div className="bg-[#111111] rounded-2xl p-3.5 border border-[#262626] text-xs space-y-1.5 mb-4">
                  <div className="flex justify-between text-zinc-400">
                    <span>Última Atividade:</span>
                    <span className="font-mono text-white font-medium">
                      {lastSeenDate.toLocaleDateString('pt-BR')} às {lastSeenDate.toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Data de Cadastro:</span>
                    <span className="text-zinc-300">
                      {new Date(device.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#262626]">
                {device.status !== 'ATIVO' && (
                  <button
                    onClick={() => handleUpdateStatus(device, 'ATIVO')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Ativar Aparelho</span>
                  </button>
                )}

                {device.status !== 'RESERVA' && (
                  <button
                    onClick={() => handleUpdateStatus(device, 'RESERVA')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#242424] hover:bg-[#303030] text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Colocar em Reserva
                  </button>
                )}

                {device.status !== 'BLOQUEADO' && (
                  <button
                    onClick={() => handleUpdateStatus(device, 'BLOQUEADO')}
                    className="py-2.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloquear</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE AUTORIZAR NOVO DISPOSITIVO */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">AUTORIZAR NOVO DISPOSITIVO</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                  Nome do Dispositivo (Ex: Modelo ou Placa da Frota)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CEL-005 (Samsung Galaxy XCover - Frota 18)"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                  Identificador Único do Dispositivo (Token)
                </label>
                <input
                  type="text"
                  required
                  value={newDeviceIdentifier}
                  onChange={(e) => setNewDeviceIdentifier(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] text-xs text-zinc-400">
                O funcionário poderá acessar o PWA a partir de qualquer celular autorizado sem perder nenhum registro de seu histórico.
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#242424] hover:bg-[#303030] text-zinc-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs cursor-pointer"
                >
                  Autorizar Dispositivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

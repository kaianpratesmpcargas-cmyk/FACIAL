import { useEffect, useState } from 'react';
import { Header } from './components/common/Header';
import { InstallPwaBanner } from './components/common/InstallPwaBanner';
import { EmployeeHome } from './components/employee/EmployeeHome';
import { AdminLayout } from './components/admin/AdminLayout';
import { dbService } from './lib/supabase';
import { getLocalDeviceIdentifier, getLocalDeviceName } from './lib/deviceManager';
import { syncManager } from './lib/offlineSync';
import type { Device } from './types';

export function App() {
  const [currentView, setCurrentView] = useState<'employee' | 'admin'>('employee');
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);

  // Status de Rede & Sincronização
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: syncManager.getPendingCount(),
  });

  // Notificação Toast de Sincronização
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    // Inicializa o dispositivo local
    const initDevice = async () => {
      const devId = getLocalDeviceIdentifier();
      const devName = getLocalDeviceName();
      const dev = await dbService.getOrCreateCurrentDevice(devId, devName);
      setCurrentDevice(dev);
    };

    initDevice();

    // Inscreve no gerenciador de sincronização
    const unsubscribe = syncManager.subscribe((status) => {
      setNetworkStatus({
        isOnline: status.isOnline,
        isSyncing: status.isSyncing,
        pendingCount: status.pendingCount,
      });

      if (status.justSyncedCount && status.justSyncedCount > 0) {
        setSyncToast(`✓ ${status.justSyncedCount} registro(s) sincronizado(s) com sucesso!`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-sans">
      
      {/* Banner de Instalação PWA */}
      <InstallPwaBanner />

      {/* Header Corporativo MP CARGAS */}
      <Header
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        isOnline={networkStatus.isOnline}
        isSyncing={networkStatus.isSyncing}
        pendingCount={networkStatus.pendingCount}
      />

      {/* Toast Flutuante de Sincronização */}
      {syncToast && (
        <div className="fixed top-20 right-4 z-50 bg-[#22C55E] text-black font-extrabold px-4 py-2.5 rounded-2xl shadow-xl animate-fadeIn flex items-center gap-2 text-xs">
          <span>{syncToast}</span>
        </div>
      )}

      {/* Visualização Ativa */}
      <main className="flex-1">
        {currentView === 'employee' ? (
          <EmployeeHome
            currentDevice={currentDevice}
            isOnline={networkStatus.isOnline}
            pendingCount={networkStatus.pendingCount}
          />
        ) : (
          <AdminLayout onBackToEmployee={() => setCurrentView('employee')} />
        )}
      </main>
    </div>
  );
}

export default App;

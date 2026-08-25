import { useEffect, useState } from 'react';
import { Header } from './components/common/Header';
import { InstallPwaBanner } from './components/common/InstallPwaBanner';
import { SplashScreen } from './components/common/SplashScreen';
import { EmployeeHome } from './components/employee/EmployeeHome';
import { AdminLayout } from './components/admin/AdminLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { dbService } from './lib/supabase';
import { getLocalDeviceIdentifier, getLocalDeviceName } from './lib/deviceManager';
import { syncManager } from './lib/offlineSync';
import type { Device, Employee } from './types';

interface AuthSession {
  role: 'admin' | 'employee';
  employee?: Employee;
}

const AUTH_STORAGE_KEY = 'mp_cargas_auth_session';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

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

  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  };

  const handleLogout = () => {
    setAuthSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Se não estiver autenticado, exibe a tela de login
  if (!authSession) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col font-sans">
        {showSplash && <SplashScreen durationMs={1600} onFinish={() => setShowSplash(false)} />}
        <InstallPwaBanner />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col font-sans">
      {/* Splash Screen Comemorativa MP CARGAS 30 ANOS (1.6s) */}
      {showSplash && <SplashScreen durationMs={1600} onFinish={() => setShowSplash(false)} />}
      
      {/* Banner de Instalação PWA */}
      <InstallPwaBanner />

      {/* Header Corporativo MP CARGAS */}
      <Header
        currentView={authSession.role}
        loggedEmployee={authSession.employee}
        onLogout={handleLogout}
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

      {/* Visualização Ativa Conforme o Perfil Autenticado */}
      <main className="flex-1">
        {authSession.role === 'employee' && authSession.employee ? (
          <EmployeeHome
            loggedEmployee={authSession.employee}
            currentDevice={currentDevice}
            isOnline={networkStatus.isOnline}
            pendingCount={networkStatus.pendingCount}
          />
        ) : (
          <AdminLayout onBackToEmployee={handleLogout} />
        )}
      </main>
    </div>
  );
}

export default App;

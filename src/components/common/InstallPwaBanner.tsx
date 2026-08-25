import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-[#1C1C1C] border-b border-[#333333] px-4 py-2.5 flex items-center justify-between text-xs text-white animate-fadeIn">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#FFD100] flex items-center justify-center text-black font-black shrink-0">
          <Smartphone className="w-4 h-4 text-black" />
        </div>
        <div>
          <p className="font-bold text-white leading-tight">Instalar Aplicativo MP CARGAS PONTO</p>
          <p className="text-[10px] text-zinc-400">Adicione à tela inicial do celular para acesso instantâneo sem navegador</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs shadow-md shadow-[#FFD100]/20 flex items-center gap-1.5 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar PWA</span>
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

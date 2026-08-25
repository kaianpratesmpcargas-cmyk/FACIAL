import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number; // 1600ms por padrão
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 1600,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Inicia o fade-out suave um pouco antes do final (~1250ms)
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs - 350);

    // Finaliza e desmonta o splash em exatamente durationMs (1600ms)
    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden transition-all duration-350 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Luz ambiente dourada de fundo */}
      <div className="absolute w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#FFD100]/15 blur-[100px] animate-splash-glow pointer-events-none" />

      {/* Conteúdo Central — Arte MP CARGAS 30 ANOS */}
      <div className="relative w-full max-w-sm sm:max-w-md px-4 flex flex-col items-center justify-center">
        
        {/* Container da Imagem com Efeito de Luz */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#FFD100]/10 border border-[#2A2A2A]/40 bg-black/40 backdrop-blur-sm animate-fadeIn">
          
          <img
            src="/splash_mpcargas.png"
            alt="MP CARGAS 30 ANOS — Controle de Ponto"
            className="w-full h-auto max-h-[85vh] object-contain rounded-3xl"
          />

          {/* Feixe de Luz Dourado Passando Sobre o 30 ANOS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#FFD100]/25 to-transparent animate-gold-sheen" />
          </div>
        </div>

        {/* Linha de Carregamento Rápida no Rodapé */}
        <div className="w-44 h-1 bg-[#222222] rounded-full mt-5 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#FFD100] to-[#E6BC00] rounded-full transition-all ease-linear"
            style={{
              width: isFadingOut ? '100%' : '85%',
              transitionDuration: `${durationMs - 200}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

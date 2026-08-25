import React, { useState } from 'react';
import { Truck, Lock, User, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { dbService } from '../../lib/supabase';
import type { Employee } from '../../types';

interface LoginScreenProps {
  onLoginSuccess: (session: { role: 'admin' | 'employee'; employee?: Employee }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Formatação automática do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 9) {
      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (val.length > 6) {
      val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (val.length > 3) {
      val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    setCpf(val);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanCpf = cpf.replace(/\D/g, '');

    try {
      // 1. VERIFICA LOGIN DE ADMINISTRADOR (CPF: 00000000000 / Senha: 124578)
      if (cleanCpf === '00000000000' && password === '124578') {
        onLoginSuccess({ role: 'admin' });
        return;
      }

      // 2. VERIFICA LOGIN DE FUNCIONÁRIO (Senha: 1234)
      if (password !== '1234') {
        setError('CPF ou senha incorretos. Verifique suas credenciais.');
        setIsLoading(false);
        return;
      }

      const employees = await dbService.getEmployees();
      const employee = employees.find((emp) => {
        const empCpfClean = emp.cpf.replace(/\D/g, '');
        return empCpfClean === cleanCpf && emp.status === 'ATIVO';
      });

      if (!employee) {
        setError('CPF não encontrado ou colaborador inativo no sistema.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess({ role: 'employee', employee });
    } catch (err: any) {
      setError(err?.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col justify-center items-center p-4 sm:p-6 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#181818] border border-[#2B2B2B] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* LOGO CORPORATIVO MP CARGAS */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#FFD100] flex items-center justify-center text-black font-black shadow-xl shadow-[#FFD100]/20">
            <Truck className="w-9 h-9 text-[#111111]" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>MP CARGAS</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#2A2A2A] text-[#FFD100] border border-[#3A3A3A]">
                PONTO
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Acesso exclusivo para colaboradores e gestão
            </p>
          </div>
        </div>

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Campo CPF */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FFD100]" />
              <span>CPF</span>
            </label>
            <input
              type="tel"
              required
              autoFocus
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-2xl py-3.5 px-4 text-sm text-white placeholder-zinc-500 font-mono outline-none transition-colors"
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FFD100]" />
              <span>Senha de Acesso</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-2xl py-3.5 px-4 text-sm text-white placeholder-zinc-500 font-mono outline-none transition-colors"
            />
          </div>

          {/* Mensagem de Erro Discreta */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFD100]/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{isLoading ? 'Acessando...' : 'Entrar no Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Rodapé Informativo Corporativo */}
        <div className="pt-2 border-t border-[#242424] text-center text-[11px] text-zinc-500">
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>MP CARGAS Logística • Ponto Biométrico Seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

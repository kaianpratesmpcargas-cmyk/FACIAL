import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Scan, 
  Edit3, 
  Power, 
  CheckCircle2, 
  XCircle, 
  X, 
  Save,
  Trash2
} from 'lucide-react';
import type { Employee } from '../../types';
import { dbService } from '../../lib/supabase';
import { StatusBadge } from '../common/Badge';
import { FaceEnrollModal } from './FaceEnrollModal';

export const EmployeesTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('TODOS');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [enrollingEmployee, setEnrollingEmployee] = useState<Employee | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('Operações / Transporte');
  const [role, setRole] = useState('Motorista Carreteiro');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await dbService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFullName('');
    setCpf('');
    setEmployeeCode(`MP-${Math.floor(1000 + Math.random() * 9000)}`);
    setDepartment('Operações / Transporte');
    setRole('Motorista Carreteiro');
    setStatus('ATIVO');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFullName(emp.full_name);
    setCpf(emp.cpf);
    setEmployeeCode(emp.employee_code);
    setDepartment(emp.department);
    setRole(emp.role);
    setStatus(emp.status);
    setIsFormModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !cpf) return;

    try {
      const saved = await dbService.saveEmployee({
        id: editingEmployee?.id,
        full_name: fullName,
        cpf,
        employee_code: employeeCode,
        department,
        role,
        status,
      });

      setIsFormModalOpen(false);
      await loadEmployees();

      // Se for novo cadastro sem biometria, abre a câmera para cadastrar a face imediatamente
      if (!editingEmployee) {
        setEnrollingEmployee(saved);
      }
    } catch (err) {
      console.error('Erro ao salvar funcionário:', err);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    if (confirm(`Deseja alterar o status de ${emp.full_name} para ${emp.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'}?`)) {
      await dbService.toggleEmployeeStatus(emp.id);
      loadEmployees();
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (confirm(`Atenção: Deseja realmente excluir o colaborador ${emp.full_name} (${emp.employee_code})? Todos os registros e biometrias associados serão removidos.`)) {
      await dbService.deleteEmployee(emp.id);
      loadEmployees();
    }
  };

  // Filtragem
  const departmentsList = Array.from(new Set(employees.map((e) => e.department)));

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.cpf.includes(search) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase());

    const matchesDept = selectedDept === 'TODOS' || e.department === selectedDept;
    const matchesStatus = selectedStatus === 'TODOS' || e.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DA ABA & BOTÃO DE CADASTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#FFD100]" />
            <span>GESTÃO DE COLABORADORES</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Cadastre colaboradores e gerencie o reconhecimento facial biométrico
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs shadow-lg shadow-[#FFD100]/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#181818] p-4 rounded-2xl border border-[#2B2B2B]">
        {/* Campo de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou matrícula..."
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* Filtro por Departamento */}
        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none transition-colors"
          >
            <option value="TODOS">Todos os Departamentos</option>
            {departmentsList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none transition-colors"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Somente Ativos</option>
            <option value="INATIVO">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* TABELA DE FUNCIONÁRIOS */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-zinc-400 font-bold uppercase tracking-wider border-b border-[#262626]">
              <tr>
                <th className="py-4 px-5">Colaborador</th>
                <th className="py-4 px-4">Matrícula / CPF</th>
                <th className="py-4 px-4">Departamento / Função</th>
                <th className="py-4 px-4 text-center">Biometria Facial</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-medium">
                    {employees.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-zinc-400 font-bold">Nenhum funcionário cadastrado no sistema.</p>
                        <button
                          onClick={handleOpenCreate}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFD100] text-black font-extrabold text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Cadastrar Primeiro Colaborador</span>
                        </button>
                      </div>
                    ) : (
                      'Nenhum colaborador encontrado com os filtros selecionados.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#202020] transition-colors">
                    
                    {/* Foto / Nome */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {emp.photo_preview ? (
                          <img
                            src={emp.photo_preview}
                            alt={emp.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/60 shrink-0 shadow"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#242424] border border-[#333333] flex items-center justify-center text-[#FFD100] font-bold text-sm shrink-0">
                            {emp.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-white text-sm">{emp.full_name}</p>
                          <p className="text-[11px] text-zinc-400">{emp.role}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-zinc-300">
                      <span className="font-bold text-[#FFD100]">{emp.employee_code}</span>
                      <p className="text-[10px] text-zinc-400">{emp.cpf}</p>
                    </td>

                    <td className="py-4 px-4 text-zinc-300">
                      <p className="font-semibold">{emp.department}</p>
                      <p className="text-[10px] text-zinc-400">{emp.role}</p>
                    </td>

                    {/* Status da Biometria Facial */}
                    <td className="py-4 px-4 text-center">
                      {emp.has_face_profile ? (
                        <button
                          onClick={() => setEnrollingEmployee(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/50 cursor-pointer shadow-sm"
                          title="Clique para recadastrar biometria"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Face Cadastrada</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setEnrollingEmployee(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 hover:bg-[#FFD100] hover:text-black text-amber-400 border border-amber-500/40 cursor-pointer transition-colors"
                          title="Clique para cadastrar biometria facial agora"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cadastrar Face</span>
                        </button>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={emp.status} />
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEnrollingEmployee(emp)}
                          title="Cadastrar / Recadastrar Biometria Facial"
                          className="p-2 rounded-xl bg-[#252525] hover:bg-[#FFD100] text-zinc-300 hover:text-black transition-colors cursor-pointer"
                        >
                          <Scan className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(emp)}
                          title="Editar Dados Pessoais"
                          className="p-2 rounded-xl bg-[#252525] hover:bg-[#333333] text-zinc-300 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(emp)}
                          title={emp.status === 'ATIVO' ? 'Desativar Funcionário' : 'Ativar Funcionário'}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            emp.status === 'ATIVO'
                              ? 'bg-[#252525] hover:bg-red-950 text-zinc-400 hover:text-red-400'
                              : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          title="Excluir Colaborador"
                          className="p-2 rounded-xl bg-[#252525] hover:bg-red-950 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE FUNCIONÁRIO */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#181818] border border-[#333333] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-5 bg-[#111111] border-b border-[#262626] flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">
                {editingEmployee ? 'EDITAR FUNCIONÁRIO' : 'CADASTRAR NOVO FUNCIONÁRIO'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#333333] text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João Silva Santos"
                  className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">Matrícula Corporativa</label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="MP-0000"
                    className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">Departamento</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                  >
                    <option value="Operações / Transporte">Operações / Transporte</option>
                    <option value="Centro de Distribuição">Centro de Distribuição</option>
                    <option value="Manutenção & Frota">Manutenção & Frota</option>
                    <option value="Gestão Operacional">Gestão Operacional</option>
                    <option value="Logística Reversa">Logística Reversa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">Função / Cargo</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Motorista Carreteiro"
                    className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">Status Cadastral</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#111111] border border-[#333333] focus:border-[#FFD100] rounded-xl py-2.5 px-3 text-xs text-white outline-none"
                >
                  <option value="ATIVO">ATIVO (Permitido bater ponto)</option>
                  <option value="INATIVO">INATIVO (Acesso bloqueado)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#242424] hover:bg-[#303030] text-zinc-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FFD100]/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar e Cadastrar Biometria</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO BIOMÉTRICO */}
      {enrollingEmployee && (
        <FaceEnrollModal
          isOpen={Boolean(enrollingEmployee)}
          onClose={() => setEnrollingEmployee(null)}
          employee={enrollingEmployee}
          onEnrolled={() => {
            loadEmployees();
          }}
        />
      )}
    </div>
  );
};

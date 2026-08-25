import * as XLSX from 'xlsx';
import type { TimeRecord } from '../types';
import { getGoogleMapsUrl } from './location';

/**
 * Utilitário de Exportação de Relatórios Corporativos (CSV & Excel)
 */

export function exportTimeRecordsToExcel(records: TimeRecord[], filename = 'MP_CARGAS_Relatorio_Ponto.xlsx') {
  const formattedData = records.map((r, index) => {
    const recDate = new Date(r.recorded_at);
    const mapsUrl = r.latitude && r.longitude ? getGoogleMapsUrl(r.latitude, r.longitude) : 'N/D';
    return {
      '#': index + 1,
      'Data': recDate.toLocaleDateString('pt-BR'),
      'Hora': recDate.toLocaleTimeString('pt-BR'),
      'Funcionário': r.employee?.full_name || 'Não identificado',
      'Matrícula': r.employee?.employee_code || '-',
      'CPF': r.employee?.cpf || '-',
      'Departamento': r.employee?.department || '-',
      'Cargo': r.employee?.role || '-',
      'Tipo de Registro': formatRecordType(r.record_type),
      'Dispositivo': r.device?.device_name || 'Dispositivo Padrão',
      'Identificador Dispositivo': r.device?.device_identifier || '-',
      'Localização / Cidade': r.location_address || `${r.latitude}, ${r.longitude}`,
      'Link Google Maps': mapsUrl,
      'Precisão GPS (m)': r.location_accuracy ? `${r.location_accuracy}m` : 'N/D',
      'Método de Validação': r.verification_method,
      'Validação Biométrica': 'VALIDADO',
      'Status Validação': r.verification_status,
      'Sincronização': r.sync_status,
      'Corrigido': r.is_corrected ? 'SIM' : 'NÃO',
      'Motivo Correção': r.correction_reason || '-',
      'Chave Idempotência': r.idempotency_key,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros de Ponto');

  const colWidths = [
    { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 26 }, { wch: 12 },
    { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 28 },
    { wch: 20 }, { wch: 30 }, { wch: 45 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
    { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 32 }
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
}

export function exportTimeRecordsToCSV(records: TimeRecord[], filename = 'MP_CARGAS_Relatorio_Ponto.csv') {
  const headers = [
    'Data',
    'Hora',
    'Matricula',
    'Funcionario',
    'CPF',
    'Departamento',
    'Cargo',
    'Tipo',
    'Dispositivo',
    'Localizacao',
    'Link_Google_Maps',
    'Precisao_GPS',
    'Score_Facial',
    'Status',
    'Corrigido',
    'Motivo_Correcao'
  ];

  const rows = records.map((r) => {
    const recDate = new Date(r.recorded_at);
    const mapsUrl = r.latitude && r.longitude ? getGoogleMapsUrl(r.latitude, r.longitude) : 'N/D';
    return [
      `"${recDate.toLocaleDateString('pt-BR')}"`,
      `"${recDate.toLocaleTimeString('pt-BR')}"`,
      `"${r.employee?.employee_code || '-'}"`,
      `"${(r.employee?.full_name || '').replace(/"/g, '""')}"`,
      `"${r.employee?.cpf || '-'}"`,
      `"${r.employee?.department || '-'}"`,
      `"${r.employee?.role || '-'}"`,
      `"${formatRecordType(r.record_type)}"`,
      `"${(r.device?.device_name || '').replace(/"/g, '""')}"`,
      `"${(r.location_address || '').replace(/"/g, '""')}"`,
      `"${mapsUrl}"`,
      `"${r.location_accuracy ? r.location_accuracy + 'm' : 'N/D'}"`,
      `"VALIDADO"`,
      `"${r.verification_status}"`,
      `"${r.is_corrected ? 'SIM' : 'NAO'}"`,
      `"${(r.correction_reason || '').replace(/"/g, '""')}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatRecordType(type: string): string {
  switch (type) {
    case 'ENTRADA': return 'Entrada';
    case 'INICIO_INTERVALO': return 'Início do Intervalo';
    case 'RETORNO_INTERVALO': return 'Retorno do Intervalo';
    case 'SAIDA': return 'Saída';
    default: return type;
  }
}

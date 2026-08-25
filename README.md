# MP CARGAS — PONTO ELETRÔNICO CORPORATIVO (PWA)

Sistema corporativo de controle de jornada e registro de ponto através de reconhecimento facial com liveness detection, geolocalização GPS de alta precisão, suporte offline com sincronização idempotente e painel administrativo completo.

---

## 🚚 Identidade Visual da Marca (MP CARGAS)

- **Amarelo MP**: `#FFD100` (Acentos de alta visibilidade, botões de ação e identidade de frota)
- **Preto Industrial**: `#111111` (Fundo primário e superfícies escuras com alto contraste)
- **Branco**: `#FFFFFF` (Tipografia e legibilidade máxima em ambiente operacional)
- **Verde Sucesso**: `#22C55E` (Confirmação biométrica e status positivo)
- **Vermelho Alerta**: `#EF4444` (Bloqueios, ausências e erros)
- **Cinza Neutro**: Metadados, precisão GPS e referências secundárias

---

## ⚙️ Arquitetura & Tecnologias

- **Frontend PWA**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Reconhecimento Facial & Liveness**: Motor biométrico executado localmente no dispositivo (Canvas + Spatial Frequency Embedding + 128D Descriptors).
- **Conformidade LGPD**: Não armazena fotos brutas desnecessariamente; grava apenas os vetores descritores numéricos isolados na tabela `face_profiles`.
- **GPS & Geolocalização**: Captura de coordenadas no exato momento da batida com precisão em metros e geocodificação reversa.
- **Funcionamento Offline-First**: Armazenamento local em fila com UUIDv4 de idempotência e sincronização automática em segundo plano assim que a conexão retornar.
- **Gestão de Dispositivos**: Troca ágil de celulares corporativos danificados sem perda de histórico e com bloqueio remoto instantâneo.
- **Backend Supabase**: Script PostgreSQL (`src/supabase/schema.sql`) com Row Level Security (RLS), Triggers, Índices e Seed Data corporativo. Possui também modo integrado/fallback offline para funcionamento imediato out-of-the-box.
- **Exportação de Dados**: Relatórios em **Excel (.xlsx)** e **CSV** com um clique.

---

## 📱 Estrutura das Telas

### 1. Ponto Móvel (Experiência do Funcionário no Celular)
- Identificação do motorista/colaborador com matrícula e foto.
- Relógio digital ativo em tempo real com segundos e data formatada.
- Badge de status da jornada: `NÃO INICIADO`, `EM JORNADA`, `EM INTERVALO`, `JORNADA FINALIZADA`.
- **Botão Principal de Ação Rápida**: `[ REGISTRAR PONTO ]` com máquina de estados que impede batidas inválidas.
- **Modal de Câmera Frontal**: Guia oval de enquadramento, laser biométrico, desafio de piscada/presença (Liveness) e captura paralela de GPS.
- **Tela de Confirmação**: Card de celebração com nome, tipo de registro, horário exato, local e retorno automático em 3.5 segundos.
- **Histórico Próprio**: Visualização isolada das próprias batidas do colaborador.

### 2. Painel Administrativo (`/admin`)
- **Dashboard Hoje**: Cards de contagem em tempo real (Cadastrados, Presentes, Em jornada, Em intervalo, Ausentes, Total de registros hoje) e tabela ao vivo.
- **Funcionários**: Cadastro, edição, status e **Cadastro de Biometria Facial**.
- **Registros de Ponto**: Filtros por colaborador, período e tipo, com opção de **Retificação com Justificativa Obrigatória** e exportação Excel/CSV.
- **Dispositivos**: Autorização e bloqueio de celulares corporativos.
- **Auditoria & Logs**: Linha do tempo imutável de todas as ações administrativas.

---

## 🚀 Como Executar

### 1. Iniciar em Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` no seu navegador ou celular na mesma rede local.

### 2. Gerar Versão de Produção
```bash
npm run build
```

### 3. Conectar ao Supabase (Opcional)
Copie `.env.example` para `.env` e preencha as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
Execute o script em `src/supabase/schema.sql` no SQL Editor do seu projeto Supabase.

-- =====================================================================
-- RV-Adv Core Schema Migration
-- Tabelas principais do escritório jurídico
-- Generated: 2026-03-04
-- =====================================================================

-- -------------------------------------------------------
-- TABELA: clients
-- Cadastro completo de clientes do escritório
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cpf_cnpj text NOT NULL,
  data_nascimento date,
  rg text,
  data_emissao_rg date,
  orgao_expedidor text,
  estado_civil text CHECK (estado_civil IN ('solteiro','casado','uniao_estavel','divorciado','viuvo')),
  grau_escolaridade text CHECK (grau_escolaridade IN (
    'analfabeto','fundamental_incompleto','fundamental_completo',
    'medio_incompleto','medio_completo','superior_incompleto',
    'superior_completo','pos_graduacao'
  )),
  profissao text,
  password text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  senha_meu_inss text,
  inscrito_cadunico boolean DEFAULT false,
  possui_senha_gov boolean DEFAULT false,
  senha_gov text,
  possui_biometria boolean DEFAULT false,
  pedido_anterior_inss boolean DEFAULT false,
  numero_processo_administrativo text,
  numero_processo_judicial text,
  observacoes_processos_anteriores text,
  birth_date date,                        -- campo legado
  benefit_type text CHECK (benefit_type IN (
    'aposentadoria_idade_rural','incapacidade','pensao_morte','bpc_loas','outros'
  )),
  area text CHECK (area IN ('previdenciario','civel','procuradoria_mulher','outros')),
  observations text,
  documents_checklist jsonb,              -- campo legado
  status text CHECK (status IN ('ativo','inativo','processo_andamento','processo_concluido','prospecto')) DEFAULT 'ativo',
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: processes
-- Processos judiciais e administrativos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_number text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text,
  court text,
  subject text,
  case_value numeric(14,2),
  status text CHECK (status IN ('ativo','arquivado','suspenso','encerrado')) DEFAULT 'ativo',
  distribution_date date,
  area text CHECK (area IN ('previdenciario','civel','procuradoria_mulher','outros')),
  last_move_date date,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER processes_updated_at
  BEFORE UPDATE ON processes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: deadlines
-- Prazos processuais
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES processes(id) ON DELETE CASCADE,
  process_number text,
  client_name text,
  due_date date NOT NULL,
  description text NOT NULL,
  alert_active boolean DEFAULT true,
  responsible_email text,
  responsible_name text,
  priority text CHECK (priority IN ('baixa','media','alta','urgente')) DEFAULT 'media',
  status text CHECK (status IN ('pendente','concluido','cancelado')) DEFAULT 'pendente',
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER deadlines_updated_at
  BEFORE UPDATE ON deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: tasks
-- Tarefas internas (Kanban)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text CHECK (status IN ('todo','in_progress','done')) DEFAULT 'todo',
  kanban_column text CHECK (kanban_column IN ('todo','in_progress','in_review','done')),
  priority text CHECK (priority IN ('baixa','media','alta','urgente')) DEFAULT 'media',
  due_date date,
  assigned_to text,
  assigned_name text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text,
  process_id uuid REFERENCES processes(id) ON DELETE SET NULL,
  process_number text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: financials
-- Controle financeiro do escritório
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  date date NOT NULL,
  type text CHECK (type IN ('receita','despesa')) NOT NULL,
  category text CHECK (category IN (
    'honorarios','custas_processuais','aluguel','salarios','fornecedores','impostos','outros'
  )) NOT NULL,
  status text CHECK (status IN ('pendente','pago','recebido')) DEFAULT 'pendente',
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text,
  process_id uuid REFERENCES processes(id) ON DELETE SET NULL,
  process_number text,
  payment_method text CHECK (payment_method IN ('dinheiro','pix','transferencia','cartao','boleto')),
  due_date date,
  paid_date date,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER financials_updated_at
  BEFORE UPDATE ON financials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: documents
-- Documentos do escritório (clientes e processos)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text,
  document_type text CHECK (document_type IN (
    'peticao','prova','documento_pessoal','laudo','contrato','procuracao','outros'
  )),
  category text CHECK (category IN ('pessoais','inss','medicos','judicial')),
  subcategory text,
  parent_type text CHECK (parent_type IN ('client','process')) NOT NULL,
  parent_id uuid NOT NULL,
  folder_id uuid,
  description text,
  expiration_date date,
  is_main boolean DEFAULT false,
  file_size bigint,
  file_type text,
  tags text[],
  ocr_content text,
  ocr_processed boolean DEFAULT false,
  current_version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: document_folders
-- Pastas para organizar documentos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES document_folders(id) ON DELETE CASCADE,
  parent_type text CHECK (parent_type IN ('client','process','general')) NOT NULL,
  parent_ref_id uuid,
  description text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: document_versions
-- Versionamento de documentos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  file_url text NOT NULL,
  notes text,
  uploaded_by text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: appointments
-- Compromissos e audiências
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text,
  date timestamptz NOT NULL,
  title text NOT NULL,
  notes text,
  status text CHECK (status IN ('agendado','realizado','cancelado')) DEFAULT 'agendado',
  location text,
  alerts_enabled boolean DEFAULT false,
  alert_days integer[],
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: templates
-- Modelos de documentos jurídicos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  category text CHECK (category IN (
    'peticao_inicial','recurso','contestacao','contrato','procuracao','notificacao','outros'
  )) NOT NULL,
  variables text[],
  description text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: process_moves
-- Movimentações processuais (DataJud e manuais)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES processes(id) ON DELETE CASCADE NOT NULL,
  process_number text,
  date date NOT NULL,
  description text NOT NULL,
  source text CHECK (source IN ('datajud','manual','sistema')) DEFAULT 'manual',
  move_type text CHECK (move_type IN (
    'despacho','sentenca','decisao','peticao','intimacao','citacao','audiencia','outros'
  )),
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: beneficios
-- Benefícios previdenciários (tabela principal)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  client_name text,
  categoria text CHECK (categoria IN ('bpc_loas','rural','urbano')) NOT NULL,
  tipo_beneficio text NOT NULL,
  status text CHECK (status IN (
    'em_analise','documentacao_pendente','aguardando_protocolo',
    'protocolado','indeferido','deferido','cancelado'
  )) DEFAULT 'em_analise',
  numero_beneficio text,
  data_protocolo date,
  data_concessao date,
  valor_beneficio numeric(14,2),
  observacoes text,
  dados_especificos jsonb,
  checklist_documentos jsonb,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER beneficios_updated_at
  BEFORE UPDATE ON beneficios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: beneficios_aposentadoria_rural
-- Dados específicos: Aposentadoria por Idade Rural
-- Campos complexos (arrays de objetos) armazenados em JSONB
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficios_aposentadoria_rural (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid REFERENCES beneficios(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  reside_zona text CHECK (reside_zona IN ('urbana','rural')),
  tempo_residencia_local text,
  morou_fora boolean DEFAULT false,
  detalhes_morou_fora text,
  trabalha_exclusivo_agricultura boolean,
  faz_bico text,
  exerceu_atividade_urbana boolean DEFAULT false,
  detalhes_atividade_urbana text,
  membros_grupo_familiar jsonb DEFAULT '[]',
  estado_civil text CHECK (estado_civil IN ('solteiro','casado','uniao_estavel','divorciado','viuvo')),
  nome_conjuge text,
  atividade_conjuge text,
  vinculo_formal_familia boolean DEFAULT false,
  empresa_autonomo boolean DEFAULT false,
  detalhes_vinculo_formal text,
  renda_exclusiva_roca boolean,
  outras_fontes_renda text,
  recebeu_beneficio boolean DEFAULT false,
  beneficios_recebidos text[],
  beneficio_outro_especificar text,
  conjuge_recebeu_beneficio boolean DEFAULT false,
  detalhes_beneficio_conjuge text,
  trabalha_agricultura_desde date,
  propriedade_inicial text,
  proprietario_terra_inicial text,
  propriedades_trabalhadas jsonb DEFAULT '[]',
  tempo_propriedade_atual text,
  dono_terra_atual text,
  transporte_roca text CHECK (transporte_roca IN ('a_pe','bicicleta','moto','carro','transporte_coletivo','outro')),
  tempo_deslocamento text,
  frequencia_ida_roca text CHECK (frequencia_ida_roca IN ('diariamente','5_6_dias','3_4_dias','ocasionalmente')),
  instrumentos_lavoura text[],
  instrumentos_outros text,
  o_que_planta text,
  cria_animais boolean DEFAULT false,
  quais_animais text,
  finalidade_producao text CHECK (finalidade_producao IN ('subsistencia','subsistencia_venda','comercializacao')),
  atividades_rocado text[],
  atividades_rocado_outros text,
  afastou_atividade boolean DEFAULT false,
  atividade_afastamento text,
  periodo_afastamento_inicio date,
  periodo_afastamento_fim date,
  filiado_associacao boolean DEFAULT false,
  nome_associacao text,
  filiado_sindicato boolean DEFAULT false,
  filiado_sindicato_desde date,
  paga_contribuicao_sindical boolean DEFAULT false,
  trabalhando_atualmente boolean DEFAULT true,
  possui_doc_comprova_rural boolean DEFAULT false,
  possui_dap boolean DEFAULT false,
  possui_caf boolean DEFAULT false,
  recebeu_seguro_safra boolean DEFAULT false,
  fez_emprestimo_rural boolean DEFAULT false,
  detalhes_emprestimo text,
  situacao_propriedade text CHECK (situacao_propriedade IN ('proprietario','arrendatario','meeiro','posseiro')),
  dono_terra_se_nao_proprietario text,
  possui_doc_terra boolean DEFAULT false,
  tamanho_propriedade text,
  localizacao_propriedade text,
  o_que_cultivava text,
  havia_empregados boolean DEFAULT false,
  quantidade_empregados integer,
  trabalha_sozinho_familia text CHECK (trabalha_sozinho_familia IN ('sozinho','com_familia')),
  pais_labor_urbano boolean DEFAULT false,
  pais_outras_rendas boolean DEFAULT false,
  detalhes_renda_pais text,
  testemunhas jsonb DEFAULT '[]',
  observacoes_gerais text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER beneficios_aposentadoria_rural_updated_at
  BEFORE UPDATE ON beneficios_aposentadoria_rural
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: beneficios_bpc_idoso
-- Dados específicos: BPC/LOAS para Idoso
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficios_bpc_idoso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid REFERENCES beneficios(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  cadunico_atualizado boolean DEFAULT false,
  num_membros_cadunico integer,
  renda_declarada_cadunico numeric(14,2),
  membros_grupo_familiar jsonb DEFAULT '[]',
  valor_total_renda numeric(14,2),
  origem_renda text,
  auxilios_governamentais text[],
  auxilio_outros text,
  membros_vinculos text,
  despesas_relevantes text[],
  detalhar_despesas text,
  beneficio_outro_membro boolean DEFAULT false,
  especificar_beneficio_outro text,
  origem_residencia text CHECK (origem_residencia IN ('propria','alugada','emprestada','heranca','posse')),
  origem_aquisicao text,
  valor_aluguel numeric(14,2),
  num_comodos integer,
  estado_conservacao text CHECK (estado_conservacao IN ('excelente','bom','regular','precario')),
  caracteristicas_imovel text[],
  infraestrutura_rua text[],
  descricao_imovel text,
  bens_residencia text[],
  bens_valor text,
  possui_veiculos boolean DEFAULT false,
  veiculos jsonb DEFAULT '[]',
  apoio_financeiro_externo boolean DEFAULT false,
  detalhar_apoio text,
  fotos_residencia text[],
  precisa_atualizacao_cadunico boolean DEFAULT false,
  especificar_atualizacao text,
  observacoes_gerais text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER beneficios_bpc_idoso_updated_at
  BEFORE UPDATE ON beneficios_bpc_idoso
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: beneficios_incapacidade_rural
-- Dados específicos: Incapacidade Rural
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficios_incapacidade_rural (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid REFERENCES beneficios(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  cid_patologia text,
  data_inicio_sintomas date,
  decorreu_acidente boolean DEFAULT false,
  detalhes_acidente text,
  historico_sintomas text,
  pesquisa_cid text,
  impacto_vida text,
  impacto_labor text,
  atividades_trabalho text,
  saude_dificulta_atividades boolean DEFAULT false,
  como_dificulta text,
  data_afastamento date,
  faz_tratamento boolean DEFAULT false,
  tipos_tratamento text[],
  tratamento_outro text,
  possui_relatorios_tratamento boolean DEFAULT false,
  toma_medicacoes boolean DEFAULT false,
  quais_medicacoes text,
  medicacoes_efeitos_colaterais boolean DEFAULT false,
  quais_efeitos_colaterais text,
  documentos_medicos jsonb DEFAULT '[]',
  reside_zona text CHECK (reside_zona IN ('urbana','rural')),
  tempo_residencia_local text,
  morou_fora boolean DEFAULT false,
  detalhes_morou_fora text,
  trabalha_exclusivo_agricultura boolean,
  faz_bico text,
  exerceu_atividade_urbana boolean DEFAULT false,
  detalhes_atividade_urbana text,
  membros_grupo_familiar jsonb DEFAULT '[]',
  estado_civil text CHECK (estado_civil IN ('solteiro','casado','uniao_estavel','divorciado','viuvo')),
  nome_conjuge text,
  atividade_conjuge text,
  trabalha_agricultura_desde date,
  propriedade_inicial text,
  proprietario_terra_inicial text,
  propriedades_trabalhadas jsonb DEFAULT '[]',
  filiado_sindicato boolean DEFAULT false,
  filiado_sindicato_desde date,
  possui_dap boolean DEFAULT false,
  possui_caf boolean DEFAULT false,
  testemunhas jsonb DEFAULT '[]',
  observacoes_gerais text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER beneficios_incapacidade_rural_updated_at
  BEFORE UPDATE ON beneficios_incapacidade_rural
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: beneficios_salario_maternidade_rural
-- Dados específicos: Salário-Maternidade Rural
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficios_salario_maternidade_rural (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid REFERENCES beneficios(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  tipo_evento text CHECK (tipo_evento IN ('parto','adocao','guarda_judicial','aborto_nao_criminoso')),
  data_parto_evento date,
  data_prevista_parto date,
  gestante_atualmente boolean DEFAULT false,
  semanas_gestacao integer,
  tipo_parto text CHECK (tipo_parto IN ('normal','cesarea','forceps')),
  numero_filhos_parto integer,
  filhos_adotados jsonb DEFAULT '[]',
  primeiro_filho boolean,
  quantidade_filhos integer,
  recebeu_salario_maternidade boolean DEFAULT false,
  detalhes_salario_anterior text,
  complicacoes_gestacao boolean DEFAULT false,
  detalhes_complicacoes text,
  afastou_trabalho_gestacao boolean DEFAULT false,
  periodo_afastamento_inicio date,
  periodo_afastamento_fim date,
  trabalhando_periodo_carencia boolean,
  detalhes_trabalho_10_meses text,
  afastou_apos_parto boolean DEFAULT false,
  data_afastamento_parto date,
  estado_civil text CHECK (estado_civil IN ('solteira','casada','uniao_estavel','divorciada','viuva')),
  nome_conjuge text,
  cpf_conjuge text,
  conjuge_trabalha_rural boolean DEFAULT false,
  conjuge_vinculo_urbano boolean DEFAULT false,
  detalhes_vinculo_conjuge text,
  observacoes_maternidade text,
  reside_zona text CHECK (reside_zona IN ('urbana','rural')),
  tempo_residencia_local text,
  trabalha_exclusivo_agricultura boolean,
  membros_grupo_familiar jsonb DEFAULT '[]',
  trabalha_agricultura_desde date,
  propriedades_trabalhadas jsonb DEFAULT '[]',
  filiado_sindicato boolean DEFAULT false,
  filiado_sindicato_desde date,
  possui_dap boolean DEFAULT false,
  possui_caf boolean DEFAULT false,
  testemunhas jsonb DEFAULT '[]',
  observacoes_gerais text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER beneficios_salario_maternidade_rural_updated_at
  BEFORE UPDATE ON beneficios_salario_maternidade_rural
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABELA: users (perfil público do usuário)
-- Metadados complementares ao auth.users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text,
  name text,
  role text CHECK (role IN ('admin','user','guest')) DEFAULT 'user',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================================
-- ROW LEVEL SECURITY (RLS) — Políticas para usuários autenticados
-- =====================================================================

-- Macro: habilita RLS + CRUD para authenticated
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'clients','processes','deadlines','tasks','financials',
      'documents','document_folders','document_versions','appointments',
      'templates','process_moves','beneficios',
      'beneficios_aposentadoria_rural','beneficios_bpc_idoso',
      'beneficios_incapacidade_rural','beneficios_salario_maternidade_rural',
      'users'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)',
      tbl || '_select_policy', tbl
    );

    -- INSERT
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl || '_insert_policy', tbl
    );

    -- UPDATE
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      tbl || '_update_policy', tbl
    );

    -- DELETE
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (true)',
      tbl || '_delete_policy', tbl
    );
  END LOOP;
END
$$;


-- =====================================================================
-- ÍNDICES para consultas frequentes
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

CREATE INDEX IF NOT EXISTS idx_processes_client_id ON processes(client_id);
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status);
CREATE INDEX IF NOT EXISTS idx_processes_created_by ON processes(created_by);

CREATE INDEX IF NOT EXISTS idx_deadlines_process_id ON deadlines(process_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_process_id ON tasks(process_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_financials_date ON financials(date);
CREATE INDEX IF NOT EXISTS idx_financials_type ON financials(type);
CREATE INDEX IF NOT EXISTS idx_financials_client_id ON financials(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

CREATE INDEX IF NOT EXISTS idx_process_moves_process_id ON process_moves(process_id);
CREATE INDEX IF NOT EXISTS idx_process_moves_date ON process_moves(date);

CREATE INDEX IF NOT EXISTS idx_beneficios_client_id ON beneficios(client_id);
CREATE INDEX IF NOT EXISTS idx_beneficios_status ON beneficios(status);

CREATE INDEX IF NOT EXISTS idx_benef_apos_rural_beneficio ON beneficios_aposentadoria_rural(beneficio_id);
CREATE INDEX IF NOT EXISTS idx_benef_bpc_idoso_beneficio ON beneficios_bpc_idoso(beneficio_id);
CREATE INDEX IF NOT EXISTS idx_benef_incap_rural_beneficio ON beneficios_incapacidade_rural(beneficio_id);
CREATE INDEX IF NOT EXISTS idx_benef_sal_mat_rural_beneficio ON beneficios_salario_maternidade_rural(beneficio_id);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

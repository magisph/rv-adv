# ============================================
# Antigravity - Token Optimization Configuration
# https://antigravity.codes/blog/antigravity-save-tokens-reduce-quota
# ============================================

# ============================================
# DEPENDENCIAS & GERENCIADORES DE PACOTES
# ============================================
node_modules/
.pnpm-store/
vendor/
.yarn/
.pnp.*

# ============================================
# ARQUIVOS DE LOCK (grandes, sem conteúdo relevante para IA)
# ============================================
package-lock.json
yarn.lock
pnpm-lock.yaml
bun.lockb
*.lock

# ============================================
# BUILD OUTPUTS & OUTPUTS GERADOS
# ============================================
dist/
dist-ssr/
build/
.next/
out/
.nuxt/
.svelte-kit/

# ============================================
# ARQUIVOS MINIFICADOS & MAPS (gerados automaticamente)
# ============================================
*.min.js
*.min.css
*.min.map
*.bundle.js
*.bundle.css

# ============================================
# ASSETS BINÁRIOS (não agregam contexto ao código)
# ============================================
# Imagens
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.webp
*.avif
*.bmp

# Vídeos & Áudio
*.mp4
*.mp3
*.wav
*.ogg
*.webm
*.mov

# Documentos grandes
*.pdf
*.zip
*.tar
*.tar.gz
*.rar
*.7z

# Fontes
*.woff
*.woff2
*.ttf
*.eot
*.otf

# ============================================
# DIRETÓRIOS PÚBLICOS & ASSETS ESTÁTICOS
# ============================================
public/
static/
assets/
static-assets/
upload/
uploads/
media/
images/
imgs/
img/

# ============================================
# ARQUIVOS DE AMBIENTE & SEGURANÇA
# ============================================
.env
.env.*
!.env.example
.env.local
.env.*.local
*.key
*.pem
*.crt
*.p12
*.pfx
credentials.json
secrets.json

# ============================================
# LOGS & ARQUIVOS TEMPORÁRIOS
# ============================================
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
*.tmp
*.temp
*.swp
*.swo
*~

# ============================================
# CONFIGURAÇÕES DE IDE & EDITOR
# ============================================
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
*.sublime-workspace
*.sublime-project

# ============================================
# ARQUIVOS DE SISTEMA OPERACIONAL
# ============================================
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini
Thumbs.db:encryptable

# ============================================
# CONFIGURAÇÕES AIOX/AGENTS (não relevantes para contexto do projeto)
# ============================================
.aiox/
.aiox-core/
.aiox-core/local/
.agent/
.claude/

# ============================================
# SCRAPER LOCAL (armazenamento de crawling)
# ============================================
local-scraper/storage/
local-scraper/djen_seen.json
local-scraper/.env

# ============================================
# SUPABASE TEMP & CONFIGURAÇÕES LOCAIS
# ============================================
supabase/.temp/
supabase/.env
.supabase/

# ============================================
# DOCUMENTAÇÃO (não essencial para contexto de código)
# ============================================
# docs/          # Comentado - descomente se não precisar de docs
# *.md           # Comentado - README.md pode ser útil
# *.mdx

# ============================================
# TESTES (pode manter se precisar de contexto)
# ============================================
# tests/         # Comentado - mantenha se quiser contexto dos testes
# *.test.js
# *.spec.js
# __snapshots__/

# ============================================
# ENTITIES & SCHEMAS (arquivos de definição)
# ============================================
entities/

# ============================================
# SCRIPTS AUXILIARES (não são parte do app principal)
# ============================================
scripts/

# ============================================
# ARQUIVOS DE MEMÓRIA DE IA (temporários)
# ============================================
findings.md
progress.md
task_plan*.md
auditoria_*.md

# ============================================
# CACHE & BUILD ARTIFACTS
# ============================================
.cache/
.parcel-cache/
.eslintcache
*.tsbuildinfo
vite-cache/
.rollup.cache/

# ============================================
# TESTE DE WEBHOOK (arquivo temporário)
# ============================================
test-webhook.js
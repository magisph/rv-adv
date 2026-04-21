# Workflow: Revisão de Segurança

## Gatilho
- PR para master (obrigatório antes do merge)
- Scan diário automático (02:00 BRT)
- Solicitação manual

## Checklist

### OWASP Top 10
- [ ] Injeção SQL: usar SEMPRE parameterized queries (Supabase SDK)
- [ ] Broken Auth: verificar JWT em todas as edge functions protegidas
- [ ] Sensitive Data: sem API keys, senhas ou dados pessoais no frontend
- [ ] XML External Entities: não parsear XML de fontes externas
- [ ] Broken Access Control: verificar RLS para cada role
- [ ] Security Misconfig: CSP, CORS, HSTS, X-Frame-Options
- [ ] XSS: sanitizar templates e user-generated content
- ] Insecure Deserialization: validar Zod em todas as entradas
- [ ] Known Vulns: `npm audit --audit-level=high` (automático)
- [ ] Logging: não logar dados sensíveis

### Testes Automáticos
```bash
pnpm run security          # Vitest security tests
pnpm run security:audit    # npm audit high
pnpm run lint              # ESLint + security plugin
```

### GitHub Actions
- Workflow: `security-scan.yml`
- Executa em: push/PR para main/dev + diário às 02:00
- Falha no build bloqueia merge

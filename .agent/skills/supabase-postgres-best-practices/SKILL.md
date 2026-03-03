---
name: supabase-postgres-best-practices
description: Melhores práticas para PostgreSQL e Supabase. Use sempre que for criar requisições ao banco, alterar lógicas de services ou regras de RLS.
---
# Supabase & Postgres Best Practices
1. **Transações e Rollbacks:** Em inserções multi-tabelas, implemente lógica rigorosa de `try/catch` com Rollback manual se a inserção falhar.
2. **Prevenção de Race Conditions:** Em atualizações complexas, prefira usar `upsert()` com `onConflict`.
3. **Segurança:** Nunca acesse IDs de sessão de usuários (ex: `user.id`) em mutações sem usar Optional Chaining (`user?.id`).

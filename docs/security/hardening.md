# Infra Hardening Guide (Hetzner / VPS)

Este guia acompanha a documentação do projeto detalhando ações que devem ser efetuadas nas máquinas/VPS de deployment.

## 1. Regras de Firewall (UFW)
Apenas as portas essenciais devem ser abertas.
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # Opcionalmente, mude a porta padrão do SSH (ex: 2222)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Fail2Ban
Prevenção de botnets e ataques de brute force (SSH / Supabase ports se expostos).
```bash
sudo apt update && sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Crie o arquivo `/etc/fail2ban/jail.local` focado na restrição SSH:
```ini
[sshd]
enabled = true
port    = 22 # Modifique caso sua porta SSH não seja a padrão!
filter  = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600 # 1 hora
```

## 3. Desabilitar Autenticação por Senha (SSH)
Forçar login por pubkey no `/etc/ssh/sshd_config`:
```bash
PasswordAuthentication no
PermitRootLogin prohibit-password
```

## 4. Backups e Snapshots (Hetzner)
Em ambientes Supabase self-hosted ou Database remoto, deve-se gerar backup PG_DUMP diário e usar Hetzner Snapshots:
- Enable Automatic Backups no painel Hetzner.
- Crie cronjob para backup lógico:
```bash
0 3 * * * pg_dump -U postgres -h localhost my-db | gzip > /backups/db-$(date +\%F).sql.gz
```

> **NOTA:** Estas práticas, aliadas às métricas do Supabase Edge Functions e ao RLS estrito implementado na Fase 1, constituem nossa abordagem de defense-in-depth em todo o ciclo de vida.

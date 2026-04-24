import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

/**
 * useNotificationsSync
 *
 * Hook que mantém as notificações do usuário sincronizadas em tempo real
 * via Supabase Realtime (WebSocket). Resolve dois problemas críticos:
 *
 * 1. Memory Leak: O canal é removido no cleanup do useEffect — sem acúmulo
 *    de WebSockets ao navegar entre páginas.
 *
 * 2. Filtro por user_id: Escuta apenas notificações do usuário autenticado
 *    (Princípio do Menor Privilégio — sem tráfego de outros usuários).
 *
 * 3. Toast em pt-BR: Exibe alerta visual ao receber uma nova notificação.
 *
 * 4. Invalidação TanStack Query v5: Atualiza o cache do sino sem queries N+1.
 *
 * @param {object} user - Objeto do usuário autenticado (de useAuth)
 */
export function useNotificationsSync(user) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Não inicializa sem usuário autenticado
    if (!user?.id) return;

    // Mapeamento de tipo → emoji para o toast
    const iconesPorTipo = {
      warning: '⚠️',
      urgente: '🔴',
      importante: '⚠️',
      prazo: '📅',
      tarefa: '✅',
      compromisso: '🗓️',
      sistema: 'ℹ️',
    };

    // Canal dedicado ao usuário — nome único evita colisão entre usuários
    const canal = supabase
      .channel(`notificacoes-usuario-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notificacao = payload.new;

          // 1. Invalida o cache → sino re-renderiza sem query N+1
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });

          // 2. Exibe toast em pt-BR com ícone correspondente ao tipo
          const icone = iconesPorTipo[notificacao.type] || 'ℹ️';
          const mensagem = notificacao.message || notificacao.title || 'Nova notificação recebida';

          toast(`${icone} ${mensagem}`, {
            description: notificacao.title !== mensagem ? notificacao.title : undefined,
            duration: 6000,
          });
        }
      )
      .subscribe();

    // Cleanup: remove o canal ao desmontar o componente ou ao usuário mudar
    // Isso garante zero acúmulo de WebSockets ao trocar de página
    return () => {
      supabase.removeChannel(canal);
    };
  }, [user?.id, queryClient]);
}

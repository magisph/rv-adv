---
name: legaltech-frontend
description: Especialista em desenvolvimento frontend para aplicações LegalTech brasileiras com React + Tailwind + shadcn/ui. Use ao criar/modificar qualquer componente, página ou UI do RV-Adv.
---
# LegalTech Frontend Development

## Pré-requisitos
- React 18.2 com JSX (não TypeScript para UI)
- Tailwind CSS 3.4 com design system "Legal"
- shadcn/ui New York style (Radix UI + Lucide)
- TanStack Query v5 para server state
- React Hook Form v7 + Zod v3.24

## Padrões de Componentes

### Botão de Ação Jurídica
```jsx
// ✅ Padrão para ações primárias
import { Button } from '@/components/ui/button';
import { Shield, FileText, Scale } from 'lucide-react';

<Button className="bg-legal-blue hover:bg-legal-blue/90">
  <Scale className="w-4 h-4 mr-2" />
  Gerar Petição
</Button>
```

### Formulário com Validação
```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema } from '@/lib/validation/schemas';

function ClienteForm({ onSubmit }) {
  const form = useForm({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nome: '', cpf: '', area: 'previdenciario' }
  });

  const { formState: { errors, isSubmitting } } = form;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Campos com FormField + FormItem + FormLabel + FormControl */}
        {/* ErrorMessage para erros de validação */}
      </form>
    </Form>
  );
}
```

### Lista com Server State
```jsx
import { useQuery } from '@tanstack/react-query';

function ClientesList() {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.list(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading) return <PageLoader />;
  if (error) return <Alert variant="destructive">{error.message}</Alert>;

  return (
    <Table>
      {/* Headers + linhas com dados do cliente */}
    </Table>
  );
}
```

## Regras
1. SEMPRE usar componentes de `@/components/ui/` (Button, Input, Table, Dialog, etc.)
2. SEMPRE usar `useQuery` para leitura, `useMutation` para escrita
3. SEMPRE mostrar loading state (PageLoader ou Skeleton)
4. SEMPRE tratar erros com toast Sonner em português
5. SEMPRE testar dark mode e responsividade
6. Ícones: APENAS Lucide React
7. Paleta: legal-blue (primary), legal-gold (accent), legal-gray (muted)

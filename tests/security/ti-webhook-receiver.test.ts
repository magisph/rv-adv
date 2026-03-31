import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para a Edge Function ti-webhook-receiver
 * 
 * Testa a lógica de extração do número de processo de diferentes formatos de payload
 * que podem ser recebidos da API da Tramitação Inteligente.
 * 
 * IMPORTANTE: A função extractProcessNumber é chamada com o objeto payload (não o corpo completo).
 * O evento contém: { event_type: '...', payload: { ... } }
 * A extração é feita sobre payload, não sobre o corpo inteiro.
 */

describe('ti-webhook-receiver: extractProcessNumber', () => {
  
  /**
   * Simula a função extractProcessNumber para testes
   * (implementação espelhada do código original para validação)
   */
  function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      if (typeof current !== "object") return null;

      if (Array.isArray(current)) {
        const index = parseInt(part, 10);
        if (isNaN(index) || index < 0 || index >= current.length) return null;
        current = current[index];
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  function extractProcessNumber(payload: Record<string, unknown>): string | null {
    const fieldMappings = [
      "numero_processo",
      "process_number",
      "numeroProcesso",
      "processNumber",
      "publication.numero_processo",
      "publication.process_number",
      "publications.0.numero_processo",
      "publications.0.process_number",
      "data.numero_processo",
      "data.process_number",
    ];

    for (const field of fieldMappings) {
      const value = getNestedValue(payload, field);
      if (value && typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  // ========================================================================
  // TESTES: Campos diretos (formato original - payload objeto interno)
  // ========================================================================

  it('deve extrair numero_processo quando presente diretamente no payload', () => {
    // O payload aqui é o objeto interno que contém numero_processo
    const payload = {
      numero_processo: '1234567-89.2024.8.26.0053'
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('1234567-89.2024.8.26.0053');
  });

  it('deve extrair process_number quando presente diretamente no payload', () => {
    const payload = {
      process_number: '9876543-21.2023.8.26.0053'
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('9876543-21.2023.8.26.0053');
  });

  it('deve retornar null quando numero_processo está vazio', () => {
    const payload = {
      numero_processo: ''
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBeNull();
  });

  // ========================================================================
  // TESTES: Campos aninhados (publication)
  // ========================================================================

  it('deve extrair numero_processo de publication.aninhado', () => {
    const payload = {
      publication: {
        numero_processo: '1111111-11.2024.8.26.0053'
      }
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('1111111-11.2024.8.26.0053');
  });

  it('deve extrair process_number de publication.aninhado', () => {
    const payload = {
      publication: {
        process_number: '2222222-22.2024.8.26.0053'
      }
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('2222222-22.2024.8.26.0053');
  });

  // ========================================================================
  // TESTES: Arrays (publications[0])
  // ========================================================================

  it('deve extrair numero_processo do primeiro elemento de publications array', () => {
    const payload = {
      publications: [
        {
          numero_processo: '3333333-33.2024.8.26.0053',
          conteudo: 'Teste de intimação'
        }
      ]
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('3333333-33.2024.8.26.0053');
  });

  // ========================================================================
  // TESTES: Campo data
  // ========================================================================

  it('deve extrair numero_processo de data.aninhado', () => {
    const payload = {
      data: {
        numero_processo: '4444444-44.2024.8.26.0053'
      }
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('4444444-44.2024.8.26.0053');
  });

  // ========================================================================
  // TESTES: Payload vazio ou sem número de processo
  // ========================================================================

  it('deve retornar null quando payload não contém número de processo', () => {
    const payload = {
      conteudo: 'Teste de intimação',
      data_disponibilizacao: '2024-01-15'
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBeNull();
  });

  it('deve retornar null quando payload está vazio', () => {
    const payload = {};

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBeNull();
  });

  // ========================================================================
  // TESTES: Prioridade de campos (primeiro encontrado)
  // ========================================================================

  it('deve priorizar numero_processo sobre process_number quando ambos presentes', () => {
    const payload = {
      numero_processo: '5555555-55.2024.8.26.0053',
      process_number: '6666666-66.2024.8.26.0053'
    };

    const result = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(result).toBe('5555555-55.2024.8.26.0053');
  });

  // ========================================================================
  // TESTES: Normalização (remover máscara)
  // ========================================================================

  it('deve lidar com números de processo com máscara (CNJ formatado)', () => {
    const payload = {
      numero_processo: '1234567-89.2024.8.26.0053'
    };

    const processNumber = extractProcessNumber(payload as unknown as Record<string, unknown>);
    expect(processNumber).toBe('1234567-89.2024.8.26.0053');
    
    // A normalização (remoção de máscara) é feita após extração
    // pelo método normalize() que usa regex: num.replace(/\D/g, "")
    const normalized = processNumber?.replace(/\D/g, "");
    expect(normalized).toBe('12345678920248260053');
  });
});

describe('ti-webhook-receiver: normalize', () => {
  
  function normalize(num: string): string {
    return num.replace(/\D/g, "");
  }

  it('deve remover todos os caracteres não numéricos', () => {
    expect(normalize('1234567-89.2024.8.26.0053')).toBe('12345678920248260053');
    expect(normalize('987.654.321-00')).toBe('98765432100');
    expect(normalize('123.456.789/0001-00')).toBe('123456789000100');
  });

  it('deve retornar string vazia para entrada vazia', () => {
    expect(normalize('')).toBe('');
  });

  it('deve manter apenas dígitos', () => {
    expect(normalize('abc123def456')).toBe('123456');
    expect(normalize('A1B2C3D4E5')).toBe('12345');
  });
});

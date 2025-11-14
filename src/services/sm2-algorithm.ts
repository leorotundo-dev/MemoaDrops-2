/**
 * SM-2 Algorithm Service
 * 
 * Implementação do algoritmo SuperMemo 2 (SM-2) para repetição espaçada.
 * 
 * Referências:
 * - https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 * - https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
 */

export interface SM2Result {
  easinessFactor: number;
  intervalo: number;
  numeroRevisoes: number;
  proximaRevisao: Date;
}

export interface UsuarioDropData {
  easiness_factor: number;
  intervalo_atual_dias: number;
  numero_revisoes: number;
}

/**
 * Calcula o novo Easiness Factor (EF) baseado na qualidade da resposta
 * 
 * Fórmula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * 
 * @param currentEF - Easiness Factor atual
 * @param qualidade - Qualidade da resposta (0-5)
 * @returns Novo Easiness Factor (mínimo 1.3)
 */
export function calcularNovoEF(currentEF: number, qualidade: number): number {
  if (qualidade < 0 || qualidade > 5) {
    throw new Error('Qualidade deve estar entre 0 e 5');
  }

  // Fórmula do SM-2
  const novoEF = currentEF + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));

  // EF nunca pode ser menor que 1.3
  return Math.max(1.3, novoEF);
}

/**
 * Calcula o próximo intervalo de revisão baseado no algoritmo SM-2
 * 
 * Regras:
 * - Se qualidade < 3: Reiniciar sequência (intervalo = 1)
 * - Primeira revisão: 1 dia
 * - Segunda revisão: 6 dias
 * - Demais revisões: intervalo anterior * EF
 * 
 * @param userData - Dados atuais do usuário para este drop
 * @param qualidade - Qualidade da resposta (0-5)
 * @returns Resultado do cálculo SM-2
 */
export function calcularProximaRevisao(
  userData: UsuarioDropData,
  qualidade: number
): SM2Result {
  // Calcular novo EF
  const novoEF = calcularNovoEF(userData.easiness_factor, qualidade);

  let numeroRevisoes = userData.numero_revisoes;
  let intervalo: number;

  // Se a resposta foi ruim (< 3), reiniciar a sequência
  if (qualidade < 3) {
    numeroRevisoes = 0;
    intervalo = 1;
  } else {
    // Incrementar contador de revisões
    numeroRevisoes++;

    // Calcular intervalo baseado no número de revisões
    if (numeroRevisoes === 1) {
      intervalo = 1; // Primeira revisão: 1 dia
    } else if (numeroRevisoes === 2) {
      intervalo = 6; // Segunda revisão: 6 dias
    } else {
      // Terceira revisão em diante: intervalo anterior * EF
      intervalo = Math.round(userData.intervalo_atual_dias * novoEF);
    }
  }

  // Calcular data da próxima revisão
  const proximaRevisao = new Date();
  proximaRevisao.setDate(proximaRevisao.getDate() + intervalo);

  return {
    easinessFactor: novoEF,
    intervalo,
    numeroRevisoes,
    proximaRevisao
  };
}

/**
 * Calcula a qualidade média ponderada
 * 
 * @param qualidadeAtual - Qualidade média atual
 * @param novaQualidade - Nova qualidade registrada
 * @param numeroRevisoes - Número total de revisões
 * @returns Nova qualidade média
 */
export function calcularQualidadeMedia(
  qualidadeAtual: number | null,
  novaQualidade: number,
  numeroRevisoes: number
): number {
  if (!qualidadeAtual || numeroRevisoes === 0) {
    return novaQualidade;
  }

  // Média ponderada: (média_atual * n + nova) / (n + 1)
  return (qualidadeAtual * numeroRevisoes + novaQualidade) / (numeroRevisoes + 1);
}

/**
 * Verifica se o usuário dominou o drop
 * 
 * Critérios:
 * - EF >= 2.5 (facilidade alta)
 * - Número de revisões >= 5
 * - Qualidade média >= 4.0
 * 
 * @param ef - Easiness Factor atual
 * @param numeroRevisoes - Número de revisões realizadas
 * @param qualidadeMedia - Qualidade média das respostas
 * @returns true se o drop foi dominado
 */
export function verificarDominado(
  ef: number,
  numeroRevisoes: number,
  qualidadeMedia: number
): boolean {
  return (
    ef >= 2.5 &&
    numeroRevisoes >= 5 &&
    qualidadeMedia >= 4.0
  );
}

/**
 * Calcula estatísticas de progresso do usuário
 * 
 * @param drops - Array de drops do usuário
 * @returns Estatísticas agregadas
 */
export interface DropStats {
  total: number;
  pendentes: number;
  emRevisao: number;
  dominados: number;
  taxaDominio: number;
  qualidadeMediaGeral: number;
}

export function calcularEstatisticas(drops: any[]): DropStats {
  const total = drops.length;
  const pendentes = drops.filter(d => d.status === 'pendente').length;
  const emRevisao = drops.filter(d => d.status === 'revisado').length;
  const dominados = drops.filter(d => d.status === 'dominado').length;

  const taxaDominio = total > 0 ? (dominados / total) * 100 : 0;

  // Calcular qualidade média geral (apenas drops com qualidade registrada)
  const dropsComQualidade = drops.filter(d => d.qualidade_media !== null);
  const qualidadeMediaGeral = dropsComQualidade.length > 0
    ? dropsComQualidade.reduce((sum, d) => sum + d.qualidade_media, 0) / dropsComQualidade.length
    : 0;

  return {
    total,
    pendentes,
    emRevisao,
    dominados,
    taxaDominio: Math.round(taxaDominio * 10) / 10, // 1 casa decimal
    qualidadeMediaGeral: Math.round(qualidadeMediaGeral * 10) / 10
  };
}

/**
 * Determina quantos drops novos devem ser introduzidos hoje
 * 
 * Baseado na taxa de conclusão e carga atual do usuário
 * 
 * @param dropsParaRevisar - Número de drops agendados para hoje
 * @param taxaConclusao - Taxa de conclusão dos últimos 7 dias (0-1)
 * @returns Número de drops novos a introduzir
 */
export function calcularDropsNovos(
  dropsParaRevisar: number,
  taxaConclusao: number = 1.0
): number {
  const LIMITE_DIARIO_BASE = 10;
  const LIMITE_MINIMO = 3;

  // Se o usuário tem muitos drops para revisar, reduzir novos
  if (dropsParaRevisar >= LIMITE_DIARIO_BASE) {
    return LIMITE_MINIMO;
  }

  // Calcular espaço disponível
  const espacoDisponivel = LIMITE_DIARIO_BASE - dropsParaRevisar;

  // Ajustar baseado na taxa de conclusão
  const novosAjustados = Math.round(espacoDisponivel * taxaConclusao);

  // Garantir pelo menos o mínimo
  return Math.max(LIMITE_MINIMO, novosAjustados);
}

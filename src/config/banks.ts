export interface BancoConfig {
  name: string;
  listUrl: string;
  listLinkPatterns: string[]; // padrões para achar páginas de concurso
  editalInclude?: string[];   // termos que indicam edital
  editalExclude?: string[];   // termos que indicam NÃO ser edital de abertura
}

export const BANKS_CONFIG: Record<string, BancoConfig> = {
  // 1. FGV
  fgv: {
    name: "FGV",
    listUrl: "https://conhecimento.fgv.br/concursos",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },

  // 2. Cebraspe
  cebraspe: {
    name: "CEBRASPE",
    listUrl: "https://www.cebraspe.org.br/concursos/",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },

  // 3. FCC
  fcc: {
    name: "FCC",
    listUrl: "https://www.fcc.org.br/concursos/",
    listLinkPatterns: ["/concursos/"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 4. Vunesp
  vunesp: {
    name: "Vunesp",
    listUrl: "https://www.vunesp.com.br/",
    listLinkPatterns: ["VUNESP_Online", "VSOL"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 5. Quadrix
  quadrix: {
    name: "Quadrix",
    listUrl: "https://site.quadrix.org.br/todos-os-concursos.aspx",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },

  // 6. AOCP
  aocp: {
    name: "AOCP",
    listUrl: "https://www.institutoaocp.org.br/concursos.jsp",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 7. IBFC
  ibfc: {
    name: "IBFC",
    listUrl: "https://concursos.ibfc.org.br/",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 8. IADES
  iades: {
    name: "IADES",
    listUrl: "https://www.iades.com.br/inscricao/ProcessoSeletivo.aspx",
    listLinkPatterns: ["ProcessoSeletivo", "processoseletivo"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog", "classificação"]
  },

  // 9. Fundatec
  fundatec: {
    name: "Fundatec",
    listUrl: "https://fundatec.org.br/portal/concursos/index.php",
    listLinkPatterns: ["detalhe", "concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },

  // 10. IDECAN
  idecan: {
    name: "IDECAN",
    listUrl: "https://idecan.selecao.net.br/informacoes/",
    listLinkPatterns: ["informacoes", "informações"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 11. ACCESS
  access: {
    name: "ACCESS",
    listUrl: "https://concursos.access.org.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "retificação", "retificacao"]
  },

  // 12. Selecon
  selecon: {
    name: "Selecon",
    listUrl: "https://selecon.org.br/concursos/",
    listLinkPatterns: ["concurso", "novo"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 13. COMPERVE (UFRN)
  comperve: {
    name: "COMPERVE",
    listUrl: "https://www.comperve.ufrn.br/conteudo/concursos/concursos.php",
    listLinkPatterns: ["id="],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },

  // 14. Fepese
  fepese: {
    name: "Fepese",
    listUrl: "https://fepese.org.br/concursos/",
    listLinkPatterns: ["concurso", "detalhes"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 15. Consulplan
  consulplan: {
    name: "Consulplan",
    listUrl: "https://www.consulplan.net/concursos.aspx",
    listLinkPatterns: ["detalhes", "concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 16. Cesgranrio
  cesgranrio: {
    name: "Cesgranrio",
    listUrl: "https://www.cesgranrio.org.br/concursos/principal.aspx",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 17. IBAM
  ibam: {
    name: "IBAM",
    listUrl: "https://www.ibam.org.br/concursos-publicos/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "homolog"]
  },

  // 18. FAFIPA / Fundação FAFIPA
  fafipa: {
    name: "FAFIPA",
    listUrl: "https://concursos.fundacaofafipa.org.br/",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 19. RBO
  rbo: {
    name: "RBO",
    listUrl: "https://rboconcursos.selecao.net.br/informacoes/",
    listLinkPatterns: ["informacoes", "informações"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 20. Objetiva
  objetiva: {
    name: "Objetiva",
    listUrl: "https://objetivas.com.br/concursos",
    listLinkPatterns: ["concurso", "detalhes"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito", "retificação", "retificacao"]
  },

  // 21. COSEAC (UFF)
  coseac: {
    name: "COSEAC",
    listUrl: "https://portal.coseac.uff.br/",
    listLinkPatterns: ["publico", "concursos", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 22. COTEC / FADENOR
  cotec: {
    name: "COTEC / FADENOR",
    listUrl: "https://cotec.fadenor.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 23. IBGP
  ibgp: {
    name: "IBGP",
    listUrl: "https://wwwnovo.ibgpconcursos.com.br/",
    listLinkPatterns: ["concurso", "detalhes"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 24. FUNRIO
  funrio: {
    name: "FUNRIO",
    listUrl: "https://www.funrio.org/concursos",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 25. Legalle
  legalle: {
    name: "Legalle",
    listUrl: "https://portal.institutolegalle.org.br/edital/index/abertos",
    listLinkPatterns: ["edital", "detalhes"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 26. IBADE
  ibade: {
    name: "IBADE",
    listUrl: "https://ibade.org.br/concursos/",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 27. Instituto Mais
  institutomais: {
    name: "Instituto Mais",
    listUrl: "https://www.institutomais.org.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 28. Instituto Excelência
  institutoexcelencia: {
    name: "Instituto Excelência",
    listUrl: "https://www.institutoexcelencia.org.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 29. FUNDEP (UFMG)
  fundep: {
    name: "FUNDEP",
    listUrl: "https://www2.fundep.ufmg.br/concursos/",
    listLinkPatterns: ["concurso"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 30. Fundação La Salle
  fundacaolasalle: {
    name: "Fundação La Salle",
    listUrl: "https://fundacaolasalle.org.br/concursos/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 31. RHS Consult
  rhsconsult: {
    name: "RHS Consult",
    listUrl: "https://www.rhsconsult.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 32. INAZ do Pará
  inaz: {
    name: "INAZ do Pará",
    listUrl: "https://www.paconcursos.com.br/inaz/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 33. AgoraHR / Ágora Consultoria
  agorahr: {
    name: "AgoraHR",
    listUrl: "https://www.agorahr.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 34. OAP – Organizadora do Paraná
  oapparana: {
    name: "OAP Paraná",
    listUrl: "https://www.oapconcursos.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 35. OAP – Organizadora do Pará
  oapara: {
    name: "OAP Pará",
    listUrl: "https://www.oappara.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 36. IECPLA
  iecpla: {
    name: "IECPLA",
    listUrl: "https://www.iecpla.org.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 37. IEACES
  ieaces: {
    name: "IEACES",
    listUrl: "https://www.ieaces.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 38. Fundação UNESPAR
  fundacaounespar: {
    name: "Fundação UNESPAR",
    listUrl: "https://www.fundacaounespar.org.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 39. Gualimp
  gualimp: {
    name: "GUALIMP",
    listUrl: "https://www.gualimp.com.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  },

  // 40. FIDEPs
  fideps: {
    name: "FIDEPs",
    listUrl: "https://www.fideps.org.br/",
    listLinkPatterns: ["concurso", "edital"],
    editalInclude: ["edital"],
    editalExclude: ["resultado", "gabarito"]
  }
};

/**
 * Retorna a configuração de uma banca pelo slug
 */
export function getBankConfig(slug: string): BancoConfig | undefined {
  return BANKS_CONFIG[slug.toLowerCase()];
}

/**
 * Retorna lista de todas as bancas disponíveis
 */
export function getAllBanks(): Array<{ slug: string; name: string }> {
  return Object.entries(BANKS_CONFIG).map(([slug, config]) => ({
    slug,
    name: config.name
  }));
}

/**
 * Verifica se um slug de banca é válido
 */
export function isValidBankSlug(slug: string): boolean {
  return slug.toLowerCase() in BANKS_CONFIG;
}

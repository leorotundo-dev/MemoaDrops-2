// ARQUIVO TEMPORÁRIO PARA SUBSTITUIR O ENDPOINT DE CONCURSOS
// Este código deve substituir o endpoint /admin/contests no arquivo admin.ts

app.get('/admin/contests', async (req, reply) => {
  const { page = '1', limit = '20' } = req.query as any;
  const currentPage = Math.max(1, parseInt(page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (currentPage - 1) * pageSize;
  
  // Contar total
  const { rows: [{ total }] } = await pool.query('SELECT COUNT(*) as total FROM concursos');
  const totalPages = Math.ceil(parseInt(total) / pageSize);
  
  // Buscar dados
  const { rows: contests } = await pool.query(`
    SELECT 
      c.id, 
      c.name, 
      c.slug, 
      COALESCE(b.display_name, b.name) as banca,
      c.ano, 
      c.nivel, 
      c.data_prova, 
      c.salario, 
      c.numero_vagas, 
      c.orgao, 
      c.cidade, 
      c.estado, 
      c.edital_url,
      c.contest_url, 
      c.created_at,
      (SELECT COUNT(*) FROM materias m WHERE m.contest_id = c.id) as total_subjects
    FROM concursos c
    LEFT JOIN bancas b ON c.banca_id = b.id
    ORDER BY c.created_at DESC
    LIMIT $1 OFFSET $2
  `, [pageSize, offset]);

  return { 
    data: contests,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total: parseInt(total),
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  };
});

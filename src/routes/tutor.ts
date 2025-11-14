import type { FastifyInstance } from "fastify";
import { pool } from "../db/connection.js";
import { nextTutorTurn } from "../services/tutor.js";

export async function registerTutorRoutes(app: FastifyInstance) {
  const auth = (app as any).authenticate || ((req:any,res:any,done:any)=>done());

  app.post("/tutor/sessions", { preHandler: [auth] }, async (req:any, reply) => {
    const { exam_id, subject_id, goal, mode='socratic', difficulty='auto' } = req.body || {};
    const { rows:[s] } = await pool.query(
      `INSERT INTO tutor_sessions (user_id, exam_id, subject_id, goal, mode, difficulty)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.user?.id || null, exam_id||null, subject_id||null, goal||null, mode, difficulty]
    );
    reply.send({ session_id: s.id });
  });

  app.post("/tutor/sessions/:id/turns", { preHandler: [auth] }, async (req:any, reply) => {
    const { id } = req.params;
    const { message, imageBase64, hint_level=0 } = req.body || {};
    const { rows:[session] } = await pool.query(`SELECT * FROM tutor_sessions WHERE id=$1`, [id]);
    if (!session) return reply.status(404).send({ error: "Session not found" });

    const { rows: histRows } = await pool.query(
      `SELECT role, content FROM tutor_turns WHERE session_id=$1 ORDER BY created_at ASC LIMIT 50`, [id]
    );
    const history = histRows.map((r:any) => ({ role: r.role, content: String(r.content?.text || r.content) }));

    const { out, snippets, usage } = await nextTutorTurn({
      session: { id, subject_id: session.subject_id, exam_id: session.exam_id, mode: session.mode },
      history,
      studentMessage: message || "",
      hintLevel: hint_level || 0,
      allowVision: true,
      imageBase64
    });

    const { rows:[turn] } = await pool.query(
      `INSERT INTO tutor_turns (session_id, role, content, model, tokens_in, tokens_out, cost_usd)
       VALUES ($1,'assistant',$2,$3,$4,$5,$6) RETURNING id`,
      [id, { text: out.message, hint_level: out.hint_level, next_step: out.next_step }, process.env.TUTOR_MODEL || 'gpt-4o-mini', usage.prompt_tokens, usage.completion_tokens, 0]
    );

    // salvar refs
    for (const [i,ref] of (snippets||[]).entries()) {
      await pool.query(
        `INSERT INTO tutor_refs (turn_id, source_type, source_id, title, snippet, score)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [turn.id, ref.source_type, ref.source_id, ref.title||null, ref.snippet, ref.score||null]
      );
    }

    reply.send({ turn_id: turn.id, assistant_turn: out, refs: (snippets||[]).map((s:any,idx:number)=> ({
      tag: `#${idx+1}`, title: s.title||s.source_type, snippet: s.snippet
    })) });
  });

  app.get("/tutor/sessions/:id/turns", { preHandler: [auth] }, async (req:any, reply) => {
    const { id } = req.params;
    const { after, limit=50 } = req.query || {};
    const args:any[] = [id];
    let where = `WHERE session_id=$1`;
    if (after) { where += ` AND created_at > (SELECT created_at FROM tutor_turns WHERE id=$2)`; args.push(after); }
    const { rows } = await pool.query(
      `SELECT id, role, content, created_at FROM tutor_turns ${where} ORDER BY created_at ASC LIMIT ${Number(limit)}`, args
    );
    reply.send(rows);
  });

  app.post("/tutor/sessions/:id/grade", { preHandler: [auth] }, async (req:any, reply) => {
    const { id } = req.params;
    const { answer_text } = req.body || {};
    // Simplificação: devolve estrutura previsível (placeholder de rubrica)
    reply.send({
      score: 75,
      breakdown: [
        { criterio: "Conceito-chave", nota: 80, obs: "Acertou a definição" },
        { criterio: "Exceções", nota: 60, obs: "Faltou citar exceção X" }
      ],
      feedback: "Boa base! Reforce as exceções e revise 2 cartões relacionados."
    });
  });

  app.get("/tutor/sessions/:id/recommendations", { preHandler: [auth] }, async (_req:any, reply) => {
    reply.send({
      next_cards: [],
      reading: [],
      drills: []
    });
  });
}

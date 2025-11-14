import OpenAI from "openai";
import { z } from "zod";
import { ASSISTANT_JSON_SCHEMA, TUTOR_SYSTEM_PROMPT } from "./guardrails.js";
import { retrieveSnippets, RetrievedSnippet } from "./retriever.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TutorOut = z.object({
  message: z.string(),
  next_step: z.enum(["ask_check","give_hint","explain","reveal_answer"]),
  hint_level: z.number().min(0).max(3)
});

type HistoryMsg = { role: "user"|"assistant"; content: string };

function toContext(snips: RetrievedSnippet[]) {
  if (!snips || snips.length === 0) return "SEM CONTEXTO CONFIÁVEL";
  return snips.map((s, i) => `[#${i+1} - ${s.title||s.source_type}] ${s.snippet}`).join("\n");
}

export async function nextTutorTurn(params: {
  session: { id: string; subject_id?: string|null; exam_id?: string|null; mode: string; };
  history: HistoryMsg[];
  studentMessage: string;
  hintLevel: number;             // 0..3
  allowVision?: boolean;
  imageBase64?: string;          // opcional
}) {
  const model = process.env.TUTOR_MODEL || "gpt-4o-mini";
  const visionModel = process.env.TUTOR_VISION_MODEL || "gpt-4o";

  // 1) RAG curto
  const snippets = await retrieveSnippets({
    subject_id: params.session.subject_id || undefined,
    exam_id: params.session.exam_id || undefined,
    query: params.studentMessage,
    k: 3,
    maxChars: 900
  });

  // 2) Montar prompt
  const ctx = toContext(snippets);
  const sys = `${TUTOR_SYSTEM_PROMPT}\n\nCONTEXT:\n${ctx}`;

  // 3) Construir mensagens (histórico curto)
  const hist = params.history.slice(-4).map(m => ({
    role: m.role,
    content: m.content
  }));

  const userContent = params.imageBase64 && params.allowVision
    ? [
        { type: "text", text: `HINT_LEVEL=${params.hintLevel}\nPergunta do aluno: ${params.studentMessage}` },
        { type: "image_url", image_url: { url: `data:image/png;base64,${params.imageBase64}` } }
      ]
    : [{ type: "text", text: `HINT_LEVEL=${params.hintLevel}\nPergunta do aluno: ${params.studentMessage}` }];

  // 4) Chamada LLM
  const useVision = Boolean(params.imageBase64 && params.allowVision);
  const chosenModel = useVision ? visionModel : model;

  const response = await client.chat.completions.create({
    model: chosenModel,
    temperature: 0.2,
    response_format: { type: "json_schema", json_schema: { name: "assistant_schema", schema: ASSISTANT_JSON_SCHEMA as any } },
    messages: [
      { role: "system", content: sys },
      ...hist.map(h => ({ role: h.role, content: h.content } as any)),
      { role: "user", content: userContent as any }
    ]
  });

  const raw = response.choices?.[0]?.message?.content || "{}";
  const parsed = TutorOut.safeParse(JSON.parse(raw));
  const usage = response.usage;

  // 5) Saída segura
  const safe = parsed.success ? parsed.data : {
    message: "Não tenho confiança suficiente nas fontes para uma pista segura agora. Vamos abrir uma leitura curta do tema?",
    next_step: "ask_check",
    hint_level: Math.min(3, params.hintLevel || 0)
  };

  return {
    out: safe,
    snippets,
    usage: {
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0
    }
  };
}

import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'q obrigatório').max(200)
});

export const SyncBodySchema = z.object({
  douUrl: z.string().url('douUrl precisa ser URL absoluta').max(1024)
});

export const ContestIdParamsSchema = z.object({
  contestId: z.string().regex(/^\d+$/).transform(Number)
});

export const JobIdParamsSchema = z.object({
  id: z.string().min(1)
});

export type TSearchQuery = z.infer<typeof SearchQuerySchema>;
export type TSyncBody = z.infer<typeof SyncBodySchema>;
export type TContestIdParams = z.infer<typeof ContestIdParamsSchema>;
export type TJobIdParams = z.infer<typeof JobIdParamsSchema>;

export async function addGenerateFlashcardsJob(data: any) {
  return { id: 'job-test-123', data };
}
export const llmQueue = {
  getJob: async (id: string) => ({ id, getState: async ()=>'completed', getProgress: async ()=>100, get: async ()=>({ result: { cardsCreated: 10, deckId: 'deck-123' } }) })
};

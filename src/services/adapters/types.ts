export type Adapter = { name: string; fetchAndParse: (url: string) => Promise<{ materias: { nome: string; conteudos: string[] }[] }>; };

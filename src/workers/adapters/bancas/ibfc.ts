import { safeRunBancaBySlug } from './_base.js';
const ID = 'ibfc';
const BASE = process.env['B_IBFC_BASE'] || 'https://concursos.ibfc.org.br/';
const PATTERN = new RegExp('ibfc\.org\.br|concursos\.ibfc\.org\.br', 'i');
const MODE = (process.env['B_IBFC_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBancaBySlug(ID, BASE, PATTERN, MODE); }

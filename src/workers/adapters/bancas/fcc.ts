import { safeRunBanca } from './_base.js';
const ID = 'fcc';
const BASE = process.env['B_FCC_BASE'] || 'https://www.fcc.org.br/concursos/';
const PATTERN = new RegExp('fcc\.org\.br|concursosfcc\.com\.br', 'i');
const MODE = (process.env['B_FCC_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

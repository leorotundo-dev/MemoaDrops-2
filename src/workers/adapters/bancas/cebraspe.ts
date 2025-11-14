import { safeRunBanca } from './_base.js';
const ID = 'cebraspe';
const BASE = process.env['B_CEBRASPE_BASE'] || 'https://www.cebraspe.org.br/concursos/';
const PATTERN = new RegExp('cebraspe\.org\.br', 'i');
const MODE = (process.env['B_CEBRASPE_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

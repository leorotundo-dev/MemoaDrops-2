import { safeRunBanca } from './_base.js';
const ID = 'fgv';
const BASE = process.env['B_FGV_BASE'] || 'https://conhecimento.fgv.br/concursos';
const PATTERN = new RegExp('fgv\.br|conhecimento\.fgv\.br', 'i');
const MODE = (process.env['B_FGV_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

import { safeRunBanca } from './_base.js';
const ID = 'quadrix';
const BASE = process.env['B_QUADRIX_BASE'] || 'https://site.quadrix.org.br/todos-os-concursos.aspx';
const PATTERN = new RegExp('quadrix\.org\.br|site\.quadrix\.org\.br', 'i');
const MODE = (process.env['B_QUADRIX_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

import { safeRunBanca } from './_base.js';
const ID = 'idecan';
const BASE = process.env['B_IDECAN_BASE'] || 'https://idecan.org.br/';
const PATTERN = new RegExp('idecan\.org\.br|selecao\.net\.br', 'i');
const MODE = (process.env['B_IDECAN_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

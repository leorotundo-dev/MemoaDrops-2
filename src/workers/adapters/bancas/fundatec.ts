import { safeRunBanca } from './_base.js';
const ID = 'fundatec';
const BASE = process.env['B_FUNDATEC_BASE'] || 'https://fundatec.org.br/portal/concursos/';
const PATTERN = new RegExp('fundatec\.org\.br', 'i');
const MODE = (process.env['B_FUNDATEC_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

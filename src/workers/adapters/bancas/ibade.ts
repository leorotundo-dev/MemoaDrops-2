import { safeRunBancaBySlug } from './_base.js';
const ID = 'ibade';
const BASE = process.env['B_IBADE_BASE'] || 'https://ibade.org.br/concursos/';
const PATTERN = new RegExp('ibade\.org\.br|ibade\.selecao\.site', 'i');
const MODE = (process.env['B_IBADE_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBancaBySlug(ID, BASE, PATTERN, MODE); }

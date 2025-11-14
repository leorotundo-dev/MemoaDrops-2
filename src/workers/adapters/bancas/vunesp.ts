import { safeRunBancaBySlug } from './_base.js';
const ID = 'vunesp';
const BASE = process.env['B_VUNESP_BASE'] || 'https://www.vunesp.com.br/';
const PATTERN = new RegExp('vunesp\.com\.br', 'i');
const MODE = (process.env['B_VUNESP_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBancaBySlug(ID, BASE, PATTERN, MODE); }

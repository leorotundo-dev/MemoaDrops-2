import { safeRunBanca } from './_base.js';
const ID = 'aocp';
const BASE = process.env['B_AOCP_BASE'] || 'https://www.institutoaocp.org.br/';
const PATTERN = new RegExp('aocp\.com\.br|institutoaocp\.org\.br', 'i');
const MODE = (process.env['B_AOCP_MODE'] as 'static'|'headless') || 'static';
export async function run(){ return safeRunBanca(ID, BASE, PATTERN, MODE); }

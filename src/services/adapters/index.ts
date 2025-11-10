
import { Adapter } from './types.js';
import { makeGenericAdapter } from './fallback/generic.js';

import { makeDouAdapter } from './federal/dou.js';
import { makeGovbrPortalAdapter } from './federal/govbr-portal.js';

import { makeCebraspeAdapter } from './bancas/cebraspe.js';
import { makeFgvAdapter } from './bancas/fgv.js';
import { makeVunespAdapter } from './bancas/vunesp.js';

import { makeDoeSpAdapter } from './estaduais/doe-sp.js';
import { makeDoeMtAdapter } from './estaduais/doe-mt.js';

import { makeTrfAdapter } from './justica/trf.js';
import { makeTrtAdapter } from './justica/trt.js';

import { makeFccAdapter } from './bancas/fcc.js';
import { makeIbfcAdapter } from './bancas/ibfc.js';
import { makeAocpAdapter } from './bancas/aocp.js';
import { makeIdecanAdapter } from './bancas/idecan.js';
import { makeQuadrixAdapter } from './bancas/quadrix.js';
import { makeFunrioAdapter } from './bancas/funrio.js';
import { makeFundatecAdapter } from './bancas/fundatec.js';
import { makeConsulplanAdapter } from './bancas/consulplan.js';
import { makeIbadeAdapter } from './bancas/ibade.js';

import { makeSeiAdapter } from './federal/sei.js';
import { makeCompras_PortalAdapter } from './federal/compras-portal.js';
import { makeLexmlAdapter } from './federal/lexml.js';

import { makeDom_FecamAdapter } from './municipais/dom-fecam.js';
import { makeDom_Am_MunicipiosAdapter } from './municipais/dom-am-municipios.js';
import { makeIomAdapter } from './municipais/iom.js';
import { makeDom_CidadesAdapter } from './municipais/dom-cidades.js';

import { makeDoe_AcAdapter } from './estaduais/doe-ac.js';
import { makeDoe_AlAdapter } from './estaduais/doe-al.js';
import { makeDoe_AmAdapter } from './estaduais/doe-am.js';
import { makeDoe_ApAdapter } from './estaduais/doe-ap.js';
import { makeDoe_BaAdapter } from './estaduais/doe-ba.js';
import { makeDoe_CeAdapter } from './estaduais/doe-ce.js';
import { makeDoe_DfAdapter } from './estaduais/doe-df.js';
import { makeDoe_EsAdapter } from './estaduais/doe-es.js';
import { makeDoe_GoAdapter } from './estaduais/doe-go.js';
import { makeDoe_MaAdapter } from './estaduais/doe-ma.js';
import { makeDoe_MgAdapter } from './estaduais/doe-mg.js';
import { makeDoe_MsAdapter } from './estaduais/doe-ms.js';
import { makeDoe_PaAdapter } from './estaduais/doe-pa.js';
import { makeDoe_PbAdapter } from './estaduais/doe-pb.js';
import { makeDoe_PeAdapter } from './estaduais/doe-pe.js';
import { makeDoe_PiAdapter } from './estaduais/doe-pi.js';
import { makeDoe_PrAdapter } from './estaduais/doe-pr.js';
import { makeDoe_RjAdapter } from './estaduais/doe-rj.js';
import { makeDoe_RnAdapter } from './estaduais/doe-rn.js';
import { makeDoe_RoAdapter } from './estaduais/doe-ro.js';
import { makeDoe_RrAdapter } from './estaduais/doe-rr.js';
import { makeDoe_RsAdapter } from './estaduais/doe-rs.js';
import { makeDoe_ScAdapter } from './estaduais/doe-sc.js';
import { makeDoe_SeAdapter } from './estaduais/doe-se.js';
import { makeDoe_ToAdapter } from './estaduais/doe-to.js';

export function pickAdapter(url: string): Adapter {
  const { hostname } = new URL(url);

  if (hostname.endsWith('in.gov.br')) return makeDouAdapter();
  if (hostname.endsWith('gov.br')) return makeGovbrPortalAdapter();

  if (hostname.endsWith('cebraspe.org.br')) return makeCebraspeAdapter();
  if (hostname.endsWith('fgv.br')) return makeFgvAdapter();
  if (hostname.endsWith('vunesp.com.br')) return makeVunespAdapter();

  if (hostname.includes('doe.sp.gov.br') || hostname.includes('imprensaoficial.sp.gov.br')) return makeDoeSpAdapter();
  if (hostname.includes('iomat.mt.gov.br')) return makeDoeMtAdapter();

  if (/^.*trf\d+\.jus\.br$/.test(hostname)) return makeTrfAdapter();
  if (/^.*trt\d+\.jus\.br$/.test(hostname)) return makeTrtAdapter();

  if (hostname.includes('consulplan')) return makeConsulplanAdapter();
  if (hostname.includes('fundatec')) return makeFundatecAdapter();
  if (hostname.includes('funrio')) return makeFunrioAdapter();
  if (hostname.includes('quadrix')) return makeQuadrixAdapter();
  if (hostname.includes('idecan')) return makeIdecanAdapter();
  if (hostname.includes('ibade')) return makeIbadeAdapter();
  if (hostname.includes('ibfc')) return makeIbfcAdapter();
  if (hostname.includes('fcc')) return makeFccAdapter();
  if (hostname.includes('aocp')) return makeAocpAdapter();

  if (hostname.includes('sei')) return makeSeiAdapter();
  if (hostname.includes('compras')) return makeCompras_PortalAdapter();
  if (hostname.includes('lexml')) return makeLexmlAdapter();

  if (hostname.includes('diariomunicipal') || hostname.includes('imprensaoficial')) return makeDom_CidadesAdapter();

  const ufMap: Record<string, () => Adapter> = {
    'doe.ac.gov.br': makeDoe_AcAdapter,
    'doe.al.gov.br': makeDoe_AlAdapter,
    'doe.am.gov.br': makeDoe_AmAdapter,
    'doe.ap.gov.br': makeDoe_ApAdapter,
    'doe.ba.gov.br': makeDoe_BaAdapter,
    'doe.ce.gov.br': makeDoe_CeAdapter,
    'diariooficial.df.gov.br': makeDoe_DfAdapter,
    'ioes.gov.br': makeDoe_EsAdapter,
    'imprensaoficial.go.gov.br': makeDoe_GoAdapter,
    'diariooficial.ma.gov.br': makeDoe_MaAdapter,
    'diariooficial.mg.gov.br': makeDoe_MgAdapter,
    'doems.ms.gov.br': makeDoe_MsAdapter,
    'ioepa.pa.gov.br': makeDoe_PaAdapter,
    'diariooficial.pb.gov.br': makeDoe_PbAdapter,
    'diariooficial.pe.gov.br': makeDoe_PeAdapter,
    'diariooficial.pi.gov.br': makeDoe_PiAdapter,
    'imprensaoficial.pr.gov.br': makeDoe_PrAdapter,
    'imprensaoficial.rj.gov.br': makeDoe_RjAdapter,
    'diariooficial.rn.gov.br': makeDoe_RnAdapter,
    'diariooficial.ro.gov.br': makeDoe_RoAdapter,
    'diariooficial.rr.gov.br': makeDoe_RrAdapter,
    'diariooficial.rs.gov.br': makeDoe_RsAdapter,
    'doe.sc.gov.br': makeDoe_ScAdapter,
    'diariooficial.se.gov.br': makeDoe_SeAdapter,
    'diariooficial.to.gov.br': makeDoe_ToAdapter
  };

  for (const key in ufMap) {
    if (hostname.endsWith(key)) return ufMap[key]();
  }

  return makeGenericAdapter();
}

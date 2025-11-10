
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
import { makeComprasPortalAdapter } from './federal/compras-portal.js';
import { makeLexmlAdapter } from './federal/lexml.js';

import { makeDomFecamAdapter } from './municipais/dom-fecam.js';
import { makeDomAmMunicipiosAdapter } from './municipais/dom-am-municipios.js';
import { makeIomAdapter } from './municipais/iom.js';
import { makeDomCidadesAdapter } from './municipais/dom-cidades.js';

import { makeDoeAcAdapter } from './estaduais/doe-ac.js';
import { makeDoeAlAdapter } from './estaduais/doe-al.js';
import { makeDoeAmAdapter } from './estaduais/doe-am.js';
import { makeDoeApAdapter } from './estaduais/doe-ap.js';
import { makeDoeBaAdapter } from './estaduais/doe-ba.js';
import { makeDoeCeAdapter } from './estaduais/doe-ce.js';
import { makeDoeDfAdapter } from './estaduais/doe-df.js';
import { makeDoeEsAdapter } from './estaduais/doe-es.js';
import { makeDoeGoAdapter } from './estaduais/doe-go.js';
import { makeDoeMaAdapter } from './estaduais/doe-ma.js';
import { makeDoeMgAdapter } from './estaduais/doe-mg.js';
import { makeDoeMsAdapter } from './estaduais/doe-ms.js';
import { makeDoePaAdapter } from './estaduais/doe-pa.js';
import { makeDoePbAdapter } from './estaduais/doe-pb.js';
import { makeDoePeAdapter } from './estaduais/doe-pe.js';
import { makeDoePiAdapter } from './estaduais/doe-pi.js';
import { makeDoePrAdapter } from './estaduais/doe-pr.js';
import { makeDoeRjAdapter } from './estaduais/doe-rj.js';
import { makeDoeRnAdapter } from './estaduais/doe-rn.js';
import { makeDoeRoAdapter } from './estaduais/doe-ro.js';
import { makeDoeRrAdapter } from './estaduais/doe-rr.js';
import { makeDoeRsAdapter } from './estaduais/doe-rs.js';
import { makeDoeScAdapter } from './estaduais/doe-sc.js';
import { makeDoeSeAdapter } from './estaduais/doe-se.js';
import { makeDoeToAdapter } from './estaduais/doe-to.js';

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
  if (hostname.includes('compras')) return makeComprasPortalAdapter();
  if (hostname.includes('lexml')) return makeLexmlAdapter();

  if (hostname.includes('diariomunicipal') || hostname.includes('imprensaoficial')) return makeDomCidadesAdapter();

  const ufMap: Record<string, () => Adapter> = {
    'doe.ac.gov.br': makeDoeAcAdapter,
    'doe.al.gov.br': makeDoeAlAdapter,
    'doe.am.gov.br': makeDoeAmAdapter,
    'doe.ap.gov.br': makeDoeApAdapter,
    'doe.ba.gov.br': makeDoeBaAdapter,
    'doe.ce.gov.br': makeDoeCeAdapter,
    'diariooficial.df.gov.br': makeDoeDfAdapter,
    'ioes.gov.br': makeDoeEsAdapter,
    'imprensaoficial.go.gov.br': makeDoeGoAdapter,
    'diariooficial.ma.gov.br': makeDoeMaAdapter,
    'diariooficial.mg.gov.br': makeDoeMgAdapter,
    'doems.ms.gov.br': makeDoeMsAdapter,
    'ioepa.pa.gov.br': makeDoePaAdapter,
    'diariooficial.pb.gov.br': makeDoePbAdapter,
    'diariooficial.pe.gov.br': makeDoePeAdapter,
    'diariooficial.pi.gov.br': makeDoePiAdapter,
    'imprensaoficial.pr.gov.br': makeDoePrAdapter,
    'imprensaoficial.rj.gov.br': makeDoeRjAdapter,
    'diariooficial.rn.gov.br': makeDoeRnAdapter,
    'diariooficial.ro.gov.br': makeDoeRoAdapter,
    'diariooficial.rr.gov.br': makeDoeRrAdapter,
    'diariooficial.rs.gov.br': makeDoeRsAdapter,
    'doe.sc.gov.br': makeDoeScAdapter,
    'diariooficial.se.gov.br': makeDoeSeAdapter,
    'diariooficial.to.gov.br': makeDoeToAdapter
  };

  for (const key in ufMap) {
    if (hostname.endsWith(key)) return ufMap[key]();
  }

  return makeGenericAdapter();
}

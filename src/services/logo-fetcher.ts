import axios from 'axios';
import { pool } from '../db/connection.js';

// Mapeamento de URLs conhecidas para logos de bancas brasileiras
const knownLogos: Record<string, string> = {
  'fgv': 'https://portal.fgv.br/sites/portal.fgv.br/files/logo-fgv-portal.png',
  'cesgranrio': 'https://www.cesgranrio.org.br/img/institucional/logo-cesgranrio.png',
  'cespe': 'https://www.cespe.unb.br/img/logo-cespe.png',
  'cebraspe': 'https://www.cespe.unb.br/img/logo-cespe.png',
  'vunesp': 'https://www.vunesp.com.br/img/logo-vunesp.png',
  'fcc': 'https://www.fcc.org.br/img/logo-fcc.png',
  'ibfc': 'https://www.ibfc.org.br/img/logo-ibfc.png',
  'aocp': 'https://www.aocp.com.br/img/logo-aocp.png',
  'quadrix': 'https://www.quadrix.org.br/img/logo-quadrix.png',
  'idecan': 'https://www.idecan.org.br/img/logo-idecan.png',
  'consulplan': 'https://www.consulplan.net/img/logo-consulplan.png',
  'ibam': 'https://www.ibam.org.br/img/logo-ibam.png',
  'fundatec': 'https://www.fundatec.org.br/img/logo-fundatec.png',
  'iades': 'https://www.iades.com.br/img/logo-iades.png',
  'fadesp': 'https://www.fadesp.org.br/img/logo-fadesp.png',
  'cetro': 'https://www.cetroconcursos.org.br/img/logo-cetro.png',
  'fumarc': 'https://www.fumarc.org.br/img/logo-fumarc.png',
  'funcab': 'https://www.funcab.org/img/logo-funcab.png',
};

// Tentativas de URLs comuns para logos
const commonLogoPaths = [
  '/logo.png',
  '/logo.svg',
  '/img/logo.png',
  '/img/logo.svg',
  '/images/logo.png',
  '/images/logo.svg',
  '/assets/logo.png',
  '/assets/images/logo.png',
  '/static/logo.png',
  '/static/images/logo.png',
  '/img/institucional/logo.png',
  '/img/logo-principal.png',
  '/wp-content/uploads/logo.png',
  '/wp-content/themes/*/logo.png',
  '/media/logo.png',
];

/**
 * Sanitiza o nome da banca para busca
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Busca a URL do logo de uma banca
 */
async function findLogoUrl(bancaName: string, websiteUrl?: string): Promise<string | null> {
  const normalizedName = sanitizeName(bancaName);
  
  // 1. Verificar se temos uma URL conhecida
  for (const [key, url] of Object.entries(knownLogos)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      console.log(`[Logo Fetcher] URL conhecida encontrada para ${bancaName}: ${url}`);
      return url;
    }
  }
  
  // 2. Se temos website, tentar URLs comuns
  if (websiteUrl) {
    try {
      const baseUrl = new URL(websiteUrl);
      
      for (const path of commonLogoPaths) {
        const logoUrl = `${baseUrl.origin}${path}`;
        try {
          const response = await axios.head(logoUrl, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.status === 200 && response.headers['content-type']?.startsWith('image/')) {
            console.log(`[Logo Fetcher] Logo encontrado no site oficial: ${logoUrl}`);
            return logoUrl;
          }
        } catch (error) {
          // Continuar tentando outras URLs
        }
      }
    } catch (error) {
      console.error(`[Logo Fetcher] Erro ao processar website URL: ${error}`);
    }
  }
  
  console.log(`[Logo Fetcher] Nenhum logo encontrado para ${bancaName}, usando fallback`);
  return null;
}

/**
 * Gera URL de fallback usando UI Avatars
 */
function generateFallbackLogoUrl(bancaName: string): string {
  const initials = bancaName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=0D47A1&color=fff&bold=true`;
}

/**
 * Baixa uma imagem e retorna os dados binários e o MIME type
 */
async function downloadImage(url: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    console.log(`[Logo Fetcher] Baixando imagem de: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const mimeType = response.headers['content-type'] || 'image/png';
    const data = Buffer.from(response.data);
    
    console.log(`[Logo Fetcher] Imagem baixada com sucesso: ${data.length} bytes, tipo: ${mimeType}`);
    
    return { data, mimeType };
  } catch (error) {
    console.error(`[Logo Fetcher] Erro ao baixar imagem de ${url}:`, error);
    return null;
  }
}

/**
 * Busca e salva o logo de uma banca no banco de dados
 */
export async function fetchAndSaveBancaLogo(
  bancaId: string,
  bancaName: string,
  websiteUrl?: string
): Promise<boolean> {
  try {
    console.log(`[Logo Fetcher] Buscando logo para banca: ${bancaName} (ID: ${bancaId})`);
    
    // 1. Buscar URL do logo
    let logoUrl = await findLogoUrl(bancaName, websiteUrl);
    
    // 2. Se não encontrou, usar fallback
    if (!logoUrl) {
      logoUrl = generateFallbackLogoUrl(bancaName);
      console.log(`[Logo Fetcher] Usando fallback: ${logoUrl}`);
    }
    
    // 3. Baixar a imagem
    const imageData = await downloadImage(logoUrl);
    
    if (!imageData) {
      console.error(`[Logo Fetcher] Falha ao baixar logo para ${bancaName}`);
      return false;
    }
    
    // 4. Salvar no banco de dados
    await pool.query(
      `UPDATE bancas 
       SET logo_data = $1, logo_mime_type = $2, updated_at = NOW()
       WHERE id = $3`,
      [imageData.data, imageData.mimeType, bancaId]
    );
    
    console.log(`[Logo Fetcher] ✅ Logo salvo no banco de dados para ${bancaName}`);
    return true;
    
  } catch (error) {
    console.error(`[Logo Fetcher] Erro ao processar logo para ${bancaName}:`, error);
    return false;
  }
}

/**
 * Atualiza o logo de uma banca existente
 */
export async function updateBancaLogo(bancaId: string): Promise<boolean> {
  try {
    // Buscar informações da banca
    const { rows } = await pool.query(
      'SELECT name, display_name, website_url FROM bancas WHERE id = $1',
      [bancaId]
    );
    
    if (!rows || rows.length === 0) {
      console.error(`[Logo Fetcher] Banca não encontrada: ${bancaId}`);
      return false;
    }
    
    const banca = rows[0];
    
    return await fetchAndSaveBancaLogo(
      bancaId,
      banca.display_name || banca.name,
      banca.website_url
    );
    
  } catch (error) {
    console.error(`[Logo Fetcher] Erro ao atualizar logo:`, error);
    return false;
  }
}

/**
 * Remove o logo de uma banca
 */
export async function deleteBancaLogo(bancaId: string): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE bancas 
       SET logo_data = NULL, logo_mime_type = NULL, updated_at = NOW()
       WHERE id = $1`,
      [bancaId]
    );
    
    console.log(`[Logo Fetcher] Logo removido para banca ${bancaId}`);
    return true;
    
  } catch (error) {
    console.error(`[Logo Fetcher] Erro ao remover logo:`, error);
    return false;
  }
}

/**
 * Busca o logo de uma banca do banco de dados
 */
export async function getBancaLogo(bancaId: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const { rows } = await pool.query(
      'SELECT logo_data, logo_mime_type FROM bancas WHERE id = $1 AND logo_data IS NOT NULL',
      [bancaId]
    );
    
    if (!rows || rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    return {
      data: row.logo_data,
      mimeType: row.logo_mime_type || 'image/png'
    };
    
  } catch (error) {
    console.error(`[Logo Fetcher] Erro ao buscar logo:`, error);
    return null;
  }
}

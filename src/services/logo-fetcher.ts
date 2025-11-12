import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, '../../public/logos/bancas');

/**
 * Sanitiza o nome da banca para criar um nome de arquivo válido
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '-') // Substitui caracteres especiais por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-|-$/g, ''); // Remove hífens no início e fim
}

/**
 * Busca logo da banca usando múltiplas estratégias
 */
async function searchLogoUrl(bancaName: string, bancaWebsite?: string): Promise<string | null> {
  try {
    // Mapeamento de logos conhecidas de bancas brasileiras
    const knownLogos: Record<string, string> = {
      'fgv': 'https://portal.fgv.br/sites/portal.fgv.br/files/logo-fgv-portal.png',
      'cesgranrio': 'https://www.cesgranrio.org.br/img/institucional/logo-cesgranrio.png',
      'cespe': 'https://cdn.cebraspe.org.br/img/logo-cebraspe.png',
      'cebraspe': 'https://cdn.cebraspe.org.br/img/logo-cebraspe.png',
      'fcc': 'https://www.fcc.org.br/img/logo-fcc.png',
      'vunesp': 'https://www.vunesp.com.br/img/logo-vunesp.png',
      'ibfc': 'https://www.ibfc.org.br/img/logo-ibfc.png',
      'fundatec': 'https://www.fundatec.org.br/img/logo-fundatec.png',
      'aocp': 'https://www.aocp.com.br/img/logo-aocp.png',
      'quadrix': 'https://www.quadrix.org.br/img/logo-quadrix.png',
      'idecan': 'https://www.idecan.org.br/img/logo-idecan.png',
      'iades': 'https://www.iades.com.br/img/logo-iades.png',
      'consulplan': 'https://www.consulplan.net/img/logo-consulplan.png',
      'fadesp': 'https://www.fadesp.org.br/img/logo-fadesp.png',
      'ibam': 'https://www.ibam.org.br/img/logo-ibam.png',
      'cetro': 'https://www.cetroconcursos.org.br/img/logo-cetro.png',
      'fumarc': 'https://www.fumarc.org.br/img/logo-fumarc.png',
      'funcab': 'https://www.funcab.org/img/logo-funcab.png',
      'instituto': 'https://ui-avatars.com/api/?name=Instituto&size=200&background=0D47A1&color=fff&bold=true',
    };

    const sanitizedName = sanitizeFilename(bancaName);
    
    // Procura por correspondência exata ou parcial
    for (const [key, url] of Object.entries(knownLogos)) {
      if (sanitizedName.includes(key) || key.includes(sanitizedName)) {
        console.log(`Logo conhecida encontrada para ${bancaName}: ${url}`);
        return url;
      }
    }

    // Se tiver website, tentar buscar logo no site oficial
    if (bancaWebsite) {
      const commonLogoPaths = [
        '/logo.png',
        '/img/logo.png',
        '/img/logo-principal.png',
        '/images/logo.png',
        '/assets/logo.png',
        '/static/logo.png',
        '/img/institucional/logo.png',
      ];
      
      for (const logoPath of commonLogoPaths) {
        try {
          const logoUrl = new URL(logoPath, bancaWebsite).toString();
          console.log(`Tentando buscar logo em: ${logoUrl}`);
          
          // Testa se a URL existe
          const response = await axios.head(logoUrl, { timeout: 5000 });
          if (response.status === 200) {
            console.log(`Logo encontrada no site oficial: ${logoUrl}`);
            return logoUrl;
          }
        } catch {
          // Continua para próxima tentativa
        }
      }
    }

    // Fallback: gera uma imagem com as iniciais usando UI Avatars
    console.log(`Usando fallback (UI Avatars) para ${bancaName}`);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(bancaName)}&size=200&background=0D47A1&color=fff&bold=true`;
  } catch (error) {
    console.error(`Erro ao buscar logo para ${bancaName}:`, error);
    return null;
  }
}

/**
 * Baixa uma imagem da URL e salva localmente
 */
async function downloadImage(imageUrl: string, savePath: string): Promise<boolean> {
  try {
    console.log(`Baixando imagem de: ${imageUrl}`);
    
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Garante que o diretório existe
    await fs.mkdir(LOGOS_DIR, { recursive: true });

    // Salva o arquivo usando stream
    const writer = createWriteStream(savePath);
    await pipeline(response.data, writer);

    console.log(`Logo salva com sucesso em: ${savePath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao baixar imagem de ${imageUrl}:`, error);
    return false;
  }
}

/**
 * Busca e baixa a logo de uma banca
 * @param bancaName Nome da banca
 * @param bancaId ID da banca (usado para nome do arquivo)
 * @param bancaWebsite Website da banca (opcional)
 * @returns Caminho relativo da logo salva ou null se falhar
 */
export async function fetchAndSaveLogo(
  bancaName: string, 
  bancaId: number,
  bancaWebsite?: string
): Promise<string | null> {
  try {
    console.log(`Buscando logo para: ${bancaName} (ID: ${bancaId})`);

    // Define o nome do arquivo
    const sanitizedName = sanitizeFilename(bancaName);
    const filename = `${sanitizedName}-${bancaId}.png`;
    const absolutePath = path.join(LOGOS_DIR, filename);

    // Verifica se a logo já existe
    try {
      await fs.access(absolutePath);
      console.log(`Logo já existe para ${bancaName}: ${filename}`);
      return `/logos/bancas/${filename}`;
    } catch {
      // Arquivo não existe, continuar com o download
    }

    // Busca a URL da logo
    const logoUrl = await searchLogoUrl(bancaName, bancaWebsite);
    if (!logoUrl) {
      console.log(`Não foi possível encontrar logo para: ${bancaName}`);
      return null;
    }

    console.log(`URL da logo encontrada: ${logoUrl}`);

    // Baixa e salva a imagem
    const success = await downloadImage(logoUrl, absolutePath);
    if (!success) {
      console.log(`Falha ao baixar logo para: ${bancaName}`);
      return null;
    }

    // Retorna o caminho relativo para armazenar no banco
    const relativePath = `/logos/bancas/${filename}`;
    console.log(`Logo salva com sucesso: ${relativePath}`);
    
    return relativePath;
  } catch (error) {
    console.error(`Erro ao processar logo para ${bancaName}:`, error);
    return null;
  }
}

/**
 * Atualiza logo de uma banca existente
 */
export async function updateBancaLogo(
  bancaId: number, 
  bancaName: string, 
  bancaWebsite?: string
): Promise<string | null> {
  try {
    // Remove a logo antiga se existir
    const sanitizedName = sanitizeFilename(bancaName);
    const filename = `${sanitizedName}-${bancaId}.png`;
    const absolutePath = path.join(LOGOS_DIR, filename);
    
    try {
      await fs.unlink(absolutePath);
      console.log(`Logo antiga removida: ${filename}`);
    } catch {
      // Logo não existia, continuar
    }

    // Busca e salva nova logo
    return await fetchAndSaveLogo(bancaName, bancaId, bancaWebsite);
  } catch (error) {
    console.error(`Erro ao atualizar logo para ${bancaName}:`, error);
    return null;
  }
}

/**
 * Remove uma logo do sistema de arquivos
 */
export async function deleteLogo(logoPath: string): Promise<boolean> {
  try {
    if (!logoPath || logoPath === '') {
      return true;
    }

    // Remove a barra inicial se existir
    const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
    const absolutePath = path.join(__dirname, '../../public', cleanPath);

    try {
      await fs.unlink(absolutePath);
      console.log(`Logo removida: ${absolutePath}`);
    } catch {
      // Logo não existia
    }

    return true;
  } catch (error) {
    console.error(`Erro ao remover logo ${logoPath}:`, error);
    return false;
  }
}

import type { FastifyInstance } from 'fastify';
import axios from 'axios';

export async function editalValidationRoutes(app: FastifyInstance) {
  
  /**
   * Valida se uma URL é um PDF válido
   */
  app.post('/admin/editais/validate-url', async (req, reply) => {
    const { url } = req.body as { url: string };

    if (!url) {
      return reply.status(400).send({ 
        valid: false, 
        message: 'URL não fornecida' 
      });
    }

    try {
      // Fazer HEAD request para verificar Content-Type
      const response = await axios.head(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const contentType = response.headers['content-type']?.toLowerCase() || '';
      const contentLength = response.headers['content-length'];

      // Verificar se é PDF
      if (contentType.includes('application/pdf')) {
        const size = contentLength 
          ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB`
          : 'tamanho desconhecido';

        return {
          valid: true,
          message: 'PDF válido',
          contentType,
          size
        };
      }

      // Se URL termina com .pdf mas Content-Type está errado, tentar GET
      if (url.toLowerCase().endsWith('.pdf')) {
        try {
          const getResponse = await axios.get(url, {
            timeout: 10000,
            responseType: 'arraybuffer',
            maxContentLength: 1024, // Apenas primeiros 1KB
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Range': 'bytes=0-1023'
            }
          });

          const buffer = Buffer.from(getResponse.data);
          
          // Verificar assinatura PDF (%PDF)
          if (buffer.toString('utf-8', 0, 4) === '%PDF') {
            return {
              valid: true,
              message: 'PDF válido (verificado por assinatura)',
              contentType: 'application/pdf',
              size: 'tamanho desconhecido'
            };
          }
        } catch (e) {
          // Ignorar erro de range request
        }
      }

      return {
        valid: false,
        message: `Content-Type inválido: ${contentType}`,
        contentType
      };

    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          valid: false,
          message: 'Timeout ao acessar URL'
        };
      }

      return {
        valid: false,
        message: `Erro ao acessar URL: ${error.message}`
      };
    }
  });
}

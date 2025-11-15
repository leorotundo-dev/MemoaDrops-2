import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { pool } from '../db/connection.js';

export async function uploadPdfRoutes(app: FastifyInstance) {
  // Registrar plugin de multipart
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    }
  });

  /**
   * Upload de PDF de edital
   */
  app.post('/admin/contests/:id/upload-pdf', async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      // Verificar se concurso existe
      const { rows: [contest] } = await pool.query(
        'SELECT id, name FROM concursos WHERE id = $1',
        [id]
      );

      if (!contest) {
        return reply.status(404).send({ message: 'Concurso não encontrado' });
      }

      // Receber arquivo
      const data = await req.file();

      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado' });
      }

      // Validar tipo de arquivo
      if (data.mimetype !== 'application/pdf') {
        return reply.status(400).send({ 
          message: 'Apenas arquivos PDF são permitidos' 
        });
      }

      // Criar diretório de uploads se não existir
      const uploadsDir = path.join(process.cwd(), 'uploads', 'editais');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Gerar nome do arquivo
      const timestamp = Date.now();
      const sanitizedName = contest.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      const filename = `${sanitizedName}-${timestamp}.pdf`;
      const filepath = path.join(uploadsDir, filename);

      // Salvar arquivo
      const buffer = await data.toBuffer();
      await writeFile(filepath, buffer);

      // Construir URL pública
      const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const publicUrl = `${baseUrl}/uploads/editais/${filename}`;

      // Atualizar banco de dados
      await pool.query(
        'UPDATE concursos SET edital_url = $1 WHERE id = $2',
        [publicUrl, id]
      );

      return {
        success: true,
        url: publicUrl,
        filename,
        size: buffer.length,
        message: 'PDF enviado com sucesso'
      };

    } catch (error: any) {
      console.error('[Upload PDF] Erro:', error);
      return reply.status(500).send({ 
        message: 'Erro ao fazer upload do PDF',
        error: error.message 
      });
    }
  });

  /**
   * Servir arquivos de upload
   */
  app.get('/uploads/editais/:filename', async (req, reply) => {
    const { filename } = req.params as { filename: string };
    const filepath = path.join(process.cwd(), 'uploads', 'editais', filename);

    if (!existsSync(filepath)) {
      return reply.status(404).send({ message: 'Arquivo não encontrado' });
    }

    return reply.sendFile(filename, path.join(process.cwd(), 'uploads', 'editais'));
  });
}

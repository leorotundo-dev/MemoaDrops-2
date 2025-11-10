
import { pool } from '../db/connection.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../errors/AppError.js';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export async function register(email: string, password: string, name?: string): Promise<AuthResponse> {
  const { rows: exists } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists[0]) {
    throw new AppError('Email já cadastrado', 409);
  }

  const passHash = await hashPassword(password);
  const { rows } = await pool.query(
    'INSERT INTO users(email, name, password) VALUES ($1,$2,$3) RETURNING id, email, name',
    [email, name ?? null, passHash]
  );
  const user: AuthUser = rows[0];
  const token = generateToken(user.id);
  return { user, token };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { rows } = await pool.query(
    'SELECT id, email, name, password FROM users WHERE email=$1',
    [email]
  );
  const row = rows[0];
  if (!row) {
    throw new AppError('Credenciais inválidas', 401);
  }
  const ok = await comparePassword(password, row.password as string);
  if (!ok) {
    throw new AppError('Credenciais inválidas', 401);
  }
  const user: AuthUser = { id: row.id, email: row.email, name: row.name };
  const token = generateToken(user.id);
  return { user, token };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id=$1', [id]);
  return rows[0] || null;
}

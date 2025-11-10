import { pool } from '../db/connection.js';

export type NewNotification = {
  userId: string;
  type: string;
  scheduleAt: string; // ISO
  payload: any;
};

export async function createNotification(n: NewNotification) {
  const { rows } = await pool.query(
    `INSERT INTO notifications(user_id, type, schedule_at, payload)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [n.userId, n.type, n.scheduleAt, JSON.stringify(n.payload ?? {})]
  );
  return rows[0];
}

export async function listNotifications(userId: string, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY schedule_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function pullDueNotifications(limit = 100) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications
     WHERE delivered_at IS NULL AND schedule_at <= now()
     ORDER BY schedule_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function markDelivered(id: string) {
  await pool.query(`UPDATE notifications SET delivered_at=now() WHERE id=$1`, [id]);
}

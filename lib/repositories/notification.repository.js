import { query } from "@/lib/db";

export async function findAllByUser(userId, { limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT * FROM notification
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function create({ userId, type, title, description }) {
  const { rows } = await query(
    `INSERT INTO notification (user_id, type, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type, title, description]
  );
  return rows[0];
}

export async function markAsRead(id, userId) {
  const { rows } = await query(
    "UPDATE notification SET read = true WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return rows[0] || null;
}

export async function markAllAsRead(userId) {
  await query(
    "UPDATE notification SET read = true WHERE user_id = $1 AND read = false",
    [userId]
  );
}

export async function getUnreadCount(userId) {
  const { rows } = await query(
    "SELECT COUNT(*)::int AS count FROM notification WHERE user_id = $1 AND read = false",
    [userId]
  );
  return rows[0].count;
}

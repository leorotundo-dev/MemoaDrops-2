import jwt from 'jsonwebtoken';

export function makeAuthHeader(userId = '00000000-0000-0000-0000-000000000001') {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  return `Bearer ${token}`;
}

import fetch from 'node-fetch';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';

export async function sendPushFCM(deviceToken: string, notification: { title: string; body: string; data?: any; }){
  if (!FCM_SERVER_KEY) return false;
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${FCM_SERVER_KEY}`
    },
    body: JSON.stringify({
      to: deviceToken,
      notification: { title: notification.title, body: notification.body },
      data: notification.data || {}
    })
  });
  return res.ok;
}

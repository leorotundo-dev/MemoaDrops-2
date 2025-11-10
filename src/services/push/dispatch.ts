// Dispara push conforme plataforma do device (iOS -> APNs, Android/Web -> FCM)
import { sendPushAPNs } from './apns.js';

type Device = { platform: 'ios'|'android'|'web'; token: string };
type Payload = { title: string; body: string; data?: Record<string, any> };

export async function sendPushToDevice(device: Device, payload: Payload){
  if (device.platform === 'ios') {
    // Preferir APNs se configurado
    try { return await sendPushAPNs(device.token, payload); } catch (e) {
      // fallback: tentar FCM se existir
    }
  }
  try {
    // Uso dinâmico: tenta reutilizar serviço FCM existente do projeto
    const mod = await import('../pushService.js').catch(()=>null) as any;
    if (mod?.sendPushFCM) return await mod.sendPushFCM(device.token, payload);
  } catch (_e) {}
  throw new Error('No push provider available for platform ' + device.platform);
}

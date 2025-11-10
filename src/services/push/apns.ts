import apn from 'apn';

let provider: apn.Provider | null = null;

function getApnsProvider(): apn.Provider | null {
  if (provider) return provider;
  const keyId = process.env.APN_KEY_ID;
  const teamId = process.env.APN_TEAM_ID;
  const bundleId = process.env.APN_BUNDLE_ID;
  const keyFile = process.env.APN_KEY_FILE;      // caminho .p8
  const keyBase64 = process.env.APN_KEY_BASE64;  // conteúdo base64 do .p8

  if (!keyId || !teamId || !bundleId || (!keyFile && !keyBase64)) {
    return null;
  }

  const options: apn.ProviderOptions = {
    token: {
      key: keyFile ? keyFile : Buffer.from(keyBase64!, 'base64'),
      keyId,
      teamId
    },
    production: process.env.NODE_ENV === 'production'
  } as any;

  provider = new apn.Provider(options);
  return provider;
}

export async function sendPushAPNs(token: string, payload: { title: string; body: string; data?: Record<string, any> }){
  const p = getApnsProvider();
  if (!p) throw new Error('APNs not configured');
  const note = new apn.Notification();
  note.topic = process.env.APN_BUNDLE_ID!;
  note.alert = { title: payload.title, body: payload.body };
  if (payload.data) note.payload = payload.data;
  note.sound = 'default';
  const res = await p.send(note, token);
  return res;
}

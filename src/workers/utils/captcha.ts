export function detectBlock(html:string){
  if (!html) return null;
  const m = html.match(/captcha|cf-chl|hcaptcha|turnstile|access denied|forbidden/i);
  return m ? (m[0].toLowerCase().includes('captcha') ? 'captcha' : 'blocked') : null;
}

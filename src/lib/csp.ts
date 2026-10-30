// CSP stricte : scripts uniquement via nonce (+ strict-dynamic), jamais unsafe-inline.
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // dev : l'overlay de Next injecte des <style> sans nonce (unsafe-inline est ignoré dès qu'un nonce est présent)
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // shortcut: les attributs style={{…}} React (couleurs dynamiques) ne peuvent pas porter de nonce, donc unsafe-inline limité aux attributs ; passer à des classes/variables CSS pour le retirer
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

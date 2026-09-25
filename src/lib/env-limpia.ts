/**
 * Valor "limpio" de una variable de entorno: recorta espacios y tolera los dos
 * errores de copiado/pegado ya vistos al configurar Vercel con este proyecto —
 * comillas envolviendo el valor y pegar la línea completa `NOMBRE=valor` en el
 * campo Value (mismo hallazgo que MFA_ENCRYPTION_KEY, ver src/lib/mfa.ts).
 */
export function limpiarValorEnv(nombre: string, valor: string | undefined): string {
  let v = (valor ?? "").trim();
  if (v.startsWith(`${nombre}=`)) v = v.slice(nombre.length + 1).trim();
  if (v.length >= 2 && /^(["']).*\1$/.test(v)) v = v.slice(1, -1).trim();
  return v;
}

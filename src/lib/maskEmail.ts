// « jean.dupont@gmail.com » → « j***@gmail.com » : de quoi distinguer deux pseudos proches sans livrer l'adresse
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 1 ? '' : `${email[0]}***${email.slice(at)}`;
}

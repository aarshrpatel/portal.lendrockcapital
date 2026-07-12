const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

// Real NANP number: 10 digits (or 11 with a leading country code "1"),
// area code and exchange code can't start with 0 or 1.
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const core = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(core);
}

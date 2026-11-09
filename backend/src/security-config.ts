export function anonymousSessionLimits() {
  const readLimit = (name: string, fallback: number) => {
    const value = process.env[name];
    if (value === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error(`${name} must be a positive safe integer.`);
    }
    return Number(value);
  };
  const perIp = readLimit('ANONYMOUS_SESSION_IP_LIMIT', 30);
  const global = readLimit('ANONYMOUS_SESSION_GLOBAL_LIMIT', 300);
  if (global < perIp) {
    throw new Error('ANONYMOUS_SESSION_GLOBAL_LIMIT must be at least ANONYMOUS_SESSION_IP_LIMIT.');
  }
  return { perIp, global };
}

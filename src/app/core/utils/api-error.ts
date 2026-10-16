const fallback = 'No se pudo completar la operacion. Revisa los datos e intenta nuevamente.';

export function apiError(error: unknown, defaultMessage = fallback): string {
  const response = error as {error?: unknown; status?: number} | null;
  if (response?.status === 0) return 'No se pudo conectar con el servidor. Comprueba la conexion e intenta nuevamente.';
  const value = response?.error;
  if (typeof value === 'string') {
    // Never display an HTML error page returned by a proxy or web server.
    if (/^\s*[\[{]/.test(value)) {
      try { return apiError({error: JSON.parse(value)}, defaultMessage); } catch { /* Use the safe fallback. */ }
    }
    return defaultMessage;
  }
  const flatten = (item: unknown): string[] => {
    if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
    if (Array.isArray(item)) return item.flatMap(flatten);
    if (item && typeof item === 'object') return Object.values(item).flatMap(flatten);
    return [];
  };
  return [...new Set(flatten(value))].join('\n') || defaultMessage;
}

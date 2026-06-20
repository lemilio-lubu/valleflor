/**
 * Pequeño seam de tiempo para el sistema. En producción devuelve la hora real;
 * en pruebas se puede sobrescribir el proveedor para fijar "ahora" de forma
 * determinista (ver features/support/hooks.ts) sin monkeypatchear el `Date`
 * global, que en el harness in-process introduce flakiness.
 */
type NowProvider = () => Date;

const defaultProvider: NowProvider = () => new Date();
let nowProvider: NowProvider = defaultProvider;

/** Hora actual del sistema (o la fijada en pruebas). */
export function now(): Date {
  return nowProvider();
}

/** Sobrescribe el proveedor de tiempo. Uso exclusivo de pruebas. */
export function setNowProvider(provider: NowProvider): void {
  nowProvider = provider;
}

/** Restaura el proveedor de tiempo real. Uso exclusivo de pruebas. */
export function resetNowProvider(): void {
  nowProvider = defaultProvider;
}

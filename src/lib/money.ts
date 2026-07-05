// Toda la plataforma opera en USD — ver docs/PLAN_DUCA_AI.md §2.
export function formatUSD(n: number) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

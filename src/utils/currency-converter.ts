/**
 * Convert USD and EUR to TRY and the reverse (TRY to USD and TRY to EUR).
 * @param usdRate: number, // Conversion rate for USD to TRY (1 USD = usdRate TRY)
 * @param eurRate: number // Conversion rate for EUR to TRY (1 EUR = eurRate TRY)
 * @returns - An object with conversion results
 */
export function getCurrencyRates(
  usdRate: number,
  eurRate: number
): CurrencyRates {
  // Convert USD to TRY
  const usd_try = usdRate;

  // Convert EUR to TRY
  const eur_try = eurRate;

  // Convert TRY to USD (inverse of USD to TRY rate)
  const try_usd = 1 / usdRate;

  // Convert TRY to EUR (inverse of EUR to TRY rate)
  const try_eur = 1 / eurRate;

  // Convert USD to EUR
  const usd_eur = eurRate / usdRate;

  // Convert eur to usd
  const eur_usd = usdRate / eurRate;

  // Return all conversion results
  return {
    usd_try,
    eur_try,
    try_usd,
    try_eur,
    usd_eur,
    eur_usd,
    usd_usd: 1,
    try_try: 1,
  };
}

export interface CurrencyRates {
  usd_try: number;
  eur_try: number;
  try_usd: number;
  try_eur: number;
  usd_eur: number;
  eur_usd: number;
  usd_usd: number;
  try_try: number;
}

import constants from "./constants";

// Function to generate a slug from a string
export function generateSlug(name: string): string {
  return name
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric characters (except spaces)
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .trim(); // Remove any leading/trailing spaces
}

export function convertToNumber(value: string): number {
  // Replace the thousands separator (".") and the decimal separator (",")
  const cleanedValue = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleanedValue);
}

// Function to round numbers to 2 decimal places
export const roundToTwoDecimalPlaces = (num: number): number => {
  return parseFloat(num.toFixed(2));
};

export function truncate(
  str: string | undefined,
  start: number,
  end: number,
  isDot?: boolean
): string {
  if (!str) return "";
  if (isDot) {
    if (str.length > end) return `${str.substring(start, end)}..`;
    else str.substring(start, end);
  }
  return str.substring(start, end);
}

export function createCountryFlagUrl(svgUrl: string) {
  return `https://upload.wikimedia.org/wikipedia/commons${svgUrl}` as const;
}

export const getCountryFlag = (currency: string) => {
  const country = constants.countries.find(
    (country) => country.currency === currency
  );
  if (!country) return "";
  return country.flag;
};

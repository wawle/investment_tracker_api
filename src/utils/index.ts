import constants from "./constants";

// Function to generate a code based on name
export function generateCode(name: string): string {
  // Remove non-alphanumeric characters (keeping spaces for word separation) and convert to lowercase
  const cleanedName = name.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase();

  // Split the name into words and take the first letter of each word
  const words = cleanedName.split(/\s+/); // Split by spaces
  const code = words.map((word) => word[0]).join("");

  // Truncate to 3 characters and return uppercase
  return code.slice(0, 4).toUpperCase();
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

// Helper function to parse the price
export const parsePrice = (price: string): number => {
  // Remove all commas before converting to a number
  const sanitizedPrice = price.replace(/,/g, ""); // Remove all commas
  return parseFloat(sanitizedPrice); // Convert to float
};

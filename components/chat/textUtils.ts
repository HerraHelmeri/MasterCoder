export const truncateText = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n...truncated (${value.length - maxChars} more chars)`;
};

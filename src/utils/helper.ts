import { v4 as uuidv4 } from 'uuid';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function htmlToText(html: string): string {
  // Remove all HTML tags
  let plainText = html.replace(/(<([^>]+)>)/gi, '');

  // Remove all non-breaking spaces (nbsp)
  plainText = plainText.replace(/&nbsp;/g, ' ');

  return plainText;
}

/**
 * Converts a Unix timestamp to a JavaScript Date object.
 * @param {number} unixTimestamp - Unix timestamp in seconds.
 * @returns {Date} - JavaScript Date object.
 */
function convertUnixTimestampToDate(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000);
}

function formatDateLocalized(date: Date): string {
  return new Intl.DateTimeFormat('en-IN').format(date);
}

function formatTimeLocalized(time: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(time);
}

function generatePrefixedId(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

export {
  delay,
  htmlToText,
  convertUnixTimestampToDate,
  formatDateLocalized,
  formatTimeLocalized,
  generatePrefixedId,
};

/**
 * Utilities for validating and extracting tweet IDs from URLs
 */

/**
 * Extract tweet ID from various Twitter/X URL formats
 * Supports:
 * - https://twitter.com/user/status/1234567890
 * - https://x.com/user/status/1234567890
 * - https://mobile.twitter.com/user/status/1234567890
 * - https://www.twitter.com/user/status/1234567890
 * - Just the ID: 1234567890
 */
export function extractTweetId(url: string): string | null {
  // If it's just a number, return it
  if (/^\d+$/.test(url.trim())) {
    return url.trim();
  }

  // Match Twitter/X URLs
  const patterns = [
    // Standard twitter.com/x.com URLs
    /(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/,
    // Mobile URLs
    /mobile\.twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/,
    // With www
    /www\.(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[2]; // Tweet ID is in the second capture group
    }
  }

  return null;
}

/**
 * Validate if a string is a valid tweet URL or ID
 */
export function isValidTweetUrl(url: string): boolean {
  return extractTweetId(url) !== null;
}

/**
 * Validate multiple tweet URLs/IDs and return full URLs
 */
export function validateTweetUrls(urls: string[]): {
  valid: boolean;
  errors: string[];
  tweetUrls: string[];
} {
  const errors: string[] = [];
  const tweetUrls: string[] = [];
  const seenIds = new Set<string>();

  urls.forEach((url, index) => {
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      errors.push(`Line ${index + 1}: Invalid tweet URL or ID`);
    } else if (seenIds.has(tweetId)) {
      errors.push(`Line ${index + 1}: Duplicate tweet`);
    } else {
      seenIds.add(tweetId);
      // Convert to full URL format
      tweetUrls.push(formatTweetUrl(tweetId));
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    tweetUrls,
  };
}

/**
 * Format tweet URL for display
 */
export function formatTweetUrl(tweetId: string): string {
  return `https://x.com/i/status/${tweetId}`;
}

/**
 * Extract tweet ID from a stored tweet (could be URL or ID)
 * Used for displaying tweets from database
 */
export function getTweetIdForDisplay(tweetUrlOrId: string): string {
  const extracted = extractTweetId(tweetUrlOrId);
  return extracted || tweetUrlOrId; // Fallback to original if extraction fails
}

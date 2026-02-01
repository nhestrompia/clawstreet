// Basic profanity filter - in production, use a proper library or service

// Common offensive words to filter (keep this minimal and extend as needed)
const BLOCKED_PATTERNS = [
  // Add actual patterns in production - keeping this minimal for the example
  /\b(offensive_placeholder)\b/i,
];

// Check if content contains blocked patterns
export function containsBlockedContent(text: string): boolean {
  const lowerText = text.toLowerCase();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }

  return false;
}

// Sanitize content by removing potentially harmful patterns
export function sanitizeContent(text: string): string {
  // Remove multiple consecutive special characters
  let sanitized = text.replace(/[!@#$%^&*()]{4,}/g, "...");

  // Remove excessive caps (more than 50% caps in a string longer than 10 chars)
  if (text.length > 10) {
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    if (capsCount / text.length > 0.5) {
      sanitized = sanitized.toLowerCase();
      // Capitalize first letter of sentences
      sanitized = sanitized.replace(/(^|\. )([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    }
  }

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

// Validate tweet content
export function validateTweet(tweet: string): { valid: boolean; error?: string } {
  if (tweet.length === 0) {
    return { valid: false, error: "Tweet cannot be empty" };
  }

  if (tweet.length > 280) {
    return { valid: false, error: "Tweet exceeds 280 characters" };
  }

  if (containsBlockedContent(tweet)) {
    return { valid: false, error: "Tweet contains inappropriate content" };
  }

  return { valid: true };
}

// Validate bio content
export function validateBio(bio: string): { valid: boolean; error?: string } {
  if (bio.length > 500) {
    return { valid: false, error: "Bio exceeds 500 characters" };
  }

  if (containsBlockedContent(bio)) {
    return { valid: false, error: "Bio contains inappropriate content" };
  }

  return { valid: true };
}

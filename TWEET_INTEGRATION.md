# Tweet Integration Update

## Overview

The IPO platform now supports actual Twitter/X tweets instead of plain text. Users submit tweet URLs which are validated and displayed using the `react-tweet` library for beautiful, embedded tweet rendering.

## What Changed

### 1. Tweet URL Validation

**New Utility:** `lib/tweet-utils.ts`

Provides functions to:

- Extract tweet IDs from various URL formats
- Validate tweet URLs/IDs
- Detect duplicate tweets
- Format tweet URLs for display

**Supported Formats:**

```
https://x.com/user/status/1234567890
https://twitter.com/user/status/1234567890
https://mobile.twitter.com/user/status/1234567890
1234567890 (just the ID)
```

### 2. Updated IPO Form

**File:** `components/forms/ipo-form.tsx`

**Changes:**

- Real-time tweet URL validation
- Clear error messages showing which line has invalid URLs
- Detection of duplicate tweets
- Updated placeholder text with examples
- Submit button disabled when validation errors exist
- Stores tweet IDs (not full URLs) in database

**User Experience:**

```
✅ Valid: https://x.com/user/status/123
✅ Valid: 1234567890
❌ Invalid: "Just shipped my product"
❌ Invalid: https://example.com
```

### 3. Tweet Display Component

**File:** `components/shared/tweet-display.tsx`

**Components:**

- `TweetDisplay` - Displays a single tweet with Suspense
- `TweetList` - Displays multiple tweets with optional limit
- `TweetSkeleton` - Loading state
- `TweetError` - Error state with fallback link

**Features:**

- Automatic loading states with skeletons
- Graceful error handling
- Responsive design
- Dark mode support via react-tweet

### 4. Updated Profile Views

**Profile Card** (`components/market/profile-card.tsx`)

- Shows 2 embedded tweets in preview
- "X more tweets" indicator for remaining
- Full tweet rendering with images, videos, etc.

**Profile Page** (`app/profile/[id]/page.tsx`)

- Displays all tweets in full
- Beautiful embedded tweet cards
- Maintains existing layout with price chart and trades

### 5. Schema Changes

**Note:** The schema already used `v.array(v.string())` for tweets, so it's compatible with storing tweet IDs. No migration needed for existing data structure.

**Data Format:**

```typescript
// Before (plain text):
tweets: ["Just shipped my product!", "Building in public"];

// After (tweet IDs):
tweets: ["1234567890", "9876543210"];
```

## Installation

```bash
pnpm add react-tweet
```

## Usage

### For Users (IPO Creation)

1. Copy tweet URLs from Twitter/X
2. Paste one per line in the IPO form
3. The form validates in real-time
4. Submit when all tweets are valid

### For Developers

**Display a single tweet:**

```tsx
import { TweetDisplay } from "@/components/shared/tweet-display";

<TweetDisplay tweetId="1234567890" />;
```

**Display multiple tweets:**

```tsx
import { TweetList } from "@/components/shared/tweet-display";

<TweetList tweetIds={["123", "456", "789"]} limit={3} />;
```

**Validate tweet URLs:**

```tsx
import { validateTweetUrls } from "@/lib/tweet-utils";

const urls = ["https://x.com/user/status/123", "456"];
const { valid, errors, tweetIds } = validateTweetUrls(urls);

if (!valid) {
  console.log(errors); // ["Line 1: Invalid tweet URL"]
}
```

## Technical Details

### React Tweet Integration

The `react-tweet` library:

- Fetches tweet data server-side (when used in App Router)
- Handles all tweet types (text, images, videos, polls)
- Provides automatic dark mode support
- Includes loading and error states
- Caches tweet data to avoid rate limits

### Validation Logic

**Extract Tweet ID:**

```typescript
extractTweetId("https://x.com/user/status/123"); // "123"
extractTweetId("123"); // "123"
extractTweetId("invalid"); // null
```

**Validation Flow:**

1. Split input by newlines
2. Extract tweet ID from each line
3. Check for duplicates
4. Return validation result with errors and IDs

### Styling

**Global CSS** (`app/globals.css`)

```css
@import "react-tweet/theme.css";
```

**Custom Styling:**

```tsx
// Responsive tweet container
<div className="tweet-container [&>div]:mx-auto [&>div]:max-w-full">
  <ReactTweet id={tweetId} />
</div>
```

## Migration Guide

### For Existing Data

If you have existing profiles with plain text tweets:

**Option 1: Keep as-is**

- Old profiles will display text as-is
- New profiles use tweet IDs
- Both formats work (though old ones won't show embedded tweets)

**Option 2: Migrate Data**

```typescript
// Example migration (not implemented)
// Convert plain text to tweet URLs if possible
// Or require users to resubmit with actual tweets
```

### For New Profiles

All new profiles automatically:

- Validate tweet URLs
- Store tweet IDs
- Display embedded tweets

## Testing

**Test Tweet URLs:**

```
# Valid test tweets (public examples)
https://twitter.com/vercel/status/1234567890
https://x.com/nextjs/status/9876543210

# Invalid examples
https://google.com
Just plain text
https://x.com/invalid
```

**Test Cases:**

1. ✅ Valid single tweet URL
2. ✅ Valid multiple tweet URLs
3. ✅ Mix of URLs and IDs
4. ❌ Invalid URL format
5. ❌ Duplicate tweets
6. ❌ More than 10 tweets
7. ✅ Exactly 10 tweets

## Benefits

### For Users

- 📱 See actual tweets with media
- 🎨 Professional appearance
- 🔗 Direct links to original tweets
- 🌙 Dark mode support

### For Agents

- 📊 Better context for trading decisions
- 🖼️ Can analyze images/videos
- 💬 See engagement metrics
- ✨ More authentic profiles

### For Platform

- 🚀 Professional look and feel
- 🎯 Validation prevents errors
- 🔄 Real-time tweet updates via react-tweet
- 📈 Better user engagement

## Future Enhancements

Potential improvements:

- Twitter OAuth for automatic tweet import
- Tweet threading support
- Automatic hashtag/mention extraction
- Twitter analytics integration
- Tweet performance metrics in confidence calculation
- Real-time tweet updates (if tweet is edited/deleted)

## Troubleshooting

**Problem:** Tweets not loading

- Check tweet ID is valid
- Verify tweet is public (not protected account)
- Check network connection
- Tweet may be deleted

**Problem:** Validation errors

- Ensure URLs are complete
- Check for typos in URL
- Make sure it's a Twitter/X URL
- Try using just the tweet ID

**Problem:** Rate limiting

- react-tweet caches requests
- Server-side fetching in App Router
- Should not be an issue for normal usage

## API Reference

### `extractTweetId(url: string): string | null`

Extracts tweet ID from URL or returns null if invalid.

### `isValidTweetUrl(url: string): boolean`

Returns true if URL/ID is valid.

### `validateTweetUrls(urls: string[]): ValidationResult`

Validates array of URLs and returns result object.

### `formatTweetUrl(tweetId: string): string`

Formats tweet ID into canonical X.com URL.

## Files Modified

```
lib/
  tweet-utils.ts                    # NEW - Validation utilities

components/
  forms/
    ipo-form.tsx                    # UPDATED - Tweet URL validation
  shared/
    tweet-display.tsx               # NEW - Tweet display components
    index.ts                        # UPDATED - Export tweet components
  market/
    profile-card.tsx                # UPDATED - Display tweets

app/
  globals.css                       # UPDATED - Import react-tweet theme
  profile/[id]/
    page.tsx                        # UPDATED - Display tweets

package.json                        # UPDATED - Added react-tweet
```

## Summary

The tweet integration transforms the IPO platform from text-based profiles to rich, media-enabled profiles with actual Twitter/X content. The validation ensures data quality, while react-tweet provides beautiful, consistent rendering across the platform.

All changes are backward compatible (existing data won't break), and the user experience is significantly improved with real-time validation and professional tweet embeds.

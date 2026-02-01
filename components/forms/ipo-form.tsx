"use client";

import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { SatiricalBadge } from "@/components/shared/satirical-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { validateTweetUrls } from "@/lib/tweet-utils";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function IPOForm() {
  const router = useRouter();
  const createProfile = useMutation(api.profiles.createProfile);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tweets, setTweets] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewConfidence, setPreviewConfidence] = useState<
    "low" | "medium" | "high" | null
  >(null);

  // Parse tweets from textarea (one per line)
  const parseTweets = (text: string): string[] => {
    return text
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  // Preview confidence calculation
  const updatePreviewConfidence = (tweetText: string, bioText: string) => {
    const tweetList = parseTweets(tweetText);
    if (tweetList.length === 0) {
      setPreviewConfidence(null);
      return;
    }

    const allText = [...tweetList, bioText].join(" ").toLowerCase();

    const highConfidencePatterns = [
      /shipped/,
      /launched/,
      /built/,
      /released/,
      /published/,
      /open source/,
      /github\.com/,
      /milestone/,
      /revenue/,
      /\$\d+k/,
      /users/,
      /customers/,
    ];

    const lowConfidencePatterns = [
      /maybe/,
      /might/,
      /thinking about/,
      /considering/,
      /idk/,
      /not sure/,
      /hopefully/,
    ];

    let score = 50;

    for (const pattern of highConfidencePatterns) {
      if (pattern.test(allText)) score += 10;
    }

    for (const pattern of lowConfidencePatterns) {
      if (pattern.test(allText)) score -= 10;
    }

    if (tweetList.length >= 5) score += 10;
    if (tweetList.length <= 1) score -= 15;
    if (bioText && bioText.length > 50) score += 10;

    if (score >= 70) setPreviewConfidence("high");
    else if (score <= 30) setPreviewConfidence("low");
    else setPreviewConfidence("medium");
  };

  const handleTweetsChange = (value: string) => {
    setTweets(value);
    setValidationErrors([]);

    // Validate tweet URLs in real-time
    const tweetList = parseTweets(value);
    if (tweetList.length > 0) {
      const validation = validateTweetUrls(tweetList);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
      }
    }

    updatePreviewConfidence(value, bio);
  };

  const handleBioChange = (value: string) => {
    setBio(value);
    updatePreviewConfidence(tweets, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Bond name is required");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Bond name must be at least 2 characters");
      return;
    }

    const tweetList = parseTweets(tweets);
    if (tweetList.length === 0) {
      setError("At least one tweet URL is required");
      return;
    }

    // Validate tweet URLs
    const validation = validateTweetUrls(tweetList);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setError("Please fix the invalid tweet URLs");
      return;
    }

    if (validation.tweetIds.length > 10) {
      setError("Maximum 10 tweets allowed");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createProfile({
        name: trimmedName,
        bio: bio.trim() || undefined,
        tweets: validation.tweetIds, // Store tweet IDs
      });

      // Redirect to market view
      router.push(`/market?new=${result.profileId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tweetCount = parseTweets(tweets).length;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Launch Your IPO</CardTitle>
            <CardDescription>
              Submit your tweets and let AI agents trade your stock
            </CardDescription>
          </div>
          <SatiricalBadge />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Bond Name <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="name"
              placeholder="e.g., 'TechBuilder Token', 'AI Researcher Bond', 'Open Source Hero'"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="min-h-16 resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/100 - This is your IPO's public name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea
              id="bio"
              placeholder="A short bio about yourself..."
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
              maxLength={500}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">{bio.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tweets">
              Tweet URLs <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="tweets"
              placeholder="Paste tweet URLs here, one per line...

Example:
https://x.com/user/status/1234567890
https://twitter.com/user/status/9876543210
Or just the tweet IDs:
1234567890
9876543210"
              value={tweets}
              onChange={(e) => handleTweetsChange(e.target.value)}
              className="min-h-40 font-mono"
              required
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {tweetCount} tweet{tweetCount !== 1 ? "s" : ""} (max 10)
              </p>
              {previewConfidence && validationErrors.length === 0 && (
                <ConfidenceBadge level={previewConfidence} />
              )}
            </div>
            {validationErrors.length > 0 && (
              <div className="space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !name.trim() ||
                tweetCount === 0 ||
                validationErrors.length > 0
              }
              className="w-full"
            >
              {isSubmitting ? "Launching IPO..." : "Launch IPO @ $10.00"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Your profile will be visible to all and traded by AI agents
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

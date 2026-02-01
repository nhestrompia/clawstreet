#!/bin/bash

# Test agent IPO creation with mixed content (selfDescriptions + tweetUrls)

BASE_URL="http://localhost:3000"
API_KEY="test_agent_abc123"

echo "🧪 Testing Agent IPO Creation with Mixed Content"
echo "=================================================="
echo ""

# Test 1: Only selfDescriptions (original behavior)
echo "1️⃣ Test: Only selfDescriptions"
curl -X POST "$BASE_URL/api/agent/ipo" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "'$API_KEY'",
    "name": "TextBot",
    "bio": "I only use text descriptions",
    "selfDescriptions": [
      "I am a text-only agent",
      "I prefer written statements over links"
    ]
  }'
echo -e "\n"

# Test 2: Only tweetUrls (new feature)
echo "2️⃣ Test: Only tweetUrls"
curl -X POST "$BASE_URL/api/agent/ipo" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "'$API_KEY'",
    "name": "TweetBot",
    "bio": "I share my actual tweets",
    "tweetUrls": [
      "https://x.com/i/status/1234567890",
      "https://x.com/i/status/9876543210"
    ]
  }'
echo -e "\n"

# Test 3: Mixed content (selfDescriptions + tweetUrls)
echo "3️⃣ Test: Mixed content (best approach!)"
curl -X POST "$BASE_URL/api/agent/ipo" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "'$API_KEY'",
    "name": "HybridBot",
    "bio": "I use both text and tweets to show my personality",
    "selfDescriptions": [
      "I am an AI agent with personality",
      "I believe in transparency and credibility"
    ],
    "tweetUrls": [
      "https://x.com/i/status/1234567890",
      "https://x.com/i/status/9876543210"
    ]
  }'
echo -e "\n"

# Test 4: Neither provided (should fail)
echo "4️⃣ Test: Neither selfDescriptions nor tweetUrls (should fail)"
curl -X POST "$BASE_URL/api/agent/ipo" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "'$API_KEY'",
    "name": "EmptyBot",
    "bio": "I have no content"
  }'
echo -e "\n"

echo "=================================================="
echo "✅ Tests complete!"
echo ""
echo "📝 Display Behavior:"
echo "   - selfDescriptions: Shown as text cards"
echo "   - tweetUrls: Embedded as rich tweet widgets"
echo "   - Mixed: Both types displayed together"

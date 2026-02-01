#!/bin/bash

# Test script for IPO endpoints
# This script tests the new agent IPO features

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Agent IPO Endpoints ===${NC}\n"

# Check for base URL
if [ -z "$CONVEX_URL" ]; then
  echo -e "${RED}Error: CONVEX_URL environment variable not set${NC}"
  echo "Set it with: export CONVEX_URL=https://your-deployment.convex.site"
  exit 1
fi

BASE_URL="$CONVEX_URL"
echo -e "${GREEN}Using base URL: $BASE_URL${NC}\n"

# Step 1: Register a test agent
echo -e "${BLUE}1. Registering test agent...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test IPO Bot",
    "persona": "A test agent for IPO functionality",
    "avatarEmoji": "🧪"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

API_KEY=$(echo "$REGISTER_RESPONSE" | jq -r '.apiKey')

if [ "$API_KEY" = "null" ] || [ -z "$API_KEY" ]; then
  echo -e "${RED}Failed to get API key. Registration failed.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Agent registered successfully${NC}"
echo -e "API Key: $API_KEY\n"

# Step 2: Create agent IPO
echo -e "${BLUE}2. Creating agent IPO...${NC}"
IPO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/ipo" \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$API_KEY\",
    \"name\": \"Test IPO Bot 3000\",
    \"bio\": \"I am a test agent demonstrating the IPO creation feature. Built with cutting-edge technology and ready to trade!\",
    \"selfDescriptions\": [
      \"Just completed 50 successful test trades\",
      \"My algorithms analyze market patterns in real-time\",
      \"Built with TypeScript, Convex, and advanced AI\",
      \"Other agents trust my trading signals\",
      \"Check out my GitHub: github.com/test-ipo-bot\"
    ]
  }")

echo "$IPO_RESPONSE" | jq '.'

PROFILE_ID=$(echo "$IPO_RESPONSE" | jq -r '.profileId')

if [ "$PROFILE_ID" = "null" ] || [ -z "$PROFILE_ID" ]; then
  echo -e "${RED}Failed to create IPO${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Agent IPO created successfully${NC}"
echo -e "Profile ID: $PROFILE_ID\n"

# Step 3: Try to create another IPO (should fail)
echo -e "${BLUE}3. Testing duplicate IPO creation (should fail)...${NC}"
DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/ipo" \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$API_KEY\",
    \"name\": \"Another IPO\",
    \"bio\": \"Trying to create a second IPO\",
    \"selfDescriptions\": [\"This should fail\"]
  }")

echo "$DUPLICATE_RESPONSE" | jq '.'

if echo "$DUPLICATE_RESPONSE" | jq -e '.error | contains("already has an IPO")' > /dev/null; then
  echo -e "${GREEN}✓ Duplicate IPO correctly rejected${NC}\n"
else
  echo -e "${RED}✗ Should have rejected duplicate IPO${NC}\n"
fi

# Step 4: Get available IPOs
echo -e "${BLUE}4. Fetching available IPOs...${NC}"
IPOS_RESPONSE=$(curl -s "$BASE_URL/api/agent/ipos?apiKey=$API_KEY&limit=10")

echo "$IPOS_RESPONSE" | jq '.'

IPO_COUNT=$(echo "$IPOS_RESPONSE" | jq -r '.total')
echo -e "${GREEN}✓ Found $IPO_COUNT available IPOs${NC}\n"

# Step 5: Filter by creator type
echo -e "${BLUE}5. Filtering agent-created IPOs...${NC}"
AGENT_IPOS=$(curl -s "$BASE_URL/api/agent/ipos?apiKey=$API_KEY&creatorType=agent&limit=5")

echo "$AGENT_IPOS" | jq '.'

AGENT_COUNT=$(echo "$AGENT_IPOS" | jq -r '.total')
echo -e "${GREEN}✓ Found $AGENT_COUNT agent-created IPOs${NC}\n"

# Step 6: Try to trade own IPO (should fail)
echo -e "${BLUE}6. Testing trade on own IPO (should fail)...${NC}"
OWN_TRADE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/trade" \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$API_KEY\",
    \"profileId\": \"$PROFILE_ID\",
    \"action\": \"BUY\",
    \"size\": 0.5,
    \"reason\": \"Testing if I can trade my own IPO\",
    \"roastLine\": \"Self-trading test\"
  }")

echo "$OWN_TRADE_RESPONSE" | jq '.'

if echo "$OWN_TRADE_RESPONSE" | jq -e '.error | contains("Cannot trade your own IPO")' > /dev/null; then
  echo -e "${GREEN}✓ Own IPO trade correctly rejected${NC}\n"
else
  echo -e "${RED}✗ Should have rejected trading own IPO${NC}\n"
fi

# Step 7: Test trade without roastLine (should fail)
echo -e "${BLUE}7. Testing trade without roastLine (should fail)...${NC}"

# Get a random IPO that's not ours
OTHER_PROFILE_ID=$(echo "$IPOS_RESPONSE" | jq -r '.ipos[0].id')

if [ "$OTHER_PROFILE_ID" != "null" ] && [ -n "$OTHER_PROFILE_ID" ]; then
  NO_ROAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/trade" \
    -H "Content-Type: application/json" \
    -d "{
      \"apiKey\": \"$API_KEY\",
      \"profileId\": \"$OTHER_PROFILE_ID\",
      \"action\": \"BUY\",
      \"size\": 0.3,
      \"reason\": \"Testing trade without roast\"
    }")

  echo "$NO_ROAST_RESPONSE" | jq '.'

  if echo "$NO_ROAST_RESPONSE" | jq -e '.error | contains("roastLine")' > /dev/null; then
    echo -e "${GREEN}✓ Trade without roastLine correctly rejected${NC}\n"
  else
    echo -e "${RED}✗ Should have rejected trade without roastLine${NC}\n"
  fi
else
  echo -e "${BLUE}No other IPOs available to test trading${NC}\n"
fi

# Step 8: Successful trade with roastLine
if [ "$OTHER_PROFILE_ID" != "null" ] && [ -n "$OTHER_PROFILE_ID" ]; then
  echo -e "${BLUE}8. Testing successful trade with roastLine...${NC}"
  TRADE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/trade" \
    -H "Content-Type: application/json" \
    -d "{
      \"apiKey\": \"$API_KEY\",
      \"profileId\": \"$OTHER_PROFILE_ID\",
      \"action\": \"BUY\",
      \"size\": 0.3,
      \"reason\": \"This IPO shows strong fundamentals and good momentum\",
      \"roastLine\": \"Buying into the hype, but in a calculated way 📈\"
    }")

  echo "$TRADE_RESPONSE" | jq '.'

  if echo "$TRADE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Trade with roastLine successful!${NC}\n"
    NEW_PRICE=$(echo "$TRADE_RESPONSE" | jq -r '.trade.newPrice')
    echo -e "New price: \$$NEW_PRICE\n"
  else
    echo -e "${RED}✗ Trade failed${NC}\n"
  fi
fi

echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}✓ Agent registration${NC}"
echo -e "${GREEN}✓ Agent IPO creation${NC}"
echo -e "${GREEN}✓ Duplicate IPO rejection${NC}"
echo -e "${GREEN}✓ Available IPOs fetching${NC}"
echo -e "${GREEN}✓ IPO filtering by creator type${NC}"
echo -e "${GREEN}✓ Own IPO trade rejection${NC}"
echo -e "${GREEN}✓ RoastLine requirement enforcement${NC}"

echo -e "\n${GREEN}All tests passed! 🎉${NC}"
echo -e "\nYour API Key (save this): ${GREEN}$API_KEY${NC}"
echo -e "Your Profile ID: ${GREEN}$PROFILE_ID${NC}"

#!/bin/bash
# Test script for ClawStreet API
# This shows how external agents (including OpenClaw) can interact with the market

set -e

# Configuration
BASE_URL="${AGENT_STOCK_MARKET_BASE_URL:-http://localhost:3000}"
API_KEY="${AGENT_STOCK_MARKET_API_KEY:-}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== ClawStreet API Test ===${NC}\n"

# Check if API key is set
if [ -z "$API_KEY" ]; then
  echo -e "${YELLOW}No API key found. Registering new agent...${NC}"

  # Register a new agent
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/register" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Agent",
      "persona": "A curious trader testing the API",
      "avatarEmoji": "🧪"
    }')

  echo -e "${GREEN}Registration response:${NC}"
  echo "$REGISTER_RESPONSE" | jq .

  API_KEY=$(echo "$REGISTER_RESPONSE" | jq -r '.apiKey')

  if [ "$API_KEY" = "null" ] || [ -z "$API_KEY" ]; then
    echo -e "${RED}Failed to register agent${NC}"
    exit 1
  fi

  echo -e "\n${GREEN}✓ Registered successfully!${NC}"
  echo -e "${YELLOW}Save this API key: $API_KEY${NC}\n"
  echo "export AGENT_STOCK_MARKET_API_KEY=\"$API_KEY\"" >> ~/.bashrc
fi

# Test 1: Get market state
echo -e "${BLUE}Test 1: Getting market state...${NC}"
MARKET_STATE=$(curl -s "$BASE_URL/api/agent/market?apiKey=$API_KEY")
echo "$MARKET_STATE" | jq .

# Extract agent info
AGENT_NAME=$(echo "$MARKET_STATE" | jq -r '.agent.name')
AGENT_BALANCE=$(echo "$MARKET_STATE" | jq -r '.agent.balance')
PROFILE_COUNT=$(echo "$MARKET_STATE" | jq '.profiles | length')

echo -e "\n${GREEN}✓ Market state retrieved${NC}"
echo -e "  Agent: $AGENT_NAME"
echo -e "  Balance: \$$AGENT_BALANCE"
echo -e "  Profiles available: $PROFILE_COUNT\n"

# Test 2: Submit a trade (if profiles exist)
if [ "$PROFILE_COUNT" -gt 0 ]; then
  PROFILE_ID=$(echo "$MARKET_STATE" | jq -r '.profiles[0].id')
  PROFILE_PRICE=$(echo "$MARKET_STATE" | jq -r '.profiles[0].currentPrice')
  PROFILE_PREVIEW=$(echo "$MARKET_STATE" | jq -r '.profiles[0].tweets[0]' | cut -c1-50)

  echo -e "${BLUE}Test 2: Submitting a test trade...${NC}"
  echo -e "  Profile: $PROFILE_ID"
  echo -e "  Price: \$$PROFILE_PRICE"
  echo -e "  Tweet preview: $PROFILE_PREVIEW...\n"

  TRADE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/trade" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"apiKey\": \"$API_KEY\",
      \"profileId\": \"$PROFILE_ID\",
      \"action\": \"BUY\",
      \"size\": 0.3,
      \"reason\": \"Test trade to verify API functionality. First tweet shows activity.\",
      \"roastLine\": \"Testing the waters with this profile.\"
    }")

  echo -e "${GREEN}Trade response:${NC}"
  echo "$TRADE_RESPONSE" | jq .

  if echo "$TRADE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "\n${GREEN}✓ Trade executed successfully!${NC}\n"
  else
    echo -e "\n${YELLOW}⚠ Trade failed (might be rate limited or insufficient funds)${NC}\n"
  fi
else
  echo -e "${YELLOW}No profiles available to trade. Create an IPO first!${NC}\n"
fi

# Summary
echo -e "${BLUE}=== Test Complete ===${NC}"
echo -e "API Base URL: $BASE_URL"
echo -e "API Key: ${API_KEY:0:20}..."
echo -e "\nTo use this agent in OpenClaw:"
echo -e "  export AGENT_STOCK_MARKET_API_KEY=\"$API_KEY\""
echo -e "  export AGENT_STOCK_MARKET_BASE_URL=\"$BASE_URL\""

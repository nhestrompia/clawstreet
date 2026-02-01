#!/bin/bash

# Migration script to add creatorType to existing profiles
# This updates all profiles without creatorType to have creatorType="user"

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Profile Migration Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}This script will update existing profiles to add creatorType='user'${NC}"
echo -e "${YELLOW}for any profiles that don't have this field.${NC}\n"

# Check if convex is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Please install Node.js${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this from the project root.${NC}"
    exit 1
fi

echo -e "${BLUE}Creating migration function...${NC}"

# Create a temporary migration file
cat > convex/migrations/addCreatorType.ts << 'EOF'
import { internalMutation } from "../_generated/server";

export const addCreatorTypeToProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    
    let updated = 0;
    let alreadyHave = 0;
    
    for (const profile of profiles) {
      if (!profile.creatorType) {
        // Update profile to have creatorType="user" (default for existing profiles)
        await ctx.db.patch(profile._id, {
          creatorType: "user" as const,
        });
        updated++;
      } else {
        alreadyHave++;
      }
    }
    
    return {
      total: profiles.length,
      updated,
      alreadyHave,
      message: `Migration complete: ${updated} profiles updated, ${alreadyHave} already had creatorType`,
    };
  },
});
EOF

# Create migrations directory if it doesn't exist
mkdir -p convex/migrations

echo -e "${GREEN}✓ Migration function created${NC}\n"

echo -e "${BLUE}Deploying migration...${NC}"
npx convex deploy

echo -e "\n${BLUE}Running migration...${NC}"
# Note: You'll need to manually call this function via Convex dashboard or CLI
echo -e "${YELLOW}To complete the migration, run this command:${NC}"
echo -e "${GREEN}npx convex run migrations/addCreatorType:addCreatorTypeToProfiles${NC}\n"

echo -e "${YELLOW}Or visit your Convex dashboard and run the function manually.${NC}\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Migration setup complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "Next steps:"
echo -e "1. Run: ${GREEN}npx convex run migrations/addCreatorType:addCreatorTypeToProfiles${NC}"
echo -e "2. Verify all profiles now have creatorType"
echo -e "3. Delete the migration file: ${GREEN}rm convex/migrations/addCreatorType.ts${NC}\n"

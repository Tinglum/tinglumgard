#!/bin/bash

# =============================================================================
# Egg Integration Script
# =============================================================================
# This script automates the integration of egg3 into the main Tinglumgård app
# Run from project root: bash scripts/integrate-eggs.sh
# =============================================================================

set -e  # Exit on error

echo "🥚 Starting Egg Integration..."
echo ""

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =============================================================================
# Step 1: Copy Components
# =============================================================================

echo "${YELLOW}Step 1: Copying components...${NC}"

mkdir -p components/eggs
cp egg3/components/GlassCard.tsx components/eggs/
cp egg3/components/WeekSelector.tsx components/eggs/
cp egg3/components/QuantitySelector.tsx components/eggs/
cp egg3/components/Header.tsx components/eggs/EggHeader.tsx

echo "${GREEN}✓ Components copied${NC}"
echo ""

# =============================================================================
# Step 2: Copy Contexts
# =============================================================================

echo "${YELLOW}Step 2: Copying contexts...${NC}"

mkdir -p contexts/eggs
cp egg3/lib/cart-context.tsx contexts/eggs/EggCartContext.tsx
cp egg3/lib/order-context.tsx contexts/eggs/EggOrderContext.tsx

echo "${GREEN}✓ Contexts copied${NC}"
echo ""

# =============================================================================
# Step 3: Copy Lib Files
# =============================================================================

echo "${YELLOW}Step 3: Copying library files...${NC}"

mkdir -p lib/eggs
cp egg3/lib/mock-data.ts lib/eggs/
cp egg3/lib/types.ts lib/eggs/
cp egg3/lib/utils.ts lib/eggs/

echo "${GREEN}✓ Library files copied${NC}"
echo ""

# =============================================================================
# Step 4: Copy Pages (Already Done)
# =============================================================================

echo "${YELLOW}Step 4: Pages already copied to app/rugeegg/${NC}"
echo ""

# =============================================================================
# Step 5: Update Imports
# =============================================================================

echo "${YELLOW}Step 5: Updating imports in copied files...${NC}"

# Update import paths in components
find components/eggs -type f -name "*.tsx" -exec sed -i 's|@/lib/|@/lib/eggs/|g' {} \;
find components/eggs -type f -name "*.tsx" -exec sed -i 's|@/components/|@/components/eggs/|g' {} \;

# Update import paths in contexts
find contexts/eggs -type f -name "*.tsx" -exec sed -i 's|@/lib/|@/lib/eggs/|g' {} \;

# Update import paths in pages
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/lib/language-context|@/contexts/LanguageContext|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/lib/order-context|@/contexts/eggs/EggOrderContext|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/lib/cart-context|@/contexts/eggs/EggCartContext|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/lib/mock-data|@/lib/eggs/mock-data|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/lib/types|@/lib/eggs/types|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/lib/utils|@/lib/eggs/utils|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/components/GlassCard|@/components/eggs/GlassCard|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/components/WeekSelector|@/components/eggs/WeekSelector|g' {} \;
find app/rugeegg -type f -name "*.tsx" -exec sed -i 's|@/components/QuantitySelector|@/components/eggs/QuantitySelector|g' {} \;

echo "${GREEN}✓ Imports updated${NC}"
echo ""

# =============================================================================
# Step 6: Create API Routes
# =============================================================================

echo "${YELLOW}Step 6: Creating API route structure...${NC}"

mkdir -p app/api/eggs/breeds
mkdir -p app/api/eggs/inventory
mkdir -p app/api/eggs/orders
mkdir -p app/api/eggs/cart

echo "${GREEN}✓ API route directories created${NC}"
echo ""

# =============================================================================
# Step 7: Add Glassmorphism Styles
# =============================================================================

echo "${YELLOW}Step 7: Adding glassmorphism styles...${NC}"

# Append glassmorphism styles to globals.css
cat >> app/globals.css <<'EOF'

/* =============================================================================
   GLASSMORPHISM STYLES (Egg Product)
   ============================================================================= */

@layer utilities {
  .glass-light {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .glass-strong {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .glass-dark {
    background: rgba(245, 245, 245, 0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(229, 229, 229, 0.5);
  }

  .focus-ring {
    @apply focus:outline-none focus:ring-4 focus:ring-black/5;
  }

  .btn-primary {
    @apply px-6 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors focus-ring flex items-center justify-center gap-2;
  }

  .btn-secondary {
    @apply px-6 py-3 glass-light text-neutral-900 font-medium rounded-lg hover:glass-strong transition-all focus-ring flex items-center gap-2;
  }
}
EOF

echo "${GREEN}✓ Glassmorphism styles added${NC}"
echo ""

# =============================================================================
# Done!
# =============================================================================

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}✓ Egg Integration Complete!${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Run database migration in Supabase (see EGG_INTEGRATION_MIGRATION.sql)"
echo "2. Create API routes (see EGG_INTEGRATION_PLAN.md Phase 3)"
echo "3. Update admin panel with mode toggle"
echo "4. Test locally: npm run dev"
echo "5. Visit http://localhost:3000/rugeegg"
echo ""
echo "For detailed instructions, see: EGG_INTEGRATION_PLAN.md"
echo ""

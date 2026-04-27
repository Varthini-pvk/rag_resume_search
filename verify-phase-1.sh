#!/bin/bash

# Phase 1 Verification Script
# Checks if all Phase 1 setup is complete

echo "🔍 Phase 1 Setup Verification"
echo "════════════════════════════════════════"

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "  Node.js: $NODE_VERSION"

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "✗ package.json not found"
  exit 1
fi
echo "✓ package.json found"

# Check if tsconfig.json exists
if [ ! -f "tsconfig.json" ]; then
  echo "✗ tsconfig.json not found"
  exit 1
fi
echo "✓ tsconfig.json found"

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
  echo "✗ .env.example not found"
  exit 1
fi
echo "✓ .env.example found"

# Check core source files
echo ""
echo "✓ Checking source structure..."

REQUIRED_FILES=(
  "src/index.ts"
  "src/app.ts"
  "src/config/index.ts"
  "src/modules/shared/logger.ts"
  "src/modules/shared/errors.ts"
  "src/modules/health/interface/health.interface.ts"
  "src/modules/health/service/health.service.ts"
  "src/modules/health/controller/health.controller.ts"
  "src/modules/health/route/health.route.ts"
  "src/modules/health/health.module.ts"
  "src/modules/health/index.ts"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo "  All required source files present ✓"
else
  echo "  Missing files:"
  for file in "${MISSING_FILES[@]}"; do
    echo "    ✗ $file"
  done
  exit 1
fi

# Check if node_modules exists
echo ""
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  ✗ node_modules not found - run: npm install"
  exit 1
fi
echo "  Dependencies installed ✓"

# Check TypeScript compilation
echo ""
echo "✓ Checking TypeScript compilation..."
if npm run type-check > /dev/null 2>&1; then
  echo "  TypeScript check passed ✓"
else
  echo "  ✗ TypeScript check failed"
  npm run type-check
  exit 1
fi

# Check .env
echo ""
echo "✓ Checking environment setup..."
if [ ! -f ".env" ]; then
  echo "  ⚠ .env not found - copying from .env.example"
  cp .env.example .env
  echo "  ✓ .env created - please edit with your values"
else
  echo "  .env file exists ✓"
fi

echo ""
echo "════════════════════════════════════════"
echo "✅ Phase 1 Setup Verification Complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Run: npm run dev"
echo "  3. Test: curl http://localhost:3000/health"
echo ""

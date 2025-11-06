#!/bin/sh

# Build script for Coolify deployment
# This script ensures environment variables are available during build

echo "🔧 Starting build process..."

# Check if environment variables are set
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ Error: VITE_SUPABASE_URL is not set"
  exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_ANON_KEY is not set"
  exit 1
fi

echo "✅ Environment variables detected"
echo "📦 Building application..."

# Run the build
npm run build

echo "✅ Build complete!"

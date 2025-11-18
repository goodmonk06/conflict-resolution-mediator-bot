#!/bin/bash
set -e

echo "🚀 Setting up Conflict Resolution Mediator Bot..."
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo "⚠️  Docker is not running. Please start Docker and try again."
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start database
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd packages/backend
npm run db:generate

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

# Seed database
echo "🌱 Seeding database with demo data..."
npm run db:seed

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to packages/backend/.env"
echo "  2. (Optional) Add your OPENAI_API_KEY to enable AI detection"
echo "  3. Run 'npm run dev' to start both backend and frontend"
echo ""
echo "API will be available at: http://localhost:3000"
echo "Admin panel will be available at: http://localhost:3001"

#!/bin/bash
source .env

echo "♻️ Rebuild container..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ Rebuild selesai."
echo "🔐 Login SSH: ssh root@localhost -p $SSH_PORT"


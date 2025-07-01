#!/bin/bash
set -e
source .env

echo "🔧 Membangun dan menjalankan container..."
docker-compose up -d --build

echo "✅ Container siap."
echo "🔐 Login SSH:"
echo "    ssh root@localhost -p $SSH_PORT"
echo "    Password: $ROOT_PASSWORD"


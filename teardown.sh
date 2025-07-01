#!/bin/bash
echo "🛑 Menghentikan container..."
docker-compose down

read -p "Hapus cache build juga? (y/N): " confirm
[[ "$confirm" =~ ^[Yy]$ ]] && docker builder prune -f

echo "✅ Cleanup selesai."


#!/bin/bash
while true; do
  echo "[TUNNEL] Starting SSH tunnel to localhost.run..."
  ssh -tt -o StrictHostKeyChecking=no -o ServerAliveInterval=5 -o ServerAliveCountMax=999 -R 80:localhost:5001 nokey@localhost.run 2>&1 | while read -r line; do
    echo "$line"
    if [[ "$line" =~ (https://[a-zA-Z0-9]+\.lhr\.life) ]]; then
      URL="${BASH_REMATCH[1]}"
      echo "$URL" > active_tunnel.txt
      echo "=========================================="
      echo "ACTIVE TUNNEL URL: $URL"
      echo "=========================================="
    fi
  done
  echo "[TUNNEL] Connection closed or lost. Reconnecting in 2s..."
  sleep 2
done

#!/bin/bash
# Start both Next.js web server and BullMQ worker

# Export worker flag so diagnostics can detect it
export WORKER_PROCESS=true

# Start web server in background
npm run start:web &
WEB_PID=$!

# Start worker in background
npm run worker &
WORKER_PID=$!

# Wait for both
wait $WEB_PID $WORKER_PID

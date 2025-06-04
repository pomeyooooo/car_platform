#!/bin/bash

echo "Starting Car Platform Servers..."

# Start backend server
echo "Starting backend server on port 3000..."
cd back_end
nohup npm start > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server on port 3001..."
cd ../front_end/my-app
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

echo ""
echo "Both servers are now starting..."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:3001"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Logs:"
echo "Backend: back_end/backend.log"
echo "Frontend: front_end/my-app/frontend.log"
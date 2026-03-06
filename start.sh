#!/bin/bash

# ==========================================
#  ___  __    __  __   ____   __  __  __  ____   ____   _____  ____ 
# |  |/  /   |  ||  | |  _ \ |  ||  |/ / |  __| |  _ \ /  ___||  __|
# |   - <    |  ||  | | |_) ||  ||    /  | |__  | |_) |\ `--. | |__ 
# |  |\  \   |  ||  | |  _ < |  ||    \  |  __| |  _ <  `--. \|  __|
# |  | \  \  |  \/  | | |_) ||  ||  |\ \ | |__  | | \ \/\__/ /| |__ 
# |__|  \__\  \____/  |____/ |__||__| \_\|____| |__\_\ \____/ |____|
#                                                                   
#  _____   ____   _____  _______   ___   _     
# |  _  \ / __ \ |  _  \|__   __| /   | | |    
# | |_) | |  | | | |_) |   | |   / /| | | |    
# |  ___/ |  | | |  _ <    | |  / /_| | | |    
# | |     |  \/  | | \ \   | | /  __  | | |___ 
# |_|      \____/|_|  \_\  |_|/_/   |_| |_____|
#
#        Kubiverse Portal - Boot Script
# ==========================================

echo -e "\n\e[32m[+] Starting Kubiverse Portal...\e[0m"

# 1. Start Docker Containers (Database 12002 & pgAdmin 12003)
echo -e "\e[34m[>] Starting Docker Compose (Database & pgAdmin)...\e[0m"
docker-compose up -d
if [ $? -eq 0 ]; then
    echo -e "\e[32m[+] Database running on port 12002\e[0m"
    echo -e "\e[32m[+] pgAdmin running on port 12003\e[0m"
else
    echo -e "\e[31m[-] Failed to start Docker Compose. Please check docker-compose.yml\e[0m"
    exit 1
fi

echo -e "\n\e[33m[*] Waiting for PostgreSQL to be ready...\e[0m"
until docker exec kubiverse-portal-db pg_isready -U root > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e "\n\e[32m[+] PostgreSQL is ready!\e[0m"

# 2. Start Server (Port 12001)
echo -e "\n\e[34m[>] Starting Spring Boot Server (Backend)...\e[0m"
if [ -d "server" ]; then
    cd server
    # Run in background to not block the script, logging to server.log
    ./gradlew bootRun > ../server.log 2>&1 &
    SERVER_PID=$!
    echo -e "\e[32m[+] Server starting on port 12001 (PID: $SERVER_PID)\e[0m"
    cd ..
else
    echo -e "\e[31m[-] Server directory not found!\e[0m"
fi

# 3. Start Client (Port 12000)
echo -e "\n\e[34m[>] Starting React Client (Frontend)...\e[0m"
if [ -d "portal" ]; then
    cd portal
    if [ ! -d "node_modules" ]; then
        echo -e "\e[33m[*] Installing client dependencies...\e[0m"
        npm install
    fi
    # Wait for vite to output to client.log
    npm run dev -- --port 12000 > ../client.log 2>&1 &
    CLIENT_PID=$!
    echo -e "\e[32m[+] Client starting on port 12000 (PID: $CLIENT_PID)\e[0m"
    cd ..
else
    echo -e "\e[33m[-] Client directory not found. Skipping frontend startup.\e[0m"
fi

# 4. Start Mock Server (Port 12004)
echo -e "\n\e[34m[>] Starting ArgoCD Mock Server...\e[0m"
if [ -d "mock" ]; then
    cd mock
    if [ ! -d "node_modules" ]; then
        echo -e "\e[33m[*] Installing mock dependencies...\e[0m"
        npm install
    fi
    node server.js > ../mock.log 2>&1 &
    MOCK_PID=$!
    echo -e "\e[32m[+] Mock Server starting on port 12004 (PID: $MOCK_PID)\e[0m"
    cd ..
else
    echo -e "\e[33m[-] Mock directory not found. Skipping mock server startup.\e[0m"
fi

echo -e "\n\e[32m[+] ==========================================\e[0m"
echo -e "\e[32m[+] Start Process Complete!\e[0m"
echo -e "\e[32m[+] App is booting up in the background.\e[0m"
echo -e "\e[32m[+] View server logs: tail -f server.log\e[0m"
echo -e "\e[32m[+] View client logs: tail -f client.log\e[0m"
echo -e "\e[32m[+] ==========================================\e[0m"

# ==========================================
# Shutdown Trap Setup
# ==========================================

cleanup() {
    echo -e "\n\e[33m[*] Stopping Kubiverse Portal gracefully...\e[0m"
    if [ -n "$SERVER_PID" ]; then
        echo -e "\e[34m[>] Stopping Server (PID: $SERVER_PID)...\e[0m"
        kill -TERM $SERVER_PID 2>/dev/null
    fi
    if [ -n "$CLIENT_PID" ]; then
        echo -e "\e[34m[>] Stopping Client (PID: $CLIENT_PID)...\e[0m"
        kill -TERM $CLIENT_PID 2>/dev/null
    fi
    if [ -n "$MOCK_PID" ]; then
        echo -e "\e[34m[>] Stopping Mock Server (PID: $MOCK_PID)...\e[0m"
        kill -TERM $MOCK_PID 2>/dev/null
    fi
    # Optional: uncomment to also stop docker-compose on quit
    # echo -e "\e[34m[>] Stopping Docker Compose...\e[0m"
    # docker-compose stop
    echo -e "\e[32m[+] All processes stopped.\e[0m"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "\e[33m[*] Press Ctrl+C to stop the services.\e[0m"

# Block script execution and wait for processes
wait

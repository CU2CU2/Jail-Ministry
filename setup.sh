#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  Jail Ministry — one-command local dev setup
#  Usage:  bash setup.sh
# ─────────────────────────────────────────────────────────────────
set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

info()    { echo -e "${GREEN}✔ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
err()     { echo -e "${RED}✖ $*${NC}"; exit 1; }
section() { echo -e "\n${BOLD}── $* ──${NC}"; }

# ── 1. Prerequisites ─────────────────────────────────────────────
section "Checking prerequisites"

command -v node >/dev/null 2>&1 || err "Node.js not found. Install Node 18+ from https://nodejs.org"
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
[ "$NODE_MAJOR" -ge 18 ] || err "Node.js 18+ required (found $NODE_MAJOR)"
info "Node $(node --version)"

command -v npm >/dev/null 2>&1 || err "npm not found"
info "npm $(npm --version)"

if command -v docker >/dev/null 2>&1; then
  HAVE_DOCKER=true
  info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
  HAVE_DOCKER=false
  warn "Docker not found — you'll need to supply your own PostgreSQL instance"
fi

# ── 2. Environment variables ─────────────────────────────────────
section "Environment variables"

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a random AUTH_SECRET
  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -base64 32)
    # Replace the placeholder in .env
    sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"$SECRET\"|" .env
  fi
  info "Created .env from .env.example (AUTH_SECRET auto-generated)"
else
  info ".env already exists — skipping"
fi

# ── 3. Database ──────────────────────────────────────────────────
section "Database"

if [ "$HAVE_DOCKER" = true ]; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "jail_ministry_db"; then
    info "PostgreSQL container already running"
  else
    echo "Starting PostgreSQL via Docker Compose..."
    docker compose up -d 2>/dev/null || docker-compose up -d
    echo "Waiting for PostgreSQL to be ready..."
    for i in $(seq 1 15); do
      if docker exec jail_ministry_db pg_isready -U jail_ministry >/dev/null 2>&1; then
        info "PostgreSQL ready"
        break
      fi
      sleep 1
      [ "$i" -eq 15 ] && err "PostgreSQL didn't start in time"
    done
  fi
else
  warn "Skipping Docker step — make sure DATABASE_URL in .env points to a running PostgreSQL instance"
fi

# ── 4. Install dependencies ──────────────────────────────────────
section "Installing dependencies"

npm install
info "Dependencies installed"

# ── 5. Push schema & seed ────────────────────────────────────────
section "Database schema & seed"

npm run db:push
info "Schema pushed"

npm run db:seed
info "Database seeded"

# ── 6. Done — start dev server ───────────────────────────────────
section "Starting development server"

echo ""
echo -e "${BOLD}Setup complete! Starting the app...${NC}"
echo ""
echo -e "  URL:      ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "  ${BOLD}Test accounts:${NC}"
echo -e "  Super Admin   →  admin@jailministry.org  /  Admin1234!"
echo -e "  Douglas Coord →  douglas@jailministry.org  /  Coord1234!"
echo -e "  Sarpy Coord   →  sarpy@jailministry.org  /  Coord1234!"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop the server."
echo ""

npm run dev

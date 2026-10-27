@echo off
title Guardians Guild Bot
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install from https://nodejs.org then try again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Missing .env file.
  echo Copy .env.example to .env and fill DISCORD_TOKEN, GUILD_ID, CLIENT_ID.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting GuardiansGuildX...
echo Keep this window open while the bot should stay online.
echo Close the window or press Ctrl+C to stop.
echo.

call npm run dev
echo.
echo Bot stopped.
pause

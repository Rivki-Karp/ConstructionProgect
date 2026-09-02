# Building Rehabilitation Management System - Startup Script
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   מערכת שיקום מבנים - Building Rehab System" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Seed DB if not exists
$dbPath = ".\backend\database\rehab.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "Seeding database..." -ForegroundColor Yellow
    Push-Location ".\backend"
    node database/seed.js
    Pop-Location
    Write-Host "Database ready!" -ForegroundColor Green
}

Write-Host "Starting Backend  -> http://localhost:3001" -ForegroundColor Green
Write-Host "Starting Frontend -> http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor Yellow
Write-Host "  Ministry:   ministry_admin / ministry123" -ForegroundColor White
Write-Host "  Haifa Muni: muni_haifa / haifa123" -ForegroundColor White
Write-Host "  Appraiser:  appraiser1 / appraiser123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop." -ForegroundColor Gray
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$PWD\backend'; Write-Host 'Backend Starting...' -ForegroundColor Green; node server.js`""

# Wait a moment then start frontend
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$PWD\frontend'; Write-Host 'Frontend Starting...' -ForegroundColor Cyan; npm run dev`""

Write-Host "Both servers launched! Open http://localhost:3000 in your browser." -ForegroundColor Cyan

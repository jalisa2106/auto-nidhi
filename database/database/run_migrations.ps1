param (
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString
)

Write-Host "Running PostgreSQL migrations using Docker..." -ForegroundColor Cyan

# Mount the current directory into the postgres docker container and execute init.sql
docker run --rm -v "$($PWD.Path):/workspace" -w /workspace postgres psql "$ConnectionString" -f init.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migrations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "There was an error running the migrations." -ForegroundColor Red
}

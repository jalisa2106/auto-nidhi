# AutoNidhi — Run pending migrations 022-028 against Neon DB
# Usage: Called internally by the agent. Safe to re-run (all statements are idempotent).

$ErrorActionPreference = "Stop"
$DSN = "postgresql://neondb_owner:npg_NeCdrFtvj0x6@ep-plain-flower-aoqt25ev-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
$MigrationDir = $PSScriptRoot

$migrations = @(
    "022_customer_staff_allocation.sql",
    "023_bank_account_fields.sql",
    "024_notification_prefs_noop.sql",
    "025_user_soft_delete.sql",
    "026_modification_request_statuses.sql",
    "027_service_requests_staff_notes.sql",
    "028_customer_document_review.sql"
)

$allOk = $true

foreach ($file in $migrations) {
    $fullPath = Join-Path $MigrationDir $file
    Write-Host "`n▶ Running: $file" -ForegroundColor Cyan

    $result = & psql $DSN -f $fullPath 2>&1
    $exitCode = $LASTEXITCODE

    Write-Host $result

    if ($exitCode -ne 0) {
        Write-Host "❌ FAILED: $file (exit code $exitCode)" -ForegroundColor Red
        $allOk = $false
        break
    } else {
        Write-Host "✅ OK: $file" -ForegroundColor Green
    }
}

if ($allOk) {
    Write-Host "`n✅ All migrations completed successfully." -ForegroundColor Green
} else {
    Write-Host "`n❌ Migration run stopped due to error. Fix the issue and re-run." -ForegroundColor Red
    exit 1
}

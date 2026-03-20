# Faculty Portal — Production Deployment Script
# Run this once to configure secrets and deploy

param(
  [string]$AdminUser = "",
  [string]$AdminPass = "",
  [string]$JwtSecret = ""
)

Write-Host "🔐 Faculty Portal — Secure Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Auto-generate JWT secret if not provided
if (-not $JwtSecret) {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
  $JwtSecret = [BitConverter]::ToString($bytes).Replace("-","").ToLower()
  Write-Host "✅ Auto-generated JWT secret" -ForegroundColor Green
}

if (-not $AdminUser) {
  $AdminUser = Read-Host "Enter admin username"
}
if (-not $AdminPass) {
  $AdminPass = Read-Host "Enter admin password (min 8 chars)" -AsSecureString
  $AdminPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPass)
  )
}

if ($AdminPass.Length -lt 8) {
  Write-Host "❌ Password must be at least 8 characters" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "📦 Setting Firebase environment variables..." -ForegroundColor Yellow

# Set secrets in Firebase Functions config
firebase functions:config:set `
  app.jwt_secret="$JwtSecret" `
  app.admin_user="$AdminUser" `
  app.admin_pass="$AdminPass"

Write-Host "✅ Secrets configured in Firebase" -ForegroundColor Green

# Create local .env for functions (for emulator use)
$envContent = "JWT_SECRET=$JwtSecret`nADMIN_USER=$AdminUser`nADMIN_PASS=$AdminPass"
$envContent | Out-File -FilePath "functions/.env" -Encoding utf8
Write-Host "✅ Created functions/.env for local emulator" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Yellow

# Deploy functions + firestore rules + indexes
firebase deploy --only functions,firestore:rules,firestore:indexes

Write-Host ""
Write-Host "🎨 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
Set-Location ..

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Admin login: $AdminUser" -ForegroundColor Cyan
Write-Host "⚠️  Save your password securely — it won't be shown again" -ForegroundColor Yellow
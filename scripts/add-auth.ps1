# Adds requireAuth to all API route files
$base = "C:\Users\User\Desktop\classroom\src\app\api"

# Define auth rules: [file, method, roles]
$rules = @(
  # academic-groups
  @("academic-groups\route.ts", "GET", 'any', 'no-param'),
  @("academic-groups\route.ts", "POST", 'admin', ''),
  @("academic-groups\[id]\route.ts", "PATCH", 'admin', ''),
  @("academic-groups\[id]\route.ts", "DELETE", 'admin', ''),
  # assignments
  @("assignments\route.ts", "GET", 'any', ''),
  @("assignments\route.ts", "POST", 'teacher', ''),
  @("assignments\[id]\route.ts", "PATCH", 'teacher', ''),
  @("assignments\[id]\route.ts", "DELETE", 'admin', ''),
  # attachments
  @("attachments\route.ts", "GET", 'any', ''),
  @("attachments\route.ts", "POST", 'any', ''),
  @("attachments\[id]\route.ts", "PATCH", 'any', ''),
  @("attachments\[id]\route.ts", "DELETE", 'any', ''),
  # audit-logs
  @("audit-logs\route.ts", "GET", 'admin', ''),
  @("audit-logs\route.ts", "POST", 'any', ''),
  @("audit-logs\[id]\route.ts", "GET", 'admin', ''),
  # classes
  @("classes\route.ts", "GET", 'any', 'no-param'),
  @("classes\route.ts", "POST", 'teacher', ''),
  @("classes\[id]\route.ts", "PATCH", 'teacher', ''),
  @("classes\[id]\route.ts", "DELETE", 'admin', ''),
  # comments
  @("comments\route.ts", "GET", 'any', ''),
  @("comments\route.ts", "POST", 'any', ''),
  @("comments\[id]\route.ts", "PATCH", 'any', ''),
  @("comments\[id]\route.ts", "DELETE", 'any', ''),
  # cycles
  @("cycles\route.ts", "GET", 'any', 'no-param'),
  @("cycles\route.ts", "POST", 'admin', ''),
  @("cycles\[id]\route.ts", "PATCH", 'admin', ''),
  @("cycles\[id]\route.ts", "DELETE", 'admin', 'no-request'),
  # enrollments
  @("enrollments\route.ts", "GET", 'any', ''),
  @("enrollments\route.ts", "POST", 'admin', ''),
  @("enrollments\[id]\route.ts", "PATCH", 'admin', ''),
  @("enrollments\[id]\route.ts", "DELETE", 'admin', ''),
  # file-assets
  @("file-assets\route.ts", "GET", 'any', 'no-param'),
  @("file-assets\[id]\route.ts", "DELETE", 'any', ''),
  # notifications
  @("notifications\route.ts", "GET", 'any', ''),
  @("notifications\route.ts", "POST", 'any', ''),
  @("notifications\[id]\route.ts", "PATCH", 'any', ''),
  @("notifications\read-all\route.ts", "POST", 'any', ''),
  # posts
  @("posts\route.ts", "GET", 'any', ''),
  @("posts\route.ts", "POST", 'teacher', ''),
  @("posts\[id]\route.ts", "PATCH", 'teacher', ''),
  @("posts\[id]\route.ts", "DELETE", 'teacher', ''),
  # semesters
  @("semesters\route.ts", "GET", 'any', 'no-param'),
  @("semesters\route.ts", "POST", 'admin', ''),
  @("semesters\[id]\route.ts", "PATCH", 'admin', ''),
  @("semesters\[id]\route.ts", "DELETE", 'admin', 'no-request'),
  # subjects
  @("subjects\route.ts", "GET", 'any', 'no-param'),
  @("subjects\route.ts", "POST", 'admin', ''),
  @("subjects\[id]\route.ts", "PATCH", 'admin', ''),
  @("subjects\[id]\route.ts", "DELETE", 'admin', ''),
  # submissions
  @("submissions\route.ts", "GET", 'any', ''),
  @("submissions\route.ts", "POST", 'student', ''),
  @("submissions\[id]\route.ts", "GET", 'any', ''),
  @("submissions\[id]\grade\route.ts", "GET", 'any', ''),
  @("submissions\[id]\grade\route.ts", "POST", 'teacher', ''),
  @("submissions\[id]\grade\route.ts", "PATCH", 'teacher', ''),
  @("submissions\[id]\versions\route.ts", "POST", 'student', ''),
  @("submissions\[id]\corrections\route.ts", "GET", 'teacher', ''),
  @("submissions\[id]\corrections\route.ts", "POST", 'teacher', ''),
  @("submissions\[id]\corrections\[reqId]\route.ts", "PATCH", 'teacher', ''),
  # teaching-assignments
  @("teaching-assignments\route.ts", "GET", 'any', ''),
  @("teaching-assignments\route.ts", "POST", 'admin', ''),
  @("teaching-assignments\[id]\route.ts", "PATCH", 'admin', ''),
  @("teaching-assignments\[id]\route.ts", "DELETE", 'admin', ''),
  # upload
  @("upload\route.ts", "POST", 'any', '')
)

function Get-RoleGuard($role) {
  if ($role -eq 'any') { return '' }
  if ($role -eq 'teacher') { return ', ["admin", "teacher"]' }
  if ($role -eq 'student') { return ', ["admin", "teacher", "student"]' }
  if ($role -eq 'admin') { return ', ["admin"]' }
  return ''
}

$importAdded = @{}

foreach ($rule in $rules) {
  $file = $rule[0]
  $method = $rule[1]
  $role = $rule[2]
  $flags = $rule[3]
  
  $fullPath = Join-Path $base $file
  if (-not (Test-Path $fullPath)) {
    Write-Warning "File not found: $fullPath"
    continue
  }
  
  $content = Get-Content $fullPath -Raw
  
  # Add import if not already added for this file
  if (-not $importAdded[$file]) {
    if ($content -notmatch "require-auth") {
      $content = $content -replace '^(import .+?;\r?\n)(?=import|\r?\n|export)', "`$1import { requireAuth } from ""@/lib/require-auth"";`r`n"
    }
    $importAdded[$file] = $true
  }
  
  # Build regex for the handler
  $roleGuard = Get-RoleGuard $role
  
  if ($method -eq "GET" -or $method -eq "POST" -or $method -eq "PATCH" -or $method -eq "DELETE") {
    # Handle different function signatures
    
    if ($flags -eq 'no-param') {
      # Function has no request param: export async function GET() {
      $pattern = "(?s)(export async function $method\(\)\s*\{[\r\n]+\s*try\s*\{)"
      $replacement = "`$1`r`n    const auth = await requireAuth(request$roleGuard);`r`n    if (auth.error) return auth.error;"
      # But we also need to add the request param
      
      if ($content -match "export async function $method\(\)") {
        $content = $content -replace "export async function $method\(\)", "export async function $method(request: NextRequest)"
        # Now add auth check
        $pattern2 = "(?s)(export async function $method\(request: NextRequest\)\s*\{[\r\n]+\s*try\s*\{)"
        $replacement2 = "`$1`r`n    const auth = await requireAuth(request$roleGuard);`r`n    if (auth.error) return auth.error;"
        $content = $content -replace $pattern2, $replacement2
      }
    } elseif ($flags -eq 'no-request') {
      # Function has _request param: export async function DELETE(_request: NextRequest, { params }) {
      $content = $content -replace "(_request: NextRequest)", "request: NextRequest"
      # Now add auth
      $pattern2 = "(?s)(export async function $method\(request: NextRequest[^)]*\)\s*\{[\r\n]+\s*try\s*\{)"
      $replacement2 = "`$1`r`n    const auth = await requireAuth(request$roleGuard);`r`n    if (auth.error) return auth.error;"
      $content = $content -replace $pattern2, $replacement2
    } else {
      # Normal: export async function $method(request: NextRequest)
      $pattern = "(?s)(export async function $method\(request: NextRequest[^)]*\)\s*\{[\r\n]+\s*try\s*\{)"
      $replacement = "`$1`r`n    const auth = await requireAuth(request$roleGuard);`r`n    if (auth.error) return auth.error;"
      $content = $content -replace $pattern, $replacement
    }
  }
  
  # Handle special cases for upload route (it already has token reading)
  if ($file -eq "upload\route.ts" -and $method -eq "POST") {
    # Upload route already reads session but doesn't enforce auth
    # We already handled it above with the general pattern
  }
  
  Set-Content $fullPath $content -NoNewline
  Write-Host "Updated: $file - $method ($role)"
}

Write-Host "`nDone! All route files updated."

param()

$base = "C:\Users\User\Desktop\classroom\src\app\api"

# Files with [id] brackets need -LiteralPath
$rules = @(
  @{ File = "academic-groups/[id]/route.ts"; Method = "PATCH"; Roles = 'admin'; Flags = '' }
  @{ File = "academic-groups/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = '' }
  @{ File = "assignments/[id]/route.ts"; Method = "PATCH"; Roles = 'teacher'; Flags = '' }
  @{ File = "assignments/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = '' }
  @{ File = "attachments/[id]/route.ts"; Method = "PATCH"; Roles = 'any'; Flags = '' }
  @{ File = "attachments/[id]/route.ts"; Method = "DELETE"; Roles = 'any'; Flags = '' }
  @{ File = "audit-logs/[id]/route.ts"; Method = "GET"; Roles = 'admin'; Flags = '' }
  @{ File = "classes/[id]/route.ts"; Method = "PATCH"; Roles = 'teacher'; Flags = '' }
  @{ File = "classes/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = '' }
  @{ File = "comments/[id]/route.ts"; Method = "PATCH"; Roles = 'any'; Flags = '' }
  @{ File = "comments/[id]/route.ts"; Method = "DELETE"; Roles = 'any'; Flags = '' }
  @{ File = "cycles/[id]/route.ts"; Method = "PATCH"; Roles = 'admin'; Flags = '' }
  @{ File = "cycles/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = 'no-request' }
  @{ File = "enrollments/[id]/route.ts"; Method = "PATCH"; Roles = 'admin'; Flags = '' }
  @{ File = "enrollments/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = '' }
  @{ File = "file-assets/[id]/route.ts"; Method = "DELETE"; Roles = 'any'; Flags = '' }
  @{ File = "notifications/[id]/route.ts"; Method = "PATCH"; Roles = 'any'; Flags = '' }
  @{ File = "posts/[id]/route.ts"; Method = "PATCH"; Roles = 'teacher'; Flags = '' }
  @{ File = "posts/[id]/route.ts"; Method = "DELETE"; Roles = 'teacher'; Flags = '' }
  @{ File = "semesters/[id]/route.ts"; Method = "PATCH"; Roles = 'admin'; Flags = '' }
  @{ File = "semesters/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = 'no-request' }
  @{ File = "subjects/[id]/route.ts"; Method = "PATCH"; Roles = 'admin'; Flags = '' }
  @{ File = "subjects/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = '' }
  @{ File = "submissions/[id]/route.ts"; Method = "GET"; Roles = 'any'; Flags = '' }
  @{ File = "submissions/[id]/grade/route.ts"; Method = "GET"; Roles = 'any'; Flags = '' }
  @{ File = "submissions/[id]/grade/route.ts"; Method = "POST"; Roles = 'teacher'; Flags = '' }
  @{ File = "submissions/[id]/grade/route.ts"; Method = "PATCH"; Roles = 'teacher'; Flags = '' }
  @{ File = "submissions/[id]/versions/route.ts"; Method = "POST"; Roles = 'student'; Flags = '' }
  @{ File = "submissions/[id]/corrections/route.ts"; Method = "GET"; Roles = 'teacher'; Flags = '' }
  @{ File = "submissions/[id]/corrections/route.ts"; Method = "POST"; Roles = 'teacher'; Flags = '' }
  @{ File = "submissions/[id]/corrections/[reqId]/route.ts"; Method = "PATCH"; Roles = 'teacher'; Flags = '' }
  @{ File = "teaching-assignments/[id]/route.ts"; Method = "PATCH"; Roles = 'admin'; Flags = '' }
  @{ File = "teaching-assignments/[id]/route.ts"; Method = "DELETE"; Roles = 'admin'; Flags = '' }
)

function Get-RoleGuard($role) {
  if ($role -eq 'any') { return '' }
  if ($role -eq 'teacher') { return ', ["admin", "teacher"]' }
  if ($role -eq 'student') { return ', ["admin", "teacher", "student"]' }
  if ($role -eq 'admin') { return ', ["admin"]' }
  return ''
}

$lastFile = ""
$content = ""

foreach ($rule in $rules) {
  $file = $rule.File
  $method = $rule.Method
  $role = $rule.Roles
  $flags = $rule.Flags
  
  $fullPath = Join-Path -Path $base -ChildPath $file
  
  if (-not (Test-Path -LiteralPath $fullPath)) {
    Write-Warning "NOT FOUND: $fullPath"
    continue
  }
  
  # Only read file when it changes
  if ($file -ne $lastFile) {
    $content = Get-Content -LiteralPath $fullPath -Raw
  }
  
  $roleGuard = Get-RoleGuard $role
  
  # Add import if not present
  if ($file -ne $lastFile -and $content -notmatch "require-auth") {
    if ($content -match '^(import .+?;\r?\n)(?=import|\r?\n|export)') {
      $content = $content -replace '^(import .+?;\r?\n)(?=import|\r?\n|export)', "`$1import { requireAuth } from ""@/lib/require-auth"";`r`n"
    } elseif ($content -match '^(import .+?;\n)(?=import|\n|export)') {
      $content = $content -replace '^(import .+?;\n)(?=import|\n|export)', "`$1import { requireAuth } from ""@/lib/require-auth"";`n"
    }
  }
  
  if ($flags -eq 'no-request') {
    $content = $content -replace "_request: NextRequest", "request: NextRequest"
  }
  
  # Build pattern for the handler
  $handlerPattern = "(?s)(export async function $method\(request: NextRequest[^)]*\)\s*\{[\r\n]+\s*try\s*\{)"
  $replacement = "`$1`r`n    const auth = await requireAuth(request$roleGuard);`r`n    if (auth.error) return auth.error;"
  $content = $content -replace $handlerPattern, $replacement
  
  # Write file when changing to new file or at end
  if ($file -ne $lastFile -and $lastFile -ne "") {
    Set-Content -LiteralPath (Join-Path -Path $base -ChildPath $lastFile) $content -NoNewline
    Write-Host "Written: $lastFile"
  }
  
  $lastFile = $file
}

# Write the last file
if ($lastFile -ne "") {
  Set-Content -LiteralPath (Join-Path -Path $base -ChildPath $lastFile) $content -NoNewline
  Write-Host "Written: $lastFile"
}

Write-Host "`nDone!"

$pass = 0; $fail = 0

function Test($name, $ok, $detail) {
    if ($ok) { Write-Host "  PASS  $name" -ForegroundColor Green; $global:pass++ }
    else {
        $msg = if ($detail) { "  FAIL  $name -- $detail" } else { "  FAIL  $name" }
        Write-Host $msg -ForegroundColor Red
        $global:fail++
    }
}

function Get-Worker($url) {
    $wc = New-Object System.Net.WebClient
    try { return $wc.DownloadString($url) } catch { return $null }
}

function Post-Worker($url, $body) {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("Content-Type", "application/json")
    try { return $wc.UploadString($url, "POST", $body) }
    catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        $stream = $resp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        return "HTTP_ERROR:$([int]$resp.StatusCode):$($reader.ReadToEnd())"
    }
}

# 1. HEALTH CHECKS
Write-Host "`n=== 1. Worker Health Checks ===" -ForegroundColor Cyan

$qwenHealth = Get-Worker "https://qwen-coder-worker.alexdevriesxing.workers.dev/"
Test "Qwen worker GET 200" ($qwenHealth -ne $null)

$fluxHealth = Get-Worker "https://flux-image-worker.alexdevriesxing.workers.dev/"
Test "Flux worker GET 200" ($fluxHealth -ne $null)

$minimaxHealth = Get-Worker "https://minimax-music-worker.alexdevriesxing.workers.dev/"
Test "Minimax worker GET 200" ($minimaxHealth -ne $null)

$qwenJson = $qwenHealth | ConvertFrom-Json
Test "Qwen worker uses OpenRouter waterfall" ($qwenJson.model -match "qwen3-coder")

$minimaxJson = $minimaxHealth | ConvertFrom-Json
Test "Minimax worker reports BYOK status" ($minimaxJson.byok -ne $null)
Write-Host "    Minimax BYOK configured: $($minimaxJson.byok)" -ForegroundColor Gray

# 2. QWEN CODING RESPONSE
Write-Host "`n=== 2. Qwen Worker -- Coding Response ===" -ForegroundColor Cyan

$qwenBody = '{"messages":[{"role":"system","content":"You are a coding assistant. Be concise."},{"role":"user","content":"Write a one-line TypeScript arrow function that adds two numbers."}],"max_tokens":100}'
$qwenResult = Post-Worker "https://qwen-coder-worker.alexdevriesxing.workers.dev/" $qwenBody

if ($qwenResult -match "HTTP_ERROR") {
    Test "Qwen POST returns code" $false $qwenResult
} else {
    $qwenJson2 = $qwenResult | ConvertFrom-Json
    $content = $qwenJson2.choices[0].message.content
    $modelUsed = if ($qwenJson2._sakura_model_used) { $qwenJson2._sakura_model_used } else { $qwenJson2.model }
    Test "Qwen POST returns content" ($content -ne $null -and $content.Length -gt 0)
    Test "Qwen POST finish_reason stop" ($qwenJson2.choices[0].finish_reason -eq "stop")
    Write-Host "    Model served by: $modelUsed" -ForegroundColor Gray
    Write-Host "    Response: $($content.Substring(0, [Math]::Min(120, $content.Length)))" -ForegroundColor Gray
}

# 3. QWEN STREAMING
Write-Host "`n=== 3. Qwen Worker -- SSE Streaming ===" -ForegroundColor Cyan

$streamBody = '{"messages":[{"role":"user","content":"Say hi."}],"max_tokens":30,"stream":true}'
$streamResult = Post-Worker "https://qwen-coder-worker.alexdevriesxing.workers.dev/" $streamBody

if ($streamResult -match "HTTP_ERROR") {
    Test "Qwen streaming returns SSE" $false $streamResult
} else {
    Test "Qwen streaming returns data: lines" ($streamResult -match "data:")
    Test "Qwen streaming has delta content" ($streamResult -match "delta")
    Write-Host "    First 150 chars: $($streamResult.Substring(0, [Math]::Min(150, $streamResult.Length)))" -ForegroundColor Gray
}

# 4. FLUX IMAGE
Write-Host "`n=== 4. Flux Worker -- Image Generation ===" -ForegroundColor Cyan

$fluxBody = '{"prompt":"a simple red circle on white background","num_steps":1}'
$fluxResult = Post-Worker "https://flux-image-worker.alexdevriesxing.workers.dev/" $fluxBody

if ($fluxResult -match "HTTP_ERROR") {
    Test "Flux POST returns image" $false $fluxResult
} else {
    $fluxJson = $fluxResult | ConvertFrom-Json
    Test "Flux returns image field" ($fluxJson.image -ne $null)
    $imgPrefix = "data:image/png;base64,"
    Test "Flux image is data URI" ($fluxJson.image -and $fluxJson.image.StartsWith($imgPrefix))
    $imgLen = if ($fluxJson.image) { $fluxJson.image.Length } else { 0 }
    Test "Flux image has content (>1000 chars)" ($imgLen -gt 1000)
    Write-Host "    Image data length: $imgLen chars" -ForegroundColor Gray
}

# 5. MINIMAX MUSIC
Write-Host "`n=== 5. Minimax Worker -- Music Generation ===" -ForegroundColor Cyan

$minimaxBody = '{"prompt":"calm lo-fi beat","is_instrumental":true,"format":"mp3"}'
$minimaxResult = Post-Worker "https://minimax-music-worker.alexdevriesxing.workers.dev/" $minimaxBody

if ($minimaxResult -match "HTTP_ERROR:503") {
    Test "Minimax 503 (BYOK key not set -- expected)" $true
    Write-Host "    Set MINIMAX_API_KEY secret to enable audio generation" -ForegroundColor Yellow
} elseif ($minimaxResult -match "HTTP_ERROR") {
    Test "Minimax POST" $false $minimaxResult
} else {
    $minimaxJson2 = $minimaxResult | ConvertFrom-Json
    if ($minimaxJson2.error) {
        Test "Minimax returns BYOK error message" ($minimaxJson2.error -match "API key")
        Write-Host "    $($minimaxJson2.error)" -ForegroundColor Yellow
    } else {
        Test "Minimax returns audio field" ($minimaxJson2.audio -ne $null)
        Test "Minimax audio is data URI" ($minimaxJson2.audio -match "^data:audio")
        Write-Host "    Audio data length: $($minimaxJson2.audio.Length) chars" -ForegroundColor Gray
    }
}

# 6. UNIT TESTS
Write-Host "`n=== 6. Unit Tests (Vitest) ===" -ForegroundColor Cyan
$testOutput = & npm test 2>&1 | Out-String
$testPassed = $testOutput -match "Tests\s+\d+ passed"
$testFailed = $testOutput -match "\d+ failed"
Test "All unit tests pass" ($testPassed -and -not $testFailed)
if ($testOutput -match "(\d+) passed") { Write-Host "    $($Matches[0]) tests passed" -ForegroundColor Gray }

# 7. TYPECHECK
Write-Host "`n=== 7. TypeScript Typecheck ===" -ForegroundColor Cyan
$null = & npm run typecheck 2>&1
Test "TypeScript typecheck clean" ($LASTEXITCODE -eq 0)

# 8. FRONTEND BUILD
Write-Host "`n=== 8. Frontend Build ===" -ForegroundColor Cyan
$buildOutput = & npm run build 2>&1 | Out-String
Test "Frontend builds without errors" ($LASTEXITCODE -eq 0)
if ($buildOutput -match "built in [\d.]+") { Write-Host "    $($Matches[0])" -ForegroundColor Gray }

# SUMMARY
Write-Host "`n========================================" -ForegroundColor White
$total = $pass + $fail
$color = if ($fail -eq 0) { "Green" } else { "Yellow" }
Write-Host "  RESULTS: $pass/$total passed" -ForegroundColor $color
if ($fail -gt 0) { Write-Host "  $fail test(s) failed -- review above" -ForegroundColor Red }
Write-Host "========================================`n" -ForegroundColor White
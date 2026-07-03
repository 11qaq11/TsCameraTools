# TsCameraTools 自动化测试脚本
# 用法: .\scripts\test.ps1

Write-Host "=== TsCameraTools 自动化测试 ===" -ForegroundColor Cyan
Write-Host ""

# 测试结果
$results = @()

function Test-Result {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $color = if ($Passed) { "Green" } else { "Red" }
    
    Write-Host "[$status] $TestName" -ForegroundColor $color
    if ($Details) {
        Write-Host "  $Details" -ForegroundColor Gray
    }
    
    $results += [PSCustomObject]@{
        Test = $TestName
        Status = $status
        Details = $Details
    }
}

# T003: 检查日志目录
Write-Host "`n--- T003: 日志目录检查 ---" -ForegroundColor Yellow
$logsDir = "E:\workspace\TsCode\logs"
$logsExist = Test-Path $logsDir
Test-Result "日志目录存在" $logsExist $(if ($logsExist) { "目录: $logsDir" } else { "目录不存在" })

# T007: 检查 .gitignore
Write-Host "`n--- T007: .gitignore 检查 ---" -ForegroundColor Yellow
$gitignore = Get-Content "E:\workspace\TsCode\.gitignore" -Raw
$hasLogs = $gitignore -match "logs/"
$hasHistory = $gitignore -match "\.adb-command-history\.json"
Test-Result ".gitignore 包含 logs/" $hasLogs
Test-Result ".gitignore 包含 .adb-command-history.json" $hasHistory

# T024: 检查日志文件
Write-Host "`n--- T024: 日志文件检查 ---" -ForegroundColor Yellow
if ($logsExist) {
    $logFiles = Get-ChildItem $logsDir -Filter "*.log" | Sort-Object LastWriteTime -Descending
    $hasLogFiles = $logFiles.Count -gt 0
    Test-Result "日志文件存在" $hasLogFiles $(if ($hasLogFiles) { "文件数: $($logFiles.Count)" } else { "无日志文件" })
    
    if ($hasLogFiles) {
        $latestLog = $logFiles[0]
        $logContent = Get-Content $latestLog.FullName -Raw
        $hasAdbCheck = $logContent -match "\[ADB\]"
        Test-Result "日志包含 ADB 检测信息" $hasAdbCheck $(if ($hasAdbCheck) { "最新日志: $($latestLog.Name)" } else { "日志内容无 ADB 信息" })
    }
} else {
    Test-Result "日志文件存在" $false "日志目录不存在"
}

# T029: 检查历史文件
Write-Host "`n--- T029: 历史文件检查 ---" -ForegroundColor Yellow
$historyFile = "E:\workspace\TsCode\.adb-command-history.json"
$historyExists = Test-Path $historyFile
Test-Result "历史文件存在" $historyExists $(if ($historyExists) { "文件: $historyFile" } else { "文件不存在（首次运行后生成）" })

if ($historyExists) {
    try {
        $historyContent = Get-Content $historyFile -Raw | ConvertFrom-Json
        $hasHistoryData = $historyContent.history.Count -gt 0
        Test-Result "历史文件格式正确" $true "版本: $($historyContent.version), 记录数: $($historyContent.history.Count)"
    } catch {
        Test-Result "历史文件格式正确" $false "JSON 解析失败"
    }
}

# T030: 检查构建产物
Write-Host "`n--- 构建产物检查 ---" -ForegroundColor Yellow
$exePath = "E:\workspace\TsCode\release\win-unpacked\TsCameraTools.exe"
$exeExists = Test-Path $exePath
Test-Result "可执行文件存在" $exeExists $(if ($exeExists) { "文件: $exePath" } else { "文件不存在" })

# 检查源代码文件
Write-Host "`n--- 源代码文件检查 ---" -ForegroundColor Yellow
$files = @(
    "src/pages/Devices.tsx",
    "src/utils/logger.ts",
    "src/layouts/MainLayout.tsx",
    "src/types/index.ts",
    "electron/main.cjs",
    "electron/preload.cjs"
)

foreach ($file in $files) {
    $filePath = "E:\workspace\TsCode\$file"
    $fileExists = Test-Path $filePath
    Test-Result "文件存在: $file" $fileExists
}

# 输出汇总
Write-Host "`n=== 测试结果汇总 ===" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count

Write-Host "通过: $passed / $total" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
if ($failed -gt 0) {
    Write-Host "失败: $failed" -ForegroundColor Red
    Write-Host "`n失败的测试:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Test): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Cyan

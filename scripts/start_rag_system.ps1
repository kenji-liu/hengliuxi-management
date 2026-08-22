# 橫流溪 RAG 系統一鍵啟動腳本 (PowerShell)
# 用法：在專案根目錄執行 .\scripts\start_rag_system.ps1
#
# 功能：
#   1. 確認相依套件已安裝
#   2. 執行增量索引（只處理新增/修改的檔案）
#   3. 背景啟動檔案監控（自動重新索引）
#
# 停止監控：Get-Job | Stop-Job

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Set-Location $projectRoot

Write-Host "=== 橫流溪 RAG 系統啟動 ===" -ForegroundColor Cyan
Write-Host "專案根目錄：$projectRoot"
Write-Host ""

# ── 1. 確認 Python 環境 ─────────────────────────────────────
Write-Host "[1/3] 確認 Python 環境..." -ForegroundColor Yellow

$python = if (Test-Path "$projectRoot\.venv\Scripts\python.exe") {
    "$projectRoot\.venv\Scripts\python.exe"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    "python"
} else {
    Write-Host "找不到 Python！請先安裝 Python 3.10+" -ForegroundColor Red
    exit 1
}

Write-Host "  使用：$python"

# ── 2. 安裝相依套件（若缺少）─────────────────────────────────
Write-Host "[2/3] 確認相依套件..." -ForegroundColor Yellow

$packages = @(
    "sentence-transformers",
    "pypdf",
    "python-docx",
    "watchdog",
    "flask",
    "numpy",
    "scikit-learn"
)

foreach ($pkg in $packages) {
    $check = & $python -c "import importlib; importlib.import_module('$($pkg -replace '-','_')')" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  安裝 $pkg..." -ForegroundColor Gray
        & $python -m pip install $pkg -q
    }
}
Write-Host "  相依套件確認完成 ✓"

# ── 3. 執行增量索引 ──────────────────────────────────────────
Write-Host "[3/3] 執行增量索引（首次可能需要 5~20 分鐘）..." -ForegroundColor Yellow
Write-Host "  提示：使用 --force 可強制重建整個向量庫"

$indexScript = "$scriptDir\hlx_index_all.py"
if (-not (Test-Path $indexScript)) {
    Write-Host "找不到索引腳本：$indexScript" -ForegroundColor Red
    exit 1
}

& $python $indexScript $args

if ($LASTEXITCODE -ne 0) {
    Write-Host "索引失敗！請檢查上方錯誤訊息。" -ForegroundColor Red
    exit 1
}

Write-Host "  索引完成 ✓" -ForegroundColor Green

# ── 4. 啟動背景監控 ─────────────────────────────────────────
Write-Host ""
Write-Host "啟動背景檔案監控（自動偵測並重新索引）..." -ForegroundColor Yellow

$watcherScript = "$scriptDir\hlx_watcher.py"
$watchJob = Start-Job -ScriptBlock {
    param($py, $script)
    & $py $script
} -ArgumentList $python, $watcherScript

Write-Host "  監控 Job ID：$($watchJob.Id) ✓" -ForegroundColor Green
Write-Host "  停止監控：Stop-Job $($watchJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "=== RAG 系統已就緒 ===" -ForegroundColor Green
Write-Host "向量庫位置：$projectRoot\webapp\data\vector_store.jsonl"
Write-Host "後端啟動後，AI 問答將自動使用本機 RAG 檢索。"

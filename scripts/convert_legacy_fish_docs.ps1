$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sourceMarker = Get-ChildItem -LiteralPath $workspaceRoot -Filter "*.ods" -File -Recurse | Select-Object -First 1
$sourceDir = if ($sourceMarker) { $sourceMarker.DirectoryName } else { $null }

if (-not $sourceDir) {
    throw "Fish ecology source directory was not found."
}
$outputDir = Join-Path $PSScriptRoot "..\tmp\fish_ecology_converted"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$word = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    Get-ChildItem -LiteralPath $sourceDir -File | Where-Object { $_.Extension -ieq ".doc" } | Sort-Object Length | ForEach-Object {
        $target = Join-Path $outputDir ($_.BaseName + ".docx")
        $document = $null
        try {
            Write-Output "Opening: $($_.Name)"
            $document = $word.Documents.Open($_.FullName, $false, $true, $false, "", "", $false, "", "", 0, 0, $false, $false, 0, $true)
            $document.SaveAs2($target, 16)
            Write-Output "Converted: $($_.Name)"
        }
        finally {
            if ($null -ne $document) {
                $document.Close($false)
                [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document)
            }
        }
    }
}
finally {
    if ($null -ne $word) {
        $word.Quit()
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

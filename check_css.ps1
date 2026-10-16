$f = [System.IO.File]::ReadAllText("c:\Users\PC\Pictures\alubarika\css\components.css")
Write-Host "=== SEARCHING FOR COMBINED .nav-backdrop,.nav-drawer RULE ==="
$combined = $f.IndexOf(".nav-backdrop,.nav-drawer{")
Write-Host "Found at index: $combined"
if ($combined -ge 0) {
    $snippet = $f.Substring($combined, [Math]::Min(500, $f.Length - $combined))
    Write-Host "Combined rule snippet:"
    Write-Host $snippet
    Write-Host ""
    Write-Host "Count of 'background:' in this snippet: $(($snippet | Select-String -AllMatches 'background:').Matches.Count)"
}

Write-Host ""
Write-Host "=== CHECKING SEPARATE .nav-backdrop{ AND .nav-drawer{ RULES ==="
$nbIdx = $f.IndexOf(".nav-backdrop{")
$ndIdx = $f.IndexOf(".nav-drawer{")
Write-Host "nav-backdrop at: $nbIdx, nav-drawer at: $ndIdx"

Write-Host ""
Write-Host "=== CHECKING FOR is-visible IN THE BACKDROP CONTEXT ==="
# Get from nav-backdrop{ to end of nav-drawer rule (first occurrence of nav-drawer__ inner)
$snippet3 = $f.Substring($nbIdx, [Math]::Min(900, $f.Length - $nbIdx))
Write-Host "Content from nav-backdrop{ (900 chars):"
Write-Host "---"
Write-Host $snippet3
Write-Host "---"

Write-Host ""
Write-Host "All occurrences of 'background:' in file (with count):"
$bgMatches = [regex]::Matches($f, 'background:[^;]+')
Write-Host "Total: $($bgMatches.Count) occurrences"
$bgMatches | ForEach-Object { Write-Host "  $($_.Value)" }

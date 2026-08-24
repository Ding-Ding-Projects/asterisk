function Parse-AsteriskReadinessText {
    param([string]$Output, [string]$ErrorOutput = '')
    $text = ($Output -replace "`0", '').Trim()
    $combined = "$text`n$ErrorOutput"
    if ([string]::IsNullOrWhiteSpace($text) -or $combined -match '(?i)unable to connect to remote asterisk|asterisk is not running|no such file|error:') {
        return [pscustomobject]@{ ok = $false; reason = (($ErrorOutput.Trim() -or $text -or 'Asterisk did not report readiness.') -split "`r?`n")[0] }
    }
    $match = [regex]::Match($text, '(?i)\bAsterisk\s+(?<version>\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?)')
    if (-not $match.Success) { return [pscustomobject]@{ ok = $false; reason = 'Asterisk did not report a real version.' } }
    return [pscustomobject]@{ ok = $true; version = $match.Groups['version'].Value }
}

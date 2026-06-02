param(
  [string]$OutputPath = "output/blog-handoff.zip"
)

$ErrorActionPreference = "Stop"

function Convert-To-RepoPath {
  param([string]$Path)

  $normalized = $Path -replace "\\", "/"
  if ($normalized.StartsWith("./", [System.StringComparison]::Ordinal)) {
    return $normalized.Substring(2)
  }

  return $normalized
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $repoRoot $OutputPath
}
$resolvedOutputPath = [System.IO.Path]::GetFullPath($resolvedOutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutputPath)
$stagingRoot = Join-Path $repoRoot "output/handoff-staging"
$stagingRoot = [System.IO.Path]::GetFullPath($stagingRoot)

if (-not $stagingRoot.StartsWith((Join-Path $repoRoot "output"), [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to clean a staging directory outside output/."
}

$excludedPrefixes = @(
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".vercel",
  ".playwright-cli",
  "output",
  ".trae",
  "docs/plans",
  "docs/superpowers"
)

$excludedFiles = @(
  ".env",
  ".env.local"
)

Push-Location $repoRoot
try {
  $files = git -c core.quotepath=false ls-files --cached --others --exclude-standard
} finally {
  Pop-Location
}

if (-not $files) {
  throw "No files found to package."
}

if (Test-Path $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($file in $files) {
  $repoPath = Convert-To-RepoPath $file

  if ($excludedFiles -contains $repoPath) {
    continue
  }

  if ($repoPath -like ".env.*.local") {
    continue
  }

  $isExcludedByPrefix = $false
  foreach ($prefix in $excludedPrefixes) {
    if ($repoPath -eq $prefix -or $repoPath.StartsWith("$prefix/", [System.StringComparison]::OrdinalIgnoreCase)) {
      $isExcludedByPrefix = $true
      break
    }
  }

  if ($isExcludedByPrefix) {
    continue
  }

  $source = Join-Path $repoRoot $repoPath
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    continue
  }

  $target = Join-Path $stagingRoot $repoPath
  $targetDirectory = Split-Path -Parent $target
  [System.IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
  [System.IO.File]::Copy($source, $target, $true)
}

try {
  if (Test-Path $resolvedOutputPath) {
    Remove-Item -LiteralPath $resolvedOutputPath -Force
  }

  Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $resolvedOutputPath -Force
} finally {
  if (Test-Path $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
}

Write-Host "Handoff package created: $resolvedOutputPath"

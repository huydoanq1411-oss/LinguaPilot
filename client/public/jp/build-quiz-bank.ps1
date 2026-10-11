$ErrorActionPreference = 'Stop'
# Regenerate quiz-bank.js from the lesson and test HTML after editing quiz content.
$root = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location).Path 'JP' }
$levels = @('kana', 'n5', 'n4', 'n3n2', 'n2', 'n1')
$bank = [ordered]@{}
foreach ($level in $levels) { $bank[$level] = [System.Collections.Generic.List[object]]::new() }

function Convert-HtmlText([string]$value) {
  $value = [regex]::Replace($value, '(?i)<br\s*/?>', ' ')
  $value = [regex]::Replace($value, '<[^>]*>', ' ')
  $value = [System.Net.WebUtility]::HtmlDecode($value)
  return [regex]::Replace($value, '\s+', ' ').Trim()
}

function Find-DivEnd([string]$html, [int]$start) {
  $tags = [regex]::new('</?div\b[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $depth = 0
  foreach ($tag in $tags.Matches($html, $start)) {
    if ($tag.Value -match '^</') { $depth-- }
    elseif ($tag.Value -notmatch '/\s*>$') { $depth++ }
    if ($depth -eq 0) { return ($tag.Index + $tag.Length) }
  }
  return -1
}

function Get-SectionInfo([string]$html, [int]$position) {
  $tags = [regex]::new('<section\b[^>]*class=["''][^"'']*\bsection\b[^"'']*["''][^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $latest = $null
  foreach ($tag in $tags.Matches($html)) {
    if ($tag.Index -ge $position) { break }
    $latest = $tag
  }
  if ($null -eq $latest) { return @{ id = ''; title = '' } }
  $idMatch = [regex]::Match($latest.Value, '\bid=["'']([^"'']+)["'']', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $id = if ($idMatch.Success) { $idMatch.Groups[1].Value } else { '' }
  $headingStart = $html.LastIndexOf('<h2', $latest.Index, [System.StringComparison]::OrdinalIgnoreCase)
  $headingEnd = if ($headingStart -ge 0) { $html.IndexOf('</h2>', $headingStart, [System.StringComparison]::OrdinalIgnoreCase) } else { -1 }
  $title = if ($headingEnd -gt $headingStart -and $headingEnd -lt $position) { Convert-HtmlText $html.Substring($headingStart, $headingEnd + 5 - $headingStart) } else { '' }
  return @{ id = $id; title = $title }
}

function Get-QuestionLevel([string]$file, [string]$html, [string]$block, [int]$position) {
  $page = [System.IO.Path]::GetFileName($file).ToLowerInvariant()
  if ($page -match '^test-n([1-5])\.html$') {
    if ($Matches[1] -eq '3') { return 'n3n2' }
    return "n$($Matches[1])"
  }
  $nameMatch = [regex]::Match($block, '<input\b[^>]*\bname=["'']([^"'']+)["'']', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $name = if ($nameMatch.Success) { $nameMatch.Groups[1].Value } else { '' }
  if ($page -eq 'kiem-tra-thang-cap.html') {
    if ($name -match '^n5q') { return 'n5' }
    if ($name -match '^n4q') { return 'n4' }
    if ($name -match '^n32q') { return 'n3n2' }
    if ($name -match '^n2q') { return 'n2' }
    if ($name -match '^n1q') { return 'n1' }
  }

  $info = Get-SectionInfo $html $position
  if ($info.id -match '^bai(\d+)$') {
    $lesson = [int]$Matches[1]
    if ($lesson -le 18) { return 'kana' }
    if ($lesson -le 39) { return 'n5' }
    if ($lesson -le 55) { return 'n4' }
    if ($lesson -le 60) { return 'n3n2' }
    if ($lesson -le 100) { return 'n2' }
    if ($lesson -le 120) { return 'n2' }
    return 'n1'
  }
  if ($info.title -match '\bN\s*([1-5])\b') {
    if ($Matches[1] -eq '3') { return 'n3n2' }
    return "n$($Matches[1])"
  }
  return ''
}

function Get-QuestionContext([string]$html, [int]$start) {
  $sectionStart = [Math]::Max(0, $html.LastIndexOf('<section', $start, [System.StringComparison]::OrdinalIgnoreCase))
  $before = $html.Substring($sectionStart, $start - $sectionStart)
  $matches = [regex]::Matches($before, '<pre\b[^>]*>[\s\S]*?</pre>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($matches.Count -eq 0) { return '' }
  $context = Convert-HtmlText $matches[$matches.Count - 1].Value
  if ($context.Length -lt 80 -or $context.Length -gt 2400) { return '' }
  return $context
}

foreach ($file in Get-ChildItem -Path $root -Filter '*.html') {
  $html = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
  $starts = [regex]::Matches($html, '<div\b[^>]*class=["''][^"'']*\bquiz-(?:q|question)\b[^"'']*["''][^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $index = 0
  foreach ($start in $starts) {
    $index++
    $end = Find-DivEnd $html $start.Index
    if ($end -lt 0) { continue }
    $block = $html.Substring($start.Index, $end - $start.Index)
    $promptMatch = [regex]::Match($block, '<p\b[^>]*>([\s\S]*?)</p>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if (-not $promptMatch.Success) { continue }
    $options = [System.Collections.Generic.List[object]]::new()
    foreach ($label in [regex]::Matches($block, '<label\b[^>]*>([\s\S]*?)</label>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      $inputMatch = [regex]::Match($label.Groups[1].Value, '<input\b[^>]*type=["'']radio["''][^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if (-not $inputMatch.Success) { continue }
      $valueMatch = [regex]::Match($inputMatch.Value, '\bvalue=["'']([^"'']*)["'']', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      $value = if ($valueMatch.Success) { $valueMatch.Groups[1].Value } else { '' }
      $optionHtml = [regex]::Replace($label.Groups[1].Value, '<input\b[^>]*>', '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Trim()
      $options.Add(@{ html = $optionHtml; text = (Convert-HtmlText $optionHtml); correct = ($value -match '^(?i:c|correct|true|1)$') })
    }
    if ($options.Count -lt 2 -or @($options | Where-Object correct).Count -ne 1) { continue }

    $level = Get-QuestionLevel $file.Name $html $block $start.Index
    if (-not $bank.Contains($level)) { continue }
    $promptHtml = $promptMatch.Groups[1].Value
    $prompt = Convert-HtmlText $promptHtml
    $promptContent = [regex]::Replace($prompt, '^\s*(?:[\w・語彙読解聴解入門総合]+\s*)?\d+[.)]?\s*', '').Trim()
    if ($promptContent.Length -lt 3) { continue }
    $kind = if ($prompt -match '文章|本文|読解|読んで|筆者|bài\s*\d+|theo bài|đoạn văn|đọc hiểu|the article|the passage') { 'reading' } else { 'general' }
    $context = if ($kind -eq 'reading') { Get-QuestionContext $html $start.Index } else { '' }
    if ($kind -eq 'reading' -and -not $context -and $prompt -match '"[^"].+"|「[^」].+」') { $kind = 'general' }
    $bank[$level].Add(@{
      id = "$($file.Name)#$index"
      level = $level
      kind = $kind
      promptHtml = $promptHtml
      prompt = $prompt
      context = $context
      options = @($options)
    })
  }
}

foreach ($level in $levels) {
  # Keep the first occurrence of duplicate prompt/option sets within each level.
  $unique = [System.Collections.Generic.Dictionary[string, object]]::new([System.StringComparer]::Ordinal)
  foreach ($question in $bank[$level]) {
    $key = "$($question.kind)|$($question.prompt)|$($question.options.text -join '|')"
    if (-not $unique.ContainsKey($key)) { $unique.Add($key, $question) }
  }
  $bank[$level] = [System.Collections.Generic.List[object]]::new()
  foreach ($question in $unique.Values) { $bank[$level].Add($question) }
}

$json = ConvertTo-Json -InputObject $bank -Depth 12 -Compress
$output = "/* Generated from local quiz HTML. See README for the Windows PowerShell command. */`r`nwindow.JP_QUIZ_BANKS = $json;`r`n"
[System.IO.File]::WriteAllText((Join-Path $root 'quiz-bank.js'), $output, [System.Text.UTF8Encoding]::new($false))

foreach ($level in $levels) {
  $questions = @($bank[$level])
  $general = @($questions | Where-Object { $_.kind -eq 'general' }).Count
  $reading = @($questions | Where-Object { $_.kind -eq 'reading' }).Count
  Write-Output ("{0}: {1} (general {2}, reading {3})" -f $level, $questions.Count, $general, $reading)
}

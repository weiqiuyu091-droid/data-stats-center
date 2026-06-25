# 澳门六合彩实时数据抓取 (庄家模式)
# API: https://macaumarksix.com/api/live2
param([int]$Interval = 8, [switch]$Once)

$outputFile = "D:\686\lottery_result.json"
$outputJs   = "D:\686\lottery_data.js"
$apiUrl     = "https://macaumarksix.com/api/live2"

$numberToZodiac = @{
    "01"="马"; "13"="马"; "25"="马"; "37"="马"; "49"="马"
    "02"="蛇"; "14"="蛇"; "26"="蛇"; "38"="蛇"
    "03"="龙"; "15"="龙"; "27"="龙"; "39"="龙"
    "04"="兔"; "16"="兔"; "28"="兔"; "40"="兔"
    "05"="虎"; "17"="虎"; "29"="虎"; "41"="虎"
    "06"="牛"; "18"="牛"; "30"="牛"; "42"="牛"
    "07"="鼠"; "19"="鼠"; "31"="鼠"; "43"="鼠"
    "08"="猪"; "20"="猪"; "32"="猪"; "44"="猪"
    "09"="狗"; "21"="狗"; "33"="狗"; "45"="狗"
    "10"="鸡"; "22"="鸡"; "34"="鸡"; "46"="鸡"
    "11"="猴"; "23"="猴"; "35"="猴"; "47"="猴"
    "12"="羊"; "24"="羊"; "36"="羊"; "48"="羊"
}

$t2s = @{ "龍"="龙"; "馬"="马"; "豬"="猪"; "雞"="鸡"; "鴨"="鸭" }

function Get-LiveData {
    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
        $response = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 12 -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        return $response
    } catch { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] API请求失败: $_" -ForegroundColor Red; return $null }
}

function Parse-Result($data) {
    if (-not $data -or -not $data.openCode) { return $null }

    $numbers = $data.openCode -split ',' | ForEach-Object { $_.Trim() }
    if ($numbers.Count -lt 7) { return $null }
    $validNumbers = $numbers | Where-Object { $_ -ne '' }
    if ($validNumbers.Count -eq 0) { return $null }

    $seven = $numbers[0..6]
    $teMa  = $seven[6]
    $expect = $data.expect

    $rawZodiacs = @()
    if ($data.zodiac) {
        $rawZodiacs = $data.zodiac -split ',' | ForEach-Object { $_.Trim() }
    }

    $flatZodiacs = @()
    $seen = @{}
    foreach ($z in $rawZodiacs) {
        $zSimple = $z
        if ($t2s.ContainsKey($z)) { $zSimple = $t2s[$z] }
        if ($zSimple -and -not $seen.ContainsKey($zSimple)) {
            $seen[$zSimple] = $true
            $flatZodiacs += $zSimple
        }
    }

    if ($flatZodiacs.Count -eq 0) {
        $seen = @{}
        foreach ($n in $seven) {
            $z = $numberToZodiac[$n]
            if ($z -and -not $seen.ContainsKey($z)) {
                $seen[$z] = $true
                $flatZodiacs += $z
            }
        }
    }

    return @{
        expect      = $expect
        numbers     = $seven
        validCount  = $validNumbers.Count
        teMa        = $teMa
        zodiacRaw   = $rawZodiacs -join ','
        flatZodiacs = $flatZodiacs
        openTime    = $data.openTime
        timestamp   = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
}

Write-Host "====== 澳门六合彩 庄家数据抓取 ======" -ForegroundColor Cyan
Write-Host "API: $apiUrl" -ForegroundColor Gray
if ($Once) {
    Write-Host "模式: 单次抓取" -ForegroundColor Gray
} else {
    Write-Host "模式: 持续监控 (${Interval}s)" -ForegroundColor Gray
    Write-Host "按 Ctrl+C 停止" -ForegroundColor Gray
}

$lastExpect = ""
$lastValidCount = 0

do {
    $data = Get-LiveData
    if ($data) {
        $result = Parse-Result -data $data
        if ($result) {
            # 当期号变化或有效号码数增加时写入文件
            $needUpdate = ($result.expect -ne $lastExpect) -or ($result.validCount -gt $lastValidCount)
            if ($needUpdate) {
                $json = $result | ConvertTo-Json -Compress -Depth 5
                $json | Set-Content -Path $outputFile -Encoding UTF8
                "var LOTTERY_DATA = $json;" | Set-Content -Path $outputJs -Encoding UTF8
                $lastExpect = $result.expect
                $lastValidCount = $result.validCount

                Write-Host "[$($result.timestamp)] 第$($result.expect)期 更新! ($($result.validCount)/7 球)" -ForegroundColor Green
                Write-Host "  号码: $($result.numbers -join ' ')" -ForegroundColor Yellow
                if ($result.teMa) {
                    Write-Host "  特码: $($result.teMa) ($($numberToZodiac[$result.teMa]))" -ForegroundColor Magenta
                }
                Write-Host "  平特: $($result.flatZodiacs -join ' ')" -ForegroundColor Cyan
            } else {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 第$($result.expect)期 无变化 ($($result.validCount)/7 球)" -ForegroundColor Gray
            }
        }
    }
    if (-not $Once) { Start-Sleep -Seconds $Interval }
} while (-not $Once)

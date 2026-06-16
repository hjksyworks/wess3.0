# 사용법: .\push.ps1 "커밋 메시지"
# 예시:  .\push.ps1 "fix: 버그 수정"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$SSH_KEY = "$PSScriptRoot\.ssh\id_ed25519"
$REMOTE  = "git@github.com:hjksyworks/wess3.0.git"

# 변경된 파일 모두 스테이징
git add -A

# 스테이징된 내용 확인
$status = git status --porcelain
if (-not $status) {
    Write-Host "변경 사항이 없습니다." -ForegroundColor Yellow
    exit 0
}

# 커밋
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "커밋 실패" -ForegroundColor Red
    exit 1
}

# SSH 키로 푸시
$env:GIT_SSH_COMMAND = "ssh -i `"$SSH_KEY`" -o StrictHostKeyChecking=no"
git push $REMOTE HEAD:main
if ($LASTEXITCODE -eq 0) {
    Write-Host "푸시 완료" -ForegroundColor Green
} else {
    Write-Host "푸시 실패" -ForegroundColor Red
    exit 1
}

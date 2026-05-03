# ClickUp API helper for TimeIn dev workflow
# Usage: .\scripts\clickup.ps1 <command> [args]
#
# Commands:
#   tasks                   - List open tasks across all project lists
#   task <taskId>           - Show task details
#   start <taskId>          - Set task status to "in progress"
#   review <taskId>         - Set task status to "complete" (ready for review)
#   comment <taskId> <text> - Post a comment to a task
#   my-tasks                - Show tasks in the TimeIn list

param(
    [Parameter(Position=0)] [string]$Command = "tasks",
    [Parameter(Position=1)] [string]$Arg1 = "",
    [Parameter(Position=2)] [string]$Arg2 = ""
)

$API_KEY  = "pk_296549297_MC6GEFGJHXZJG24JWLJWNPHUZK2CMEQ6"
$BASE_URL = "https://api.clickup.com/api/v2"
$HEADERS  = @{ "Authorization" = $API_KEY; "Content-Type" = "application/json" }

# Known list IDs
$LISTS = @{
    "TimeIn"    = "901817777288"
    "Project1"  = "901817774005"
    "Project2"  = "901817774004"
}

function Get-Tasks($listId) {
    try {
        $res = Invoke-RestMethod -Uri "$BASE_URL/list/$listId/task?include_closed=false" -Headers $HEADERS
        return $res.tasks
    } catch {
        return @()
    }
}

function Get-Task($taskId) {
    return Invoke-RestMethod -Uri "$BASE_URL/task/$taskId" -Headers $HEADERS
}

function Set-TaskStatus($taskId, $status) {
    $body = @{ status = $status } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BASE_URL/task/$taskId" -Headers $HEADERS -Method Put -Body $body
    Write-Host "Task $taskId status set to '$status'" -ForegroundColor Green
    return $res
}

function Add-Comment($taskId, $text) {
    $body = @{ comment_text = $text } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BASE_URL/task/$taskId/comment" -Headers $HEADERS -Method Post -Body $body
    Write-Host "Comment posted to task $taskId" -ForegroundColor Green
    return $res
}

function Show-TaskList($tasks, $listName) {
    Write-Host "`n=== $listName ===" -ForegroundColor Cyan
    if (-not $tasks -or $tasks.Count -eq 0) {
        Write-Host "  (no open tasks)" -ForegroundColor DarkGray
        return
    }
    foreach ($t in $tasks) {
        $pri = if ($t.priority.priority) { "[$($t.priority.priority)]" } else { "[none]" }
        $status = $t.status.status.ToUpper().PadRight(15)
        Write-Host "  $($t.id)  $status  $pri  $($t.name)" -ForegroundColor White
    }
}

switch ($Command.ToLower()) {
    "tasks" {
        foreach ($name in $LISTS.Keys) {
            $tasks = Get-Tasks $LISTS[$name]
            Show-TaskList $tasks $name
        }
    }
    "my-tasks" {
        $tasks = Get-Tasks $LISTS["TimeIn"]
        Show-TaskList $tasks "TimeIn"
    }
    "task" {
        if (-not $Arg1) { Write-Host "Usage: clickup.ps1 task <taskId>"; exit 1 }
        $t = Get-Task $Arg1
        Write-Host "`nTask: $($t.id)" -ForegroundColor Cyan
        Write-Host "Name:     $($t.name)"
        Write-Host "Status:   $($t.status.status)"
        Write-Host "Priority: $($t.priority.priority)"
        Write-Host "URL:      $($t.url)"
        if ($t.description) { Write-Host "Desc:     $($t.description)" }
        if ($t.time_estimate) {
            $hrs = [math]::Round($t.time_estimate / 3600000, 1)
            Write-Host "Estimate: $hrs hours"
        }
    }
    "start" {
        if (-not $Arg1) { Write-Host "Usage: clickup.ps1 start <taskId>"; exit 1 }
        Set-TaskStatus $Arg1 "in progress"
    }
    "review" {
        if (-not $Arg1) { Write-Host "Usage: clickup.ps1 review <taskId>"; exit 1 }
        Set-TaskStatus $Arg1 "complete"
    }
    "comment" {
        if (-not $Arg1 -or -not $Arg2) { Write-Host "Usage: clickup.ps1 comment <taskId> <text>"; exit 1 }
        Add-Comment $Arg1 $Arg2
    }
    default {
        Write-Host "Unknown command: $Command"
        Write-Host "Available: tasks, my-tasks, task <id>, start <id>, review <id>, comment <id> <text>"
    }
}

# TimeIn Project — Claude Code Workflow

## Project Overview
Full-stack work-hours tracking app.
- **Server**: .NET 8 API — `server/TimeIn.API/`
- **Client**: Angular 21 — `client/timein-client/`
- **Run server**: `cd server/TimeIn.API && dotnet run`
- **Run client**: `cd C:\Users\Owner\timein-client && ng serve` (client lives in ASCII path due to Hebrew-path esbuild limitation)

## ClickUp Integration

**API Key**: `pk_296549297_MC6GEFGJHXZJG24JWLJWNPHUZK2CMEQ6`
**Workspace**: Libby Steinharter's Workspace (`90182667121`)

### Lists & Tasks
| List | ID | Purpose |
|------|----|---------|
| TimeIn | `901817777288` | Main dev tasks |
| Project 1 | `901817774005` | Client project tasks |
| Project 2 | `901817774004` | Client project tasks |

### Helper Script
```powershell
# List all open tasks
.\scripts\clickup.ps1 tasks

# Show a specific task
.\scripts\clickup.ps1 task 86exf4f80

# Mark task as "in progress" before starting work
.\scripts\clickup.ps1 start 86exf4f80

# Mark task as "complete" after clean build
.\scripts\clickup.ps1 review 86exf4f80

# Post a technical summary comment
.\scripts\clickup.ps1 comment 86exf4f80 "Fixed login screen layout — changed flex direction, added RTL support"
```

## Dev Workflow (ClickUp Integration)

### 1. Before Starting Changes
1. Run `.\scripts\clickup.ps1 tasks` to see open tasks
2. Identify the relevant task ID(s) for the work
3. Run `.\scripts\clickup.ps1 task <id>` to read the full description and time estimate
4. Mark the task as started: `.\scripts\clickup.ps1 start <taskId>`

### 2. During Development
- When creating a TimeEntry for this work in the TimeIn app, set `RelatedClickUpTaskId` to the task ID — this enables automatic ClickUp time logging on approval.
- Keep commits atomic: one task = one logical commit.

### 3. After a Clean Build
When the .NET server and Angular client both build without errors:
1. Mark the task ready: `.\scripts\clickup.ps1 review <taskId>`
2. Post a technical summary as a comment (see template below).

### 4. Technical Summary Comment Template
```
✅ Build successful — [date]

**Changed files:**
- server/TimeIn.API/Services/XService.cs — [what changed]
- client/src/app/components/X/x.component.ts — [what changed]

**New API endpoints:**
- GET /api/x — [description]

**Time logged:** [N] minutes
```

Use: `.\scripts\clickup.ps1 comment <taskId> "<summary>"`

## Build Commands

### Server
```bash
cd server/TimeIn.API
dotnet build        # check for errors
dotnet run          # start on https://localhost:7001
```

### Client
```powershell
cd C:\Users\Owner\timein-client
ng build            # production build
ng serve            # dev server on http://localhost:4200
```

## Code Conventions
- All user-facing strings are in Hebrew (RTL)
- Status enum values: `Draft`, `Submitted`, `Approved`, `Rejected`
- All summary/chart queries must filter `Status == Approved` only
- Israeli weekends: Friday (DayOfWeek 5) and Saturday (DayOfWeek 6) are non-working days
- ChangeDetectorRef + microtask (`Promise.resolve().then(...)`) pattern for Angular lifecycle safety

## Database
- SQL Server, EF Core migrations
- Connection string in `server/TimeIn.API/appsettings.Development.json`
- ClickUp API key also in `appsettings.Development.json` under `ClickUp:ApiKey`

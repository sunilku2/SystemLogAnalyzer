# Windows Event Log Locations & Export Guide

## Windows Event Log Directory Paths

### Standard Location for All Event Logs
```
C:\Windows\System32\winevt\Logs\
```

### Key Event Log Files (EVTX Format)

#### Network & Connectivity Logs
- **C:\Windows\System32\winevt\Logs\Microsoft-Windows-NCSI%4Operational.evtx**
  - Network Connectivity Status Indicator
  - Contains NCSI event IDs 4001-4006, 4042 for network connectivity issues
  
- **C:\Windows\System32\winevt\Logs\Microsoft-Windows-WLAN-AutoConfig%4Operational.evtx**
  - Wireless LAN (WLAN) AutoConfig service events
  - Contains event IDs 8002, 11006 for WiFi connection issues

#### System Logs
- **C:\Windows\System32\winevt\Logs\System.evtx**
  - System-level events including Kernel-Power (506, 507)
  - Hardware, driver, and boot-related events

- **C:\Windows\System32\winevt\Logs\Application.evtx**
  - Application-level errors and warnings

- **C:\Windows\System32\winevt\Logs\Security.evtx** (Requires Admin)
  - Security-related events and login attempts

#### Other Important Logs
- **C:\Windows\System32\winevt\Logs\Microsoft-Windows-DNS-Client%4Operational.evtx**
  - DNS resolution events
  
- **C:\Windows\System32\winevt\Logs\Microsoft-Windows-TaskScheduler%4Operational.evtx**
  - Scheduled task execution

## How to Export Event Logs

### Method 1: Using PowerShell (Recommended)

```powershell
# Export System log
wevtutil epl System "C:\Temp\System.evtx"

# Export NCSI log
wevtutil epl Microsoft-Windows-NCSI/Operational "C:\Temp\Microsoft-Windows-NCSI4Operational.evtx"

# Export WLAN log
wevtutil epl Microsoft-Windows-WLAN-AutoConfig/Operational "C:\Temp\Microsoft-Windows-WLAN-AutoConfig4Operational.evtx"

# Export Application log
wevtutil epl Application "C:\Temp\Application.evtx"

# Export Security log (Admin required)
wevtutil epl Security "C:\Temp\Security.evtx"
```

### Method 2: Using Event Viewer GUI
1. Open Event Viewer (eventvwr.msc)
2. Navigate to desired log (e.g., Windows Logs > System)
3. Right-click on log name → "Save All Events As..."
4. Choose location and filename
5. Select "Event files (*.evtx)" format

### Method 3: Copy Directly from System32
```powershell
# Copy NCSI log
Copy-Item "C:\Windows\System32\winevt\Logs\Microsoft-Windows-NCSI%4Operational.evtx" -Destination "C:\Temp\Microsoft-Windows-NCSI4Operational.evtx"

# Copy WLAN log
Copy-Item "C:\Windows\System32\winevt\Logs\Microsoft-Windows-WLAN-AutoConfig%4Operational.evtx" -Destination "C:\Temp\Microsoft-Windows-WLAN-AutoConfig4Operational.evtx"

# Copy System log
Copy-Item "C:\Windows\System32\winevt\Logs\System.evtx" -Destination "C:\Temp\System.evtx"
```

## Where to Place Logs for Analysis

### Directory Structure for UserSystemLogAnalyzer
```
analysis_logs/
├── [USER_ID]/
│   ├── [SYSTEM_NAME]/
│   │   └── [TIMESTAMP]/
│   │       ├── System.evtx
│   │       ├── Application.evtx
│   │       ├── Microsoft-Windows-NCSI4Operational.evtx
│   │       ├── Microsoft-Windows-WLAN-AutoConfig4Operational.evtx
│   │       └── Security.evtx
```

### Example Path
```
analysis_logs/
├── 10669022/
│   ├── soc-5CG5233YBT/
│   │   └── 2026-01-28_14-30-00/
│   │       ├── System.evtx
│   │       ├── Microsoft-Windows-NCSI4Operational.evtx
│   │       └── Microsoft-Windows-WLAN-AutoConfig4Operational.evtx
```

### Steps to Add Logs

1. **Export logs from source computer** using one of the methods above
2. **Create directory structure** with USER_ID, SYSTEM_NAME, and TIMESTAMP
3. **Copy EVTX files** to the timestamped directory
4. **Run analyzer** - it will automatically detect and parse .evtx files

## Recommended Logs for Complete Analysis

For comprehensive fleet analysis, collect:

1. **System.evtx** - System-level events (critical)
2. **Microsoft-Windows-NCSI4Operational.evtx** - Network connectivity (important for network analysis)
3. **Microsoft-Windows-WLAN-AutoConfig4Operational.evtx** - WiFi issues (important for WiFi analysis)
4. **Application.evtx** - Application errors (useful)
5. **Security.evtx** - Security events (requires admin, optional for general analysis)

## Accessing Logs via Remote PowerShell

### From Remote Computer
```powershell
# Connect to remote computer
$session = New-PSSession -ComputerName "REMOTE_COMPUTER_NAME"

# Copy remote logs to local
Copy-Item -FromSession $session -Path "C:\Windows\System32\winevt\Logs\System.evtx" -Destination "C:\Temp\System.evtx"

# Or export via PowerShell Remoting
Invoke-Command -Session $session -ScriptBlock {
    wevtutil epl System "C:\Temp\System.evtx"
    wevtutil epl Microsoft-Windows-NCSI/Operational "C:\Temp\Microsoft-Windows-NCSI4Operational.evtx"
    wevtutil epl Microsoft-Windows-WLAN-AutoConfig/Operational "C:\Temp\Microsoft-Windows-WLAN-AutoConfig4Operational.evtx"
}
```

## Log File Size Considerations

- **System.evtx**: ~5-50 MB (depends on uptime and log rotation)
- **NCSI.evtx**: ~1-5 MB
- **WLAN.evtx**: ~1-5 MB
- **Application.evtx**: ~2-10 MB
- **Security.evtx**: ~10-100+ MB (if enabled)

**Note**: Large .evtx files provide more historical data but take longer to parse. Most recent logs (last few hours) are usually sufficient for issue analysis.

## Troubleshooting Log Export

### Permission Denied Error
```powershell
# Run PowerShell as Administrator
# Then try export command again
```

### Log In Use / File Locked
```powershell
# The file might be locked by Event Viewer
# Make sure Event Viewer is closed first
# Or use wevtutil which can access locked files
wevtutil epl System "C:\Temp\System.evtx"
```

### Cannot Find Log Name
```powershell
# List all available logs
wevtutil enum-logs
```

## Automated Log Collection Script

```powershell
# Save as CollectLogs.ps1
param(
    [string]$DestinationPath = "C:\Temp\EventLogs"
)

# Create destination
if (!(Test-Path $DestinationPath)) { New-Item -ItemType Directory -Path $DestinationPath }

# Export key logs
$logs = @(
    "System",
    "Application",
    "Microsoft-Windows-NCSI/Operational",
    "Microsoft-Windows-WLAN-AutoConfig/Operational"
)

foreach ($log in $logs) {
    $filename = $log -replace "/", "%4"
    $filepath = Join-Path $DestinationPath "$filename.evtx"
    Write-Host "Exporting $log to $filepath..."
    wevtutil epl "$log" "$filepath"
}

Write-Host "Log collection complete!"
```

**Usage**: `.\CollectLogs.ps1 -DestinationPath "C:\MyLogs"`

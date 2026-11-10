param(
  [Parameter(Mandatory = $true)][ValidateSet('monitor', 'present', 'restore')][string]$Action,
  [string]$Title = 'DSH-WE-Record',
  [int]$Width = 0,
  [int]$Height = 0
)

# Desktop presentation for scene-video capture:
#   monitor  - print the primary monitor's physical pixel size ("WxH")
#   present  - hide taskbars, force the Wallpaper Engine record window
#              borderless-fullscreen topmost, move the cursor to its centre
#              (wcap captures the window under the cursor)
#   restore  - bring the taskbars back
# Everything is best-effort and reversible; a capture that fails midway must
# still call 'restore' so the user's desktop returns to normal.

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class SceneCaptureDesktop {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string className, string windowName);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static readonly IntPtr TopMost = new IntPtr(-1);
    public const uint ShowWindowFlag = 0x0040;
    public const uint KeepPositionFlag = 0x0002;
    public const uint KeepSizeFlag = 0x0001;
}
'@

[SceneCaptureDesktop]::SetProcessDPIAware() | Out-Null

function Get-TaskbarHandles {
    $handles = @()
    foreach ($className in @('Shell_TrayWnd', 'Shell_SecondaryTrayWnd')) {
        $handle = [SceneCaptureDesktop]::FindWindow($className, $null)
        if ($handle -ne [IntPtr]::Zero) { $handles += $handle }
    }
    return $handles
}

function Find-RecordWindow([string]$titlePart) {
    $script:found = [IntPtr]::Zero
    $callback = [SceneCaptureDesktop+EnumWindowsProc]{
        param([IntPtr]$hWnd, [IntPtr]$lParam)
        if (-not [SceneCaptureDesktop]::IsWindowVisible($hWnd)) { return $true }
        $text = New-Object System.Text.StringBuilder 1024
        [void][SceneCaptureDesktop]::GetWindowText($hWnd, $text, 1024)
        if ($text.ToString().Contains($titlePart)) {
            $script:found = $hWnd
            return $false
        }
        return $true
    }
    [void][SceneCaptureDesktop]::EnumWindows($callback, [IntPtr]::Zero)
    return $script:found
}

switch ($Action) {
    'monitor' {
        # 0 = SM_CXSCREEN, 1 = SM_CYSCREEN (primary monitor, physical pixels
        # because the process is DPI-aware)
        Write-Output ("{0}x{1}" -f [SceneCaptureDesktop]::GetSystemMetrics(0), [SceneCaptureDesktop]::GetSystemMetrics(1))
    }
    'present' {
        foreach ($handle in (Get-TaskbarHandles)) { [void][SceneCaptureDesktop]::ShowWindow($handle, 0) }
        $window = Find-RecordWindow $Title
        if ($window -eq [IntPtr]::Zero) { Write-Output 'window-not-found'; exit 2 }
        if ($Width -gt 0 -and $Height -gt 0) {
            [void][SceneCaptureDesktop]::SetWindowPos($window, [SceneCaptureDesktop]::TopMost, 0, 0, $Width, $Height, [SceneCaptureDesktop]::ShowWindowFlag)
        }
        else {
            $flags = [SceneCaptureDesktop]::KeepPositionFlag -bor [SceneCaptureDesktop]::KeepSizeFlag -bor [SceneCaptureDesktop]::ShowWindowFlag
            [void][SceneCaptureDesktop]::SetWindowPos($window, [SceneCaptureDesktop]::TopMost, 0, 0, 0, 0, $flags)
        }
        [void][SceneCaptureDesktop]::SetForegroundWindow($window)
        if ($Width -gt 0 -and $Height -gt 0) {
            [void][SceneCaptureDesktop]::SetCursorPos([int]($Width / 2), [int]($Height / 2))
        }
        Write-Output 'ok'
    }
    'restore' {
        foreach ($handle in (Get-TaskbarHandles)) { [void][SceneCaptureDesktop]::ShowWindow($handle, 5) }
        Write-Output 'ok'
    }
}

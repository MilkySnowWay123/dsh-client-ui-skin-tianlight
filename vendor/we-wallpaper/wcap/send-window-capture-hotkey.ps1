Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class WcapHotkey {
    [DllImport("user32.dll")]
    private static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extraInfo);

    public static void Send() {
        const uint KeyUp = 0x0002;
        const byte Control = 0x11;
        const byte LeftWindows = 0x5B;
        const byte PrintScreen = 0x2C;
        keybd_event(Control, 0, 0, UIntPtr.Zero);
        keybd_event(LeftWindows, 0, 0, UIntPtr.Zero);
        keybd_event(PrintScreen, 0, 0, UIntPtr.Zero);
        keybd_event(PrintScreen, 0, KeyUp, UIntPtr.Zero);
        keybd_event(LeftWindows, 0, KeyUp, UIntPtr.Zero);
        keybd_event(Control, 0, KeyUp, UIntPtr.Zero);
    }
}
'@

[WcapHotkey]::Send()

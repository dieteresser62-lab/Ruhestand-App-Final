' start_stealth.vbs
' Startet die CMD komplett unsichtbar (Parameter 0).
' Keine Angst, der Browser öffnet sich trotzdem.

Set WshShell = CreateObject("WScript.Shell")

' Die "0" am Ende ist der magische Unsichtbarkeits-Umhang.
' Wir rufen direkt deine CMD auf, die wiederum PowerShell ruft.
WshShell.Run chr(34) & "start_webserver.cmd" & chr(34), 0

Set WshShell = Nothing
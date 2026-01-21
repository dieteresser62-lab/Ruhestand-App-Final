@echo off
setlocal

rem Run the orchestrated build script with bypassed execution policy.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-tauri.ps1" %*

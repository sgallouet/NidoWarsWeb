@echo off
cd /d "%~dp0..\..\..\.."
python scripts\build-unitv2-frame-debug.py --unit gentle-mammoth
pause

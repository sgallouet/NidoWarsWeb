@echo off
setlocal
pushd "%~dp0..\..\..\.."
python scripts\build-unitv2-frame-debug.py --unit light-priest
set EXIT_CODE=%ERRORLEVEL%
popd
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Refresh failed with exit code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)
echo.
echo Light Priest previews and frame_selection_debug.png refreshed.
pause

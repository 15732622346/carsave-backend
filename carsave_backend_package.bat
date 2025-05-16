@echo off
echo Changing directory to carsave-backend...
cd /D "%~dp0"

echo Formatting and Linting carsave-backend project...
echo Running yarn lint...
call yarn lint --fix
IF ERRORLEVEL 1 (
    echo Linting failed for carsave-backend. Exiting.
    exit /b %ERRORLEVEL%
)
echo Running yarn format...
call yarn format

echo Building carsave-backend project (API)...
call yarn build

IF ERRORLEVEL 1 (
    echo Build failed for carsave-backend.
) ELSE (
    echo Build successful for carsave-backend. Output in dist/ directory.
) 
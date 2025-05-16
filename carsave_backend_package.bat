@echo off
echo Changing directory to carsave-backend...
cd /D "%~dp0"

echo Formatting and Linting carsave-backend project...
echo Running yarn lint...
yarn lint
echo Running yarn format...
yarn format

echo Building carsave-backend project (API)...
yarn build

IF ERRORLEVEL 1 (
    echo Build failed for carsave-backend.
) ELSE (
    echo Build successful for carsave-backend. Output in dist/ directory.
)
pause 
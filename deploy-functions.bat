@echo off
REM Alubarika Edge Functions Deployment Script
REM Run this in Command Prompt (not Supabase SQL Editor!)

echo ========================================
echo Deploying Alubarika Edge Functions
echo ========================================

REM Navigate to project folder
cd /d "%~dp0"

REM Install Supabase CLI if not installed
where supabase >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing Supabase CLI...
    winget install supabase.cli --accept-source-agreements --accept-package-agreements
)

REM Login to Supabase (if not already logged in)
echo.
echo Logging into Supabase...
supabase login

REM Link project
echo.
echo Linking project...
supabase link --project-ref fksciflwoszonudkpozz

REM Deploy all Edge Functions
echo.
echo Deploying register-user function...
supabase functions deploy register-user

echo.
echo Deploying username-login function...
supabase functions deploy username-login

echo.
echo Deploying account-recovery function...
supabase functions deploy account-recovery

echo.
echo Deploying complete-recovery function...
supabase functions deploy complete-recovery

echo.
echo ========================================
echo Deployment complete!
echo Try signing up now.
echo ========================================
pause

#!/bin/bash
echo 'Deploying Edge Functions...'
./supabase_local.exe functions deploy register-user --project-ref fksciflwoszonudkpozz
./supabase_local.exe functions deploy username-login --project-ref fksciflwoszonudkpozz
./supabase_local.exe functions deploy account-recovery --project-ref fksciflwoszonudkpozz
./supabase_local.exe functions deploy complete-recovery --project-ref fksciflwoszonudkpozz
echo 'Done!'

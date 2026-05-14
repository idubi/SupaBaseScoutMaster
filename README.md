# Scoutmaster Pro - Supabase Edition

This application has been migrated from a legacy Google Sheets backend to a robust Supabase (Postgres) infrastructure.

## Database Verification Suite

To verify the integrity of the Supabase connection and ensure all tables are accessible with full CRUD permissions, you can run the automated test suite.

### Prerequisite
Ensure the following environment variables are set:
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (required for bypassing matching RLS or executing maintenance tasks).

### Running the Tests
Execute the following command in the terminal:

```bash
npx tsx scripts/test-supabase-integrity.ts
```

Or via npm:

```bash
npm run test:db
```

### Health Check Endpoint
The application exposes a health check endpoint to monitor database table status in real-time:
`GET /api/health-check`

## Tables Mapping
- `scoutsmaster_ongoing`: Raw scouting data.
- `job_execution_logs`: Background process execution history.
- `system_settings`: Application configuration.
- `teams_grades`: Aggregated team performance scores.
- `auth_config`: User authorization and role mapping (REPLACING 'AUTH' excel sheet).

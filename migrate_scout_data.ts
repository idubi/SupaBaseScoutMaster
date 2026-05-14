
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL or SUPABASE_KEY is missing from environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbx81pGQn2uunIwycefDnEHzLY0tOfhyfSfrgqnXFVlSC0IMsHxzlfynZ3l-GLi7zGTF7Q/exec';
const SPREADSHEET_ID = '1AF7CpExwwMI2xDWMYxVkLq0UNls_VPEtwXUQkOMl9i8';

const SHEETS = [
  { name: 'scoutsmaster_ongoing', table: 'scoutsmaster_ongoing' },
  { name: 'JOB_EXECUTION_LOGS', table: 'job_execution_logs' },
  { name: 'SYSTEM_SETTINGS', table: 'system_settings' },
  { name: 'TEAMS_GRADES', table: 'teams_grades' },
  { name: 'AUTH', table: 'auth_config' } // Updated mapping
];

async function migrateData() {
  console.log("Starting migration from Google Sheets to Supabase...");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Supabase Key Length: ${SUPABASE_KEY.length}`);

  for (const sheet of SHEETS) {
    console.log(`\n--- Migrating sheet: ${sheet.name} to table: ${sheet.table} ---`);
    
    try {
      const url = `${GOOGLE_SHEET_URL}?targetSheetId=${SPREADSHEET_ID}&sheetName=${encodeURIComponent(sheet.name)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch ${sheet.name}: ${response.statusText}`);
        continue;
      }

      const data: any = await response.json();
      let records = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);

      if (sheet.name === 'AUTH') {
        console.log("RAW AUTH RECORDS:", JSON.stringify(records, null, 2));
      }

      if (records.length === 0) {
        console.log(`No records found for ${sheet.name}.`);
        continue;
      }

      console.log(`Fetched ${records.length} records. Cleaning and formatting...`);

      const cleanedRecords = records.map((record: any) => {
        const cleaned: any = {};
        let hasData = false;
        
        for (const key in record) {
          if (!key || key.trim() === '') continue; 
          let val = record[key];

          if (val !== null && val !== undefined && val !== '') {
            hasData = true;
          }
          
          // Convert numeric strings to numbers 
          if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)) && 
              !['sessionId', 'matchNumber', 'teamScouted', 'id', 'TeamNumber', 'teamNumber'].includes(key)) {
            val = Number(val);
          }

          // Handle Booleans
          if (val === 'TRUE' || val === 'true' || val === true) val = true;
          if (val === 'FALSE' || val === 'false' || val === false) val = false;

          // For timestamps - handle "28.4.2026, 21:32:31" format
          const isDateValue = typeof val === 'string' && (val.includes('.') && val.includes(',') && val.split('.').length >= 3);
          const isLikelyDateField = key.toLowerCase().includes('time') || key.toLowerCase().includes('timestamp') || key === 'Timestamp' || key === 'Date' || key === 'sessionStartTime' || key === 'sessionEndTime';

          if (isLikelyDateField || isDateValue) {
             if (val && typeof val === 'string') {
               const parts = val.split(',')[0].trim().split('.');
               if (parts.length === 3) {
                 const day = parts[0];
                 const month = parts[1];
                 const year = parts[2];
                 const time = val.split(',')[1] || '';
                 const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${(time && time.trim()) ? 'T' + time.trim() : ''}`;
                 const d = new Date(isoString);
                 if (!isNaN(d.getTime())) {
                   val = d.toISOString();
                 }
               } else {
                 const d = new Date(val);
                 if (!isNaN(d.getTime())) {
                   val = d.toISOString();
                 }
               }
             }
          }

          cleaned[key] = val;
        }
        return hasData ? cleaned : null;
      }).filter((r: any) => {
        if (!r) return false;
        if (sheet.table === 'auth_config' && !r.name) return false;
        if (sheet.table === 'system_settings' && !r.id) r.id = 1;
        if (sheet.table === 'teams_grades' && !r.TeamNumber) return false;
        return true;
      });

      console.log(`Processing ${cleanedRecords.length} cleaned records. Inserting into Supabase...`);

      const batchSize = 25; 
      for (let i = 0; i < cleanedRecords.length; i += batchSize) {
        let batch = cleanedRecords.slice(i, i + batchSize);
        
        let attempts = 0;
        let success = false;
        
        while (attempts < 5 && !success) {
          const upsertOptions: any = {};
          if (sheet.table === 'scoutsmaster_ongoing') {
            upsertOptions.onConflict = 'sessionId';
          }
          
          const { error } = await supabase.from(sheet.table).upsert(batch, upsertOptions);
          
          if (!error) {
            success = true;
            console.log(`Successfully synced ${sheet.table} batch ${Math.floor(i/batchSize) + 1}`);
          } else if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
            // Handle missing table or column
            if (error.code === 'PGRST204') {
              const match = error.message.match(/'(.+)' column/);
              if (match && match[1]) {
                const badCol = match[1];
                console.log(`Removing unknown column '${badCol}' and retrying...`);
                batch = batch.map(r => {
                  const { [badCol]: _, ...rest } = r;
                  return rest;
                });
                attempts++;
                continue;
              }
            }
            console.error(`Error in ${sheet.table}: ${error.message}`);
            console.log("TIP: Make sure you have executed the latest migration.sql in the Supabase SQL Editor.");
            break;
          } else if (error.code === '23505') {
             console.warn(`Unique violation in ${sheet.table}. One of the records already exists and wasn't upserted correctly.`);
             break;
          } else {
            console.error(`Error inserting batch into ${sheet.table}:`, error);
            break;
          }
        }
      }

    } catch (error) {
      console.error(`Unexpected error migrating ${sheet.name}:`, error);
    }
  }

  console.log("\nMigration completed!");
}

migrateData();

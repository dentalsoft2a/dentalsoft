import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TABLES_TO_BACKUP = [
  "profiles",
  "user_profiles",
  "dentist_accounts",
  "patients",
  "catalog_items",
  "resources",
  "resource_variants",
  "delivery_notes",
  "proformas",
  "proforma_items",
  "invoices",
  "invoice_payments",
  "credit_notes",
  "stock_movements",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting database backup...");

    const backup: Record<string, any[]> = {};
    const timestamp = new Date().toISOString();

    for (const table of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabase.from(table).select("*");

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          backup[table] = [];
        } else {
          backup[table] = data || [];
          console.log(`Backed up ${data?.length || 0} rows from ${table}`);
        }
      } catch (err) {
        console.error(`Exception backing up table ${table}:`, err);
        backup[table] = [];
      }
    }

    const backupData = {
      timestamp,
      version: "1.0",
      tables: backup,
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const backupBlob = new TextEncoder().encode(backupJson);

    const filename = `backup-${timestamp.split("T")[0]}-${Date.now()}.json`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("backups")
      .upload(filename, backupBlob, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading backup:", uploadError);
      throw uploadError;
    }

    console.log(`Backup completed: ${filename}`);

    const totalRows = Object.values(backup).reduce(
      (sum, rows) => sum + rows.length,
      0
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database backup completed successfully",
        filename,
        timestamp,
        totalTables: TABLES_TO_BACKUP.length,
        totalRows,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating backup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

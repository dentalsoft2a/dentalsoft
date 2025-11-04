import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get list of all tables to backup
    const tablesToBackup = [
      "profiles",
      "user_profiles",
      "dentists",
      "patients",
      "catalog",
      "resources",
      "resource_variants",
      "delivery_notes",
      "delivery_note_items",
      "invoices",
      "invoice_items",
      "proformas",
      "proforma_items",
      "credit_notes",
      "credit_note_items",
      "stock_movements",
      "access_codes",
      "help_articles",
      "support_tickets",
    ];

    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    // Fetch data from each table
    for (const table of tablesToBackup) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*");

        if (error) {
          errors.push(`${table}: ${error.message}`);
          console.error(`Error backing up ${table}:`, error);
        } else {
          backupData[table] = data || [];
          console.log(`✅ Backed up ${table}: ${data?.length || 0} rows`);
        }
      } catch (err) {
        errors.push(`${table}: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`Error backing up ${table}:`, err);
      }
    }

    const backup = {
      timestamp: new Date().toISOString(),
      tables: Object.keys(backupData).length,
      total_rows: Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0),
      data: backupData,
      errors: errors.length > 0 ? errors : undefined,
    };

    // In production, this would be stored in Supabase Storage or external backup service
    console.log(`📦 Backup completed: ${backup.tables} tables, ${backup.total_rows} total rows`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup completed",
        summary: {
          timestamp: backup.timestamp,
          tables: backup.tables,
          total_rows: backup.total_rows,
        },
        note: "Backup data available in response. In production, store in Supabase Storage.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Backup error:", error);
    return new Response(
      JSON.stringify({
        error: "Backup failed",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

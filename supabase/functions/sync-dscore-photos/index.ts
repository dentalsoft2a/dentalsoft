import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DScoreFile {
  id: string;
  dentistId: string;
  dentistName: string;
  dentistEmail: string;
  patientName: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  metadata?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dscoreApiUrl = Deno.env.get("DSCORE_API_URL") || "https://api.dscore.com";
    const { userId, manual } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const syncType = manual ? "manual" : "automatic";
    let filesRetrieved = 0;
    let filesFailed = 0;
    let errorMessage: string | null = null;

    const { data: credentials, error: credError } = await supabase
      .from("dscore_credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("is_connected", true)
      .maybeSingle();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: "DS-Core not connected" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let accessToken = credentials.access_token;
    const tokenExpiry = new Date(credentials.token_expiry);
    const now = new Date();

    if (now >= tokenExpiry) {
      const refreshResponse = await fetch(`${Deno.env.get("DSCORE_AUTH_URL")}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: credentials.refresh_token,
          client_id: Deno.env.get("DSCORE_CLIENT_ID"),
          client_secret: Deno.env.get("DSCORE_CLIENT_SECRET"),
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh DS-Core token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      await supabase
        .from("dscore_credentials")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || credentials.refresh_token,
          token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId);
    }

    const lastSync = credentials.last_sync_at ? new Date(credentials.last_sync_at) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      since: lastSync.toISOString(),
      limit: "100",
    });

    const filesResponse = await fetch(`${dscoreApiUrl}/v1/files/new?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!filesResponse.ok) {
      throw new Error("Failed to fetch files from DS-Core");
    }

    const filesData = await filesResponse.json();
    const files: DScoreFile[] = filesData.files || [];

    for (const file of files) {
      try {
        const { data: existingPhoto } = await supabase
          .from("photo_submissions")
          .select("id")
          .eq("dscore_id", file.id)
          .maybeSingle();

        if (existingPhoto) {
          continue;
        }

        const { data: mapping } = await supabase
          .from("dscore_dentist_mapping")
          .select("local_dentist_id")
          .eq("user_id", userId)
          .eq("dscore_dentist_id", file.dentistId)
          .maybeSingle();

        let localDentistId = mapping?.local_dentist_id;

        if (!localDentistId) {
          const { data: existingDentist } = await supabase
            .from("dentist_accounts")
            .select("id")
            .eq("email", file.dentistEmail)
            .maybeSingle();

          if (existingDentist) {
            localDentistId = existingDentist.id;
          } else {
            const { data: newDentist, error: dentistError } = await supabase
              .from("dentist_accounts")
              .insert({
                name: file.dentistName,
                email: file.dentistEmail,
              })
              .select("id")
              .single();

            if (dentistError) {
              console.error("Failed to create dentist account:", dentistError);
              filesFailed++;
              continue;
            }

            localDentistId = newDentist.id;
          }

          await supabase
            .from("dscore_dentist_mapping")
            .upsert({
              user_id: userId,
              dscore_dentist_id: file.dentistId,
              dscore_dentist_name: file.dentistName,
              dscore_dentist_email: file.dentistEmail,
              local_dentist_id: localDentistId,
              auto_created: !mapping,
            });
        }

        const downloadResponse = await fetch(file.fileUrl, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (!downloadResponse.ok) {
          throw new Error("Failed to download file");
        }

        const blob = await downloadResponse.blob();
        const fileExtension = file.fileName.split(".").pop() || "jpg";
        const storagePath = `${userId}/${file.id}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("dentist-photos")
          .upload(storagePath, blob, {
            contentType: file.fileType,
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          filesFailed++;
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("dentist-photos")
          .getPublicUrl(storagePath);

        const { error: insertError } = await supabase
          .from("photo_submissions")
          .insert({
            dentist_id: localDentistId,
            laboratory_id: userId,
            patient_name: file.patientName,
            photo_url: publicUrl,
            notes: `Synchronisé depuis DS-Core - ${file.fileName}`,
            status: "pending",
            source: "dscore",
            dscore_id: file.id,
            dscore_metadata: file.metadata || {},
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          filesFailed++;
        } else {
          filesRetrieved++;
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.id}:`, fileError);
        filesFailed++;
      }
    }

    await supabase
      .from("dscore_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    const status = filesFailed === 0 ? "success" : (filesRetrieved > 0 ? "partial" : "failed");

    await supabase
      .from("dscore_sync_log")
      .insert({
        user_id: userId,
        sync_type: syncType,
        status,
        files_retrieved: filesRetrieved,
        files_failed: filesFailed,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({
        success: true,
        filesRetrieved,
        filesFailed,
        totalFiles: files.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

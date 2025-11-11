import { supabase } from '../lib/supabase';

export interface ThreeShapeCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ThreeShapeFile {
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

export interface ThreeShapeDentist {
  id: string;
  name: string;
  email: string;
  practice?: string;
}

class ThreeShapeApiService {
  private baseUrl: string;
  private authUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_3SHAPE_API_URL || 'https://api.3shapecommunicate.com';
    this.authUrl = import.meta.env.VITE_3SHAPE_AUTH_URL || 'https://auth.3shapecommunicate.com';
    this.clientId = import.meta.env.VITE_3SHAPE_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_3SHAPE_CLIENT_SECRET || '';
  }

  async getAuthorizationUrl(userId: string): Promise<string> {
    const redirectUri = import.meta.env.VITE_3SHAPE_CALLBACK_URL;
    const state = btoa(JSON.stringify({ userId, timestamp: Date.now() }));

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: state,
      scope: 'read:files read:cases read:dentists',
    });

    return `${this.authUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<ThreeShapeCredentials> {
    const redirectUri = import.meta.env.VITE_3SHAPE_CALLBACK_URL;

    const response = await fetch(`${this.authUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ThreeShapeCredentials> {
    const response = await fetch(`${this.authUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const { data: credentials, error } = await supabase
      .from('threeshape_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !credentials) {
      throw new Error('3Shape Communicate not connected. Please connect in Settings.');
    }

    const now = new Date();
    const expiryDate = new Date(credentials.token_expiry);

    if (now >= expiryDate) {
      const newCredentials = await this.refreshAccessToken(credentials.refresh_token);

      await supabase
        .from('threeshape_credentials')
        .update({
          access_token: newCredentials.accessToken,
          refresh_token: newCredentials.refreshToken,
          token_expiry: newCredentials.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return newCredentials.accessToken;
    }

    return credentials.access_token;
  }

  async fetchNewFiles(userId: string, since?: Date): Promise<ThreeShapeFile[]> {
    const accessToken = await this.getValidAccessToken(userId);

    const params = new URLSearchParams();
    if (since) {
      params.append('since', since.toISOString());
    }
    params.append('limit', '100');

    const response = await fetch(`${this.baseUrl}/v1/files/new?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch files from 3Shape Communicate: ${error}`);
    }

    const data = await response.json();

    return data.files.map((file: any) => ({
      id: file.id,
      dentistId: file.dentist_id,
      dentistName: file.dentist_name,
      dentistEmail: file.dentist_email,
      patientName: file.patient_name,
      fileName: file.file_name,
      fileUrl: file.file_url,
      fileType: file.file_type,
      fileSize: file.file_size,
      uploadedAt: file.uploaded_at,
      metadata: file.metadata,
    }));
  }

  async downloadFile(userId: string, fileUrl: string): Promise<Blob> {
    const accessToken = await this.getValidAccessToken(userId);

    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file from 3Shape Communicate`);
    }

    return await response.blob();
  }

  async getDentists(userId: string): Promise<ThreeShapeDentist[]> {
    const accessToken = await this.getValidAccessToken(userId);

    const response = await fetch(`${this.baseUrl}/v1/dentists`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch dentists from 3Shape Communicate: ${error}`);
    }

    const data = await response.json();

    return data.dentists.map((dentist: any) => ({
      id: dentist.id,
      name: dentist.name,
      email: dentist.email,
      practice: dentist.practice,
    }));
  }

  async saveCredentials(
    userId: string,
    credentials: ThreeShapeCredentials
  ): Promise<void> {
    const { error } = await supabase
      .from('threeshape_credentials')
      .upsert({
        user_id: userId,
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        token_expiry: credentials.expiresAt.toISOString(),
        is_connected: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to save 3Shape Communicate credentials: ${error.message}`);
    }
  }

  async disconnect3Shape(userId: string): Promise<void> {
    const { error } = await supabase
      .from('threeshape_credentials')
      .update({
        is_connected: false,
        access_token: null,
        refresh_token: null,
        token_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to disconnect 3Shape Communicate: ${error.message}`);
    }
  }

  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    lastSync?: Date;
    autoSyncEnabled: boolean;
  }> {
    const { data, error } = await supabase
      .from('threeshape_credentials')
      .select('is_connected, last_sync_at, auto_sync_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return { connected: false, autoSyncEnabled: false };
    }

    return {
      connected: data.is_connected,
      lastSync: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
      autoSyncEnabled: data.auto_sync_enabled,
    };
  }

  async updateLastSync(userId: string): Promise<void> {
    await supabase
      .from('threeshape_credentials')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  async toggleAutoSync(userId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('threeshape_credentials')
      .update({
        auto_sync_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to toggle auto-sync: ${error.message}`);
    }
  }

  async logSync(
    userId: string,
    syncType: 'manual' | 'automatic' | 'scheduled',
    status: 'success' | 'partial' | 'failed',
    filesRetrieved: number,
    filesFailed: number,
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('threeshape_sync_log')
      .insert({
        user_id: userId,
        sync_type: syncType,
        status,
        files_retrieved: filesRetrieved,
        files_failed: filesFailed,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });
  }
}

export const threeshapeApi = new ThreeShapeApiService();

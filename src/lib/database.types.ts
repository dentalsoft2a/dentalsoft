export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          laboratory_name: string
          laboratory_logo_url: string | null
          laboratory_address: string | null
          laboratory_phone: string | null
          laboratory_email: string | null
          laboratory_rcs: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          laboratory_name: string
          laboratory_logo_url?: string | null
          laboratory_address?: string | null
          laboratory_phone?: string | null
          laboratory_email?: string | null
          laboratory_rcs?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          laboratory_name?: string
          laboratory_logo_url?: string | null
          laboratory_address?: string | null
          laboratory_phone?: string | null
          laboratory_email?: string | null
          laboratory_rcs?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dentists: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proformas: {
        Row: {
          id: string
          user_id: string
          dentist_id: string
          proforma_number: string
          date: string
          status: 'pending' | 'validated' | 'invoiced'
          notes: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dentist_id: string
          proforma_number: string
          date?: string
          status?: 'pending' | 'validated' | 'invoiced'
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dentist_id?: string
          proforma_number?: string
          date?: string
          status?: 'pending' | 'validated' | 'invoiced'
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
      proforma_items: {
        Row: {
          id: string
          proforma_id: string
          description: string
          quantity: number
          unit_price: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          proforma_id: string
          description: string
          quantity?: number
          unit_price: number
          total: number
          created_at?: string
        }
        Update: {
          id?: string
          proforma_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total?: number
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          dentist_id: string
          invoice_number: string
          date: string
          month: number
          year: number
          status: 'draft' | 'sent' | 'paid'
          notes: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dentist_id: string
          invoice_number: string
          date?: string
          month: number
          year: number
          status?: 'draft' | 'sent' | 'paid'
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dentist_id?: string
          invoice_number?: string
          date?: string
          month?: number
          year?: number
          status?: 'draft' | 'sent' | 'paid'
          notes?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
      invoice_proformas: {
        Row: {
          id: string
          invoice_id: string
          proforma_id: string
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          proforma_id: string
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          proforma_id?: string
          created_at?: string
        }
      }
      delivery_notes: {
        Row: {
          id: string
          user_id: string
          dentist_id: string
          proforma_id: string | null
          delivery_number: string
          date: string
          items: Json
          compliance_text: string | null
          signature: string | null
          status: 'pending' | 'in_progress' | 'completed'
          prescription_date: string | null
          patient_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dentist_id: string
          proforma_id?: string | null
          delivery_number: string
          date?: string
          items?: Json
          compliance_text?: string | null
          signature?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          prescription_date?: string | null
          patient_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dentist_id?: string
          proforma_id?: string | null
          delivery_number?: string
          date?: string
          items?: Json
          compliance_text?: string | null
          signature?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          prescription_date?: string | null
          patient_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          role: string
          subscription_status: string | null
          subscription_plan: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          subscription_ends_at: string | null
          created_at: string
          updated_at: string
          subscription_start_date: string | null
          subscription_end_date: string | null
          trial_used: boolean
        }
        Insert: {
          id: string
          email: string
          role?: string
          subscription_status?: string | null
          subscription_plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          subscription_ends_at?: string | null
          created_at?: string
          updated_at?: string
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          trial_used?: boolean
        }
        Update: {
          id?: string
          email?: string
          role?: string
          subscription_status?: string | null
          subscription_plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          subscription_ends_at?: string | null
          created_at?: string
          updated_at?: string
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          trial_used?: boolean
        }
      }
    }
  }
}

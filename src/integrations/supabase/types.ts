export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_allowed_ips: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          ip_address: string
          label: string | null
          notes: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          ip_address: string
          label?: string | null
          notes?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          label?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          row_count: number | null
          target: string | null
        }
        Insert: {
          action: string
          actor_email: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          row_count?: number | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          row_count?: number | null
          target?: string | null
        }
        Relationships: []
      }
      admin_landmarks: {
        Row: {
          address: string
          country: string | null
          created_at: string
          created_by_email: string | null
          id: string
          lat: number
          lga: string | null
          lng: number
          name: string
          postcode: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address: string
          country?: string | null
          created_at?: string
          created_by_email?: string | null
          id?: string
          lat: number
          lga?: string | null
          lng: number
          name: string
          postcode: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          country?: string | null
          created_at?: string
          created_by_email?: string | null
          id?: string
          lat?: number
          lga?: string | null
          lng?: number
          name?: string
          postcode?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_staff: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          pin: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          pin: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          pin?: string
        }
        Relationships: []
      }
      allowed_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      banned_identifiers: {
        Row: {
          banned_by: string | null
          banned_user_id: string | null
          created_at: string
          id: string
          kind: string
          reason: string | null
          value: string
        }
        Insert: {
          banned_by?: string | null
          banned_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          reason?: string | null
          value: string
        }
        Update: {
          banned_by?: string | null
          banned_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          reason?: string | null
          value?: string
        }
        Relationships: []
      }
      business_branding: {
        Row: {
          brand_color: string | null
          brand_name: string | null
          business_user_id: string
          created_at: string
          id: string
          logo_url: string | null
          show_rating: boolean | null
          show_tip_jar: boolean | null
          support_email: string | null
          support_phone: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          brand_name?: string | null
          business_user_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          show_rating?: boolean | null
          show_tip_jar?: boolean | null
          support_email?: string | null
          support_phone?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          brand_name?: string | null
          business_user_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          show_rating?: boolean | null
          show_tip_jar?: boolean | null
          support_email?: string | null
          support_phone?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_earnings: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          type?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: []
      }
      business_riders: {
        Row: {
          business_user_id: string
          created_at: string
          email: string | null
          failed_deliveries: number | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_postcode: string | null
          last_seen: string | null
          linked_rider_id: string | null
          location: string | null
          location_sharing: boolean
          rider_live_status: string
          rider_name: string
          rider_phone: string
          status: string
          successful_deliveries: number | null
          total_deliveries: number | null
          vehicle_type: string | null
          worker_type: string | null
        }
        Insert: {
          business_user_id: string
          created_at?: string
          email?: string | null
          failed_deliveries?: number | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_postcode?: string | null
          last_seen?: string | null
          linked_rider_id?: string | null
          location?: string | null
          location_sharing?: boolean
          rider_live_status?: string
          rider_name: string
          rider_phone: string
          status?: string
          successful_deliveries?: number | null
          total_deliveries?: number | null
          vehicle_type?: string | null
          worker_type?: string | null
        }
        Update: {
          business_user_id?: string
          created_at?: string
          email?: string | null
          failed_deliveries?: number | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_postcode?: string | null
          last_seen?: string | null
          linked_rider_id?: string | null
          location?: string | null
          location_sharing?: boolean
          rider_live_status?: string
          rider_name?: string
          rider_phone?: string
          status?: string
          successful_deliveries?: number | null
          total_deliveries?: number | null
          vehicle_type?: string | null
          worker_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_riders_business_user_id_fkey"
            columns: ["business_user_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_riders_linked_rider_id_fkey"
            columns: ["linked_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          account_type: string | null
          auto_renew: boolean
          billing_cycle: string
          billing_method: string | null
          business_user_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          next_renewal_at: string | null
          next_renewal_discount_percent: number
          next_renewal_discount_source: string | null
          payment_method_id: string | null
          plan_code: string
          setup_intent_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          auto_renew?: boolean
          billing_cycle: string
          billing_method?: string | null
          business_user_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_renewal_at?: string | null
          next_renewal_discount_percent?: number
          next_renewal_discount_source?: string | null
          payment_method_id?: string | null
          plan_code: string
          setup_intent_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          billing_method?: string | null
          business_user_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_renewal_at?: string | null
          next_renewal_discount_percent?: number
          next_renewal_discount_source?: string | null
          payment_method_id?: string | null
          plan_code?: string
          setup_intent_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_wallets: {
        Row: {
          balance_ngn: number
          business_user_id: string
          created_at: string
          currency: string
          id: string
          updated_at: string
        }
        Insert: {
          balance_ngn?: number
          business_user_id: string
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance_ngn?: number
          business_user_id?: string
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coordinate_postcode_cache: {
        Row: {
          address: string | null
          area: string | null
          country: string | null
          country_code: string
          created_at: string
          id: string
          is_generated: boolean
          lat_key: number
          lga: string | null
          lng_key: number
          postcode: string
          road: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          country?: string | null
          country_code: string
          created_at?: string
          id?: string
          is_generated?: boolean
          lat_key: number
          lga?: string | null
          lng_key: number
          postcode: string
          road?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          country?: string | null
          country_code?: string
          created_at?: string
          id?: string
          is_generated?: boolean
          lat_key?: number
          lga?: string | null
          lng_key?: number
          postcode?: string
          road?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_ratings: {
        Row: {
          business_rider_id: string | null
          business_user_id: string
          comment: string | null
          created_at: string
          customer_name: string | null
          delivery_id: string
          id: string
          rating: number
          share_code: string
          tip_amount: number | null
        }
        Insert: {
          business_rider_id?: string | null
          business_user_id: string
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          delivery_id: string
          id?: string
          rating: number
          share_code: string
          tip_amount?: number | null
        }
        Update: {
          business_rider_id?: string | null
          business_user_id?: string
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          delivery_id?: string
          id?: string
          rating?: number
          share_code?: string
          tip_amount?: number | null
        }
        Relationships: []
      }
      delivery_trackings: {
        Row: {
          business_rider_id: string
          business_user_id: string
          cod_amount: number | null
          cod_collected: boolean | null
          cod_collected_at: string | null
          cod_settled: boolean | null
          cod_settled_at: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          delivery_fee: number | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_delivery: string | null
          eta_minutes: number | null
          failure_reason: string | null
          from_postcode: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_postcode: string | null
          notes: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          proof_photo_url: string | null
          rider_name: string | null
          rider_phone: string | null
          share_code: string
          signature_data: string | null
          status: string
          tip_amount: number | null
          to_postcode: string | null
          updated_at: string | null
        }
        Insert: {
          business_rider_id: string
          business_user_id: string
          cod_amount?: number | null
          cod_collected?: boolean | null
          cod_collected_at?: string | null
          cod_settled?: boolean | null
          cod_settled_at?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_fee?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_delivery?: string | null
          eta_minutes?: number | null
          failure_reason?: string | null
          from_postcode?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_postcode?: string | null
          notes?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          proof_photo_url?: string | null
          rider_name?: string | null
          rider_phone?: string | null
          share_code: string
          signature_data?: string | null
          status?: string
          tip_amount?: number | null
          to_postcode?: string | null
          updated_at?: string | null
        }
        Update: {
          business_rider_id?: string
          business_user_id?: string
          cod_amount?: number | null
          cod_collected?: boolean | null
          cod_collected_at?: string | null
          cod_settled?: boolean | null
          cod_settled_at?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_delivery?: string | null
          eta_minutes?: number | null
          failure_reason?: string | null
          from_postcode?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_postcode?: string | null
          notes?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          proof_photo_url?: string | null
          rider_name?: string | null
          rider_phone?: string | null
          share_code?: string
          signature_data?: string | null
          status?: string
          tip_amount?: number | null
          to_postcode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_trackings_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "business_riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_trackings_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          base_fee: number
          business_user_id: string
          center_lat: number
          center_lng: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          per_km_fee: number
          radius_km: number
          surge_multiplier: number
        }
        Insert: {
          base_fee?: number
          business_user_id: string
          center_lat: number
          center_lng: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          per_km_fee?: number
          radius_km?: number
          surge_multiplier?: number
        }
        Update: {
          base_fee?: number
          business_user_id?: string
          center_lat?: number
          center_lng?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          per_km_fee?: number
          radius_km?: number
          surge_multiplier?: number
        }
        Relationships: []
      }
      device_referral_aliases: {
        Row: {
          alias_device_id: string
          canonical_referral_id: string
          created_at: string
          id: string
          referral_code: string
          updated_at: string
        }
        Insert: {
          alias_device_id: string
          canonical_referral_id: string
          created_at?: string
          id?: string
          referral_code: string
          updated_at?: string
        }
        Update: {
          alias_device_id?: string
          canonical_referral_id?: string
          created_at?: string
          id?: string
          referral_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_referral_aliases_canonical_referral_id_fkey"
            columns: ["canonical_referral_id"]
            isOneToOne: false
            referencedRelation: "device_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      device_referral_claims: {
        Row: {
          amount: number
          created_at: string
          id: string
          referred_device_id: string
          referred_ip: string | null
          referrer_code: string
          referrer_device_id: string
          trigger_event: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          referred_device_id: string
          referred_ip?: string | null
          referrer_code: string
          referrer_device_id: string
          trigger_event?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          referred_device_id?: string
          referred_ip?: string | null
          referrer_code?: string
          referrer_device_id?: string
          trigger_event?: string
        }
        Relationships: []
      }
      device_referrals: {
        Row: {
          balance: number
          created_at: string
          device_id: string
          id: string
          ip_address: string | null
          referral_code: string
          total_earned: number
          total_referrals: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          device_id: string
          id?: string
          ip_address?: string | null
          referral_code: string
          total_earned?: number
          total_referrals?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          device_id?: string
          id?: string
          ip_address?: string | null
          referral_code?: string
          total_earned?: number
          total_referrals?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          is_primary: boolean | null
          name: string
          phone: string
          relationship: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          is_primary?: boolean | null
          name: string
          phone: string
          relationship?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string
          relationship?: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          accuracy: number
          category: string
          created_at: string
          difficulty: string
          id: string
          ip_address: string | null
          name: string
          score: number
        }
        Insert: {
          accuracy?: number
          category: string
          created_at?: string
          difficulty?: string
          id?: string
          ip_address?: string | null
          name: string
          score?: number
        }
        Update: {
          accuracy?: number
          category?: string
          created_at?: string
          difficulty?: string
          id?: string
          ip_address?: string | null
          name?: string
          score?: number
        }
        Relationships: []
      }
      mcp_postcode_lookups: {
        Row: {
          address: string | null
          area_code: string
          created_at: string
          id: string
          label: string | null
          latitude: number
          longitude: number
          postcode: string
          source: string
          state: string
          user_id: string
        }
        Insert: {
          address?: string | null
          area_code: string
          created_at?: string
          id?: string
          label?: string | null
          latitude: number
          longitude: number
          postcode: string
          source?: string
          state: string
          user_id: string
        }
        Update: {
          address?: string | null
          area_code?: string
          created_at?: string
          id?: string
          label?: string | null
          latitude?: number
          longitude?: number
          postcode?: string
          source?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_bank_transfers: {
        Row: {
          admin_note: string | null
          amount_ngn: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          paga_fee_ngn: number
          proof_url: string | null
          reference_code: string
          status: string
          updated_at: string
          user_id: string
          wallet_credit_ngn: number
        }
        Insert: {
          admin_note?: string | null
          amount_ngn: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          paga_fee_ngn?: number
          proof_url?: string | null
          reference_code: string
          status?: string
          updated_at?: string
          user_id: string
          wallet_credit_ngn: number
        }
        Update: {
          admin_note?: string | null
          amount_ngn?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          paga_fee_ngn?: number
          proof_url?: string | null
          reference_code?: string
          status?: string
          updated_at?: string
          user_id?: string
          wallet_credit_ngn?: number
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          id: string
          stat_key: string
          stat_value: number
          updated_at: string
        }
        Insert: {
          id?: string
          stat_key: string
          stat_value?: number
          updated_at?: string
        }
        Update: {
          id?: string
          stat_key?: string
          stat_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      postcode_history: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          id: string
          lat: number
          lga: string | null
          lng: number
          postcode: string
          source: string
          state: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          id?: string
          lat: number
          lga?: string | null
          lng: number
          postcode: string
          source?: string
          state?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          id?: string
          lat?: number
          lga?: string | null
          lng?: number
          postcode?: string
          source?: string
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      postcodes: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          lat: number
          lga: string | null
          lng: number
          postcode: string
          state: string
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          lat: number
          lga?: string | null
          lng: number
          postcode: string
          state: string
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          lat?: number
          lga?: string | null
          lng?: number
          postcode?: string
          state?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          lat: number
          lga_name: string | null
          lga_number: number | null
          lng: number
          location: unknown
          postcode: string
          raw_lat: number
          raw_lng: number
          state_name: string | null
          state_number: number | null
          ward_number: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat: number
          lga_name?: string | null
          lga_number?: number | null
          lng: number
          location?: unknown
          postcode: string
          raw_lat: number
          raw_lng: number
          state_name?: string | null
          state_number?: number | null
          ward_number?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number
          lga_name?: string | null
          lga_number?: number | null
          lng?: number
          location?: unknown
          postcode?: string
          raw_lat?: number
          raw_lng?: number
          state_name?: string | null
          state_number?: number | null
          ward_number?: number | null
        }
        Relationships: []
      }
      quiz_balance_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          play_id: string | null
          reason: string
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          play_id?: string | null
          reason: string
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          play_id?: string | null
          reason?: string
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: []
      }
      quiz_play_log: {
        Row: {
          id: string
          ip_address: string | null
          play_date: string
          played_at: string
          score: number
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          play_date?: string
          played_at?: string
          score?: number
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          play_date?: string
          played_at?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          credited_at: string | null
          credits_earned: number
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          credited_at?: string | null
          credits_earned?: number
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          credited_at?: string | null
          credits_earned?: number
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      rider_delivery_logs: {
        Row: {
          business_rider_id: string
          business_user_id: string
          cod_amount: number | null
          cod_collected: boolean | null
          created_at: string
          customer_name: string
          failure_reason: string | null
          from_postcode: string | null
          id: string
          notes: string | null
          signature_data: string | null
          status: string
          to_postcode: string | null
        }
        Insert: {
          business_rider_id: string
          business_user_id: string
          cod_amount?: number | null
          cod_collected?: boolean | null
          created_at?: string
          customer_name: string
          failure_reason?: string | null
          from_postcode?: string | null
          id?: string
          notes?: string | null
          signature_data?: string | null
          status?: string
          to_postcode?: string | null
        }
        Update: {
          business_rider_id?: string
          business_user_id?: string
          cod_amount?: number | null
          cod_collected?: boolean | null
          created_at?: string
          customer_name?: string
          failure_reason?: string | null
          from_postcode?: string | null
          id?: string
          notes?: string | null
          signature_data?: string | null
          status?: string
          to_postcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_delivery_logs_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "business_riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_delivery_logs_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_join_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          initiator: string
          rider_id: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          initiator?: string
          rider_id: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          initiator?: string
          rider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_join_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_join_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_messages: {
        Row: {
          business_rider_id: string
          business_user_id: string
          created_at: string
          direction: string
          id: string
          message: string
        }
        Insert: {
          business_rider_id: string
          business_user_id: string
          created_at?: string
          direction?: string
          id?: string
          message: string
        }
        Update: {
          business_rider_id?: string
          business_user_id?: string
          created_at?: string
          direction?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_messages_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "business_riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_messages_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_referrals: {
        Row: {
          account_type: string
          created_at: string
          credited_at: string | null
          credits_earned: number
          first_delivery_at: string | null
          id: string
          referral_code: string
          referred_rider_id: string
          referred_user_id: string
          referrer_rider_id: string
          referrer_user_id: string
          signup_at: string
          status: string
          subscribed_at: string | null
        }
        Insert: {
          account_type: string
          created_at?: string
          credited_at?: string | null
          credits_earned?: number
          first_delivery_at?: string | null
          id?: string
          referral_code: string
          referred_rider_id: string
          referred_user_id: string
          referrer_rider_id: string
          referrer_user_id: string
          signup_at?: string
          status?: string
          subscribed_at?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string
          credited_at?: string | null
          credits_earned?: number
          first_delivery_at?: string | null
          id?: string
          referral_code?: string
          referred_rider_id?: string
          referred_user_id?: string
          referrer_rider_id?: string
          referrer_user_id?: string
          signup_at?: string
          status?: string
          subscribed_at?: string | null
        }
        Relationships: []
      }
      rider_shifts: {
        Row: {
          business_rider_id: string | null
          business_user_id: string | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          rider_user_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          business_rider_id?: string | null
          business_user_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          rider_user_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          business_rider_id?: string | null
          business_user_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          rider_user_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_shifts_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "business_riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_shifts_business_rider_id_fkey"
            columns: ["business_rider_id"]
            isOneToOne: false
            referencedRelation: "public_rider_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          account_type: string
          auto_assign_enabled: boolean | null
          auto_assign_radius_km: number | null
          ban_reason: string | null
          banned_at: string | null
          bike_owner: string | null
          business_code: string | null
          business_name: string | null
          business_size: string | null
          cac_number: string | null
          created_at: string
          full_name: string
          id: string
          is_banned: boolean
          location: string
          phone: string
          postcode: string | null
          push_token: string | null
          referral_code: string | null
          rider_mode: string | null
          signup_ip: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_used: boolean
          user_id: string
          vehicle_type: string | null
          worker_type: string | null
        }
        Insert: {
          account_type?: string
          auto_assign_enabled?: boolean | null
          auto_assign_radius_km?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          bike_owner?: string | null
          business_code?: string | null
          business_name?: string | null
          business_size?: string | null
          cac_number?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_banned?: boolean
          location?: string
          phone: string
          postcode?: string | null
          push_token?: string | null
          referral_code?: string | null
          rider_mode?: string | null
          signup_ip?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_used?: boolean
          user_id: string
          vehicle_type?: string | null
          worker_type?: string | null
        }
        Update: {
          account_type?: string
          auto_assign_enabled?: boolean | null
          auto_assign_radius_km?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          bike_owner?: string | null
          business_code?: string | null
          business_name?: string | null
          business_size?: string | null
          cac_number?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_banned?: boolean
          location?: string
          phone?: string
          postcode?: string | null
          push_token?: string | null
          referral_code?: string | null
          rider_mode?: string | null
          signup_ip?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_used?: boolean
          user_id?: string
          vehicle_type?: string | null
          worker_type?: string | null
        }
        Relationships: []
      }
      saved_postcodes: {
        Row: {
          address: string | null
          created_at: string
          id: string
          label: string
          lat: number
          lng: number
          postcode: string
          state: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          label: string
          lat: number
          lng: number
          postcode: string
          state?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          label?: string
          lat?: number
          lng?: number
          postcode?: string
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          lat: number | null
          lng: number | null
          postcode: string | null
          trigger_type: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          postcode?: string | null
          trigger_type?: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          postcode?: string | null
          trigger_type?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          account_reference: string | null
          amount_ngn: number
          billing_cycle: string
          checkout_url: string | null
          created_at: string
          id: string
          mandate_status: string | null
          paga_reference: string
          paga_transaction_id: string | null
          paid_at: string | null
          plan_code: string
          raw_request: Json | null
          raw_response: Json | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          account_reference?: string | null
          amount_ngn: number
          billing_cycle: string
          checkout_url?: string | null
          created_at?: string
          id?: string
          mandate_status?: string | null
          paga_reference: string
          paga_transaction_id?: string | null
          paid_at?: string | null
          plan_code: string
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          account_reference?: string | null
          amount_ngn?: number
          billing_cycle?: string
          checkout_url?: string | null
          created_at?: string
          id?: string
          mandate_status?: string | null
          paga_reference?: string
          paga_transaction_id?: string | null
          paid_at?: string | null
          plan_code?: string
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_price_ngn: number
          category: string
          code: string
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          monthly_price_ngn: number
          name: string
          sort_order: number
        }
        Insert: {
          annual_price_ngn: number
          category: string
          code: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          monthly_price_ngn: number
          name: string
          sort_order?: number
        }
        Update: {
          annual_price_ngn?: number
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          monthly_price_ngn?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_reference: string | null
          auto_renew: boolean
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          mandate_status: string | null
          paga_persistent_account: string | null
          payer_bank_account_number: string | null
          payer_bank_id: string | null
          payer_bank_name: string | null
          plan_code: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_reference?: string | null
          auto_renew?: boolean
          billing_cycle: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mandate_status?: string | null
          paga_persistent_account?: string | null
          payer_bank_account_number?: string | null
          payer_bank_id?: string | null
          payer_bank_name?: string | null
          plan_code: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_reference?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mandate_status?: string | null
          paga_persistent_account?: string | null
          payer_bank_account_number?: string | null
          payer_bank_id?: string | null
          payer_bank_name?: string | null
          plan_code?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tracking_points: {
        Row: {
          id: string
          lat: number
          lng: number
          postcode: string | null
          recorded_at: string | null
          session_id: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          postcode?: string | null
          recorded_at?: string | null
          session_id: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          postcode?: string | null
          recorded_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_points_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sessions: {
        Row: {
          device_id: string
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_lat: number | null
          last_lng: number | null
          last_updated: string | null
          share_code: string
          started_at: string | null
        }
        Insert: {
          device_id: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_lat?: number | null
          last_lng?: number | null
          last_updated?: string | null
          share_code: string
          started_at?: string | null
        }
        Update: {
          device_id?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          last_lat?: number | null
          last_lng?: number | null
          last_updated?: string | null
          share_code?: string
          started_at?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referral_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          migrated_from_device_id: string | null
          referral_code: string
          total_earned: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          migrated_from_device_id?: string | null
          referral_code: string
          total_earned?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          migrated_from_device_id?: string | null
          referral_code?: string
          total_earned?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          admin_note: string | null
          amount: number
          business_user_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string
          payment_provider: string | null
          provider_reference: string | null
          reference_code: string | null
          status: string
          subscription_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          business_user_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method: string
          payment_provider?: string | null
          provider_reference?: string | null
          reference_code?: string | null
          status?: string
          subscription_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          business_user_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_provider?: string | null
          provider_reference?: string | null
          reference_code?: string | null
          status?: string
          subscription_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_shares: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          ip_address: string | null
          recipient_phone: string
          share_message: string | null
          user_agent: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          recipient_phone: string
          share_message?: string | null
          user_agent?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          recipient_phone?: string
          share_message?: string | null
          user_agent?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          amount: number
          created_at: string
          email: string
          full_name: string
          id: string
          ip_address: string | null
          network_provider: string
          phone: string
          postcode: string
          source: string
          state_of_residence: string
          status: string
          type: string
        }
        Insert: {
          address: string
          amount: number
          created_at?: string
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          network_provider: string
          phone: string
          postcode: string
          source?: string
          state_of_residence: string
          status?: string
          type: string
        }
        Update: {
          address?: string
          amount?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          network_provider?: string
          phone?: string
          postcode?: string
          source?: string
          state_of_residence?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_leaderboard: {
        Row: {
          accuracy: number | null
          category: string | null
          created_at: string | null
          difficulty: string | null
          id: string | null
          name: string | null
          score: number | null
        }
        Insert: {
          accuracy?: number | null
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string | null
          name?: string | null
          score?: number | null
        }
        Update: {
          accuracy?: number | null
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string | null
          name?: string | null
          score?: number | null
        }
        Relationships: []
      }
      public_rider_locations: {
        Row: {
          id: string | null
          last_lat: number | null
          last_lng: number | null
          last_postcode: string | null
          last_seen: string | null
          status: string | null
        }
        Insert: {
          id?: string | null
          last_lat?: number | null
          last_lng?: number | null
          last_postcode?: string | null
          last_seen?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          last_lat?: number | null
          last_lng?: number | null
          last_postcode?: string | null
          last_seen?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _send_payment_failed_email: {
        Args: {
          _amount_ngn: number
          _invoice_ref: string
          _outcome: string
          _user_id: string
        }
        Returns: undefined
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_add_allowed_country: {
        Args: {
          _admin_email?: string
          _admin_pin?: string
          _country_code: string
          _country_name: string
        }
        Returns: {
          country_code: string
          country_name: string
          created_at: string
          id: string
        }
        SetofOptions: {
          from: "*"
          to: "allowed_countries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_ban_account: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_ban_account_by_email:
        | { Args: { p_email: string; p_reason: string }; Returns: Json }
        | {
            Args: {
              p_admin_email?: string
              p_admin_pin?: string
              p_email: string
              p_reason: string
            }
            Returns: Json
          }
      admin_broadcast_notification: {
        Args: {
          _admin_email?: string
          _admin_pin?: string
          _audience?: string
          _body?: string
          _kind?: string
          _title?: string
        }
        Returns: Json
      }
      admin_can_manage_with_pin: {
        Args: { _admin_email: string; _admin_pin: string }
        Returns: boolean
      }
      admin_create_pending_withdrawal: {
        Args: {
          _address: string
          _amount: number
          _email: string
          _full_name: string
          _network_provider: string
          _phone: string
          _postcode: string
          _state_of_residence: string
          _type: string
        }
        Returns: string
      }
      admin_create_staff: {
        Args: {
          _admin_email: string
          _email: string
          _name: string
          _new_pin: string
        }
        Returns: Json
      }
      admin_delete_allowed_country: {
        Args: { _admin_email?: string; _admin_pin?: string; _id: string }
        Returns: Json
      }
      admin_delete_landmark: {
        Args: { _admin_email?: string; _admin_pin?: string; _id: string }
        Returns: boolean
      }
      admin_get_platform_overview: {
        Args: { _admin_email?: string; _admin_pin?: string }
        Returns: Json
      }
      admin_get_postcode_ip_stats: {
        Args: { _limit?: number }
        Returns: {
          ip_address: string
          lga: string
          state: string
        }[]
      }
      admin_get_referral_history: {
        Args: { _referral_code: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          referred_device_id: string
          referred_email: string
          referred_ip: string
          referred_name: string
          referred_phone: string
          trigger_event: string
        }[]
      }
      admin_get_referral_overview: { Args: never; Returns: Json }
      admin_get_referral_signup_details: {
        Args: { _referral_code: string }
        Returns: {
          account_type: string
          country: string
          email: string
          full_name: string
          phone: string
          signed_up_at: string
          user_id: string
        }[]
      }
      admin_get_user_brief: {
        Args: { _user_ids: string[] }
        Returns: {
          account_type: string
          business_name: string
          email: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      admin_link_rider_to_business: {
        Args: {
          _admin_email?: string
          _admin_pin?: string
          _business_code: string
          _rider_id: string
        }
        Returns: Json
      }
      admin_list_allowed_countries: {
        Args: { _admin_email?: string; _admin_pin?: string }
        Returns: {
          country_code: string
          country_name: string
          created_at: string
          id: string
        }[]
      }
      admin_list_landmarks_full: {
        Args: never
        Returns: {
          address: string
          country: string | null
          created_at: string
          created_by_email: string | null
          id: string
          lat: number
          lga: string | null
          lng: number
          name: string
          postcode: string
          state: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_landmarks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_postcodes_full: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          address: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          lat: number
          lga: string | null
          lng: number
          postcode: string
          state: string
        }[]
        SetofOptions: {
          from: "*"
          to: "postcodes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_referral_accounts: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          balance: number
          created_at: string
          identifier: string
          referral_code: string
          source: string
          total_earned: number
          total_referrals: number
          updated_at: string
        }[]
      }
      admin_list_registered_users:
        | { Args: never; Returns: Json }
        | {
            Args: { _admin_email?: string; _admin_pin?: string }
            Returns: Json
          }
      admin_list_trial_reminder_emails: {
        Args: { _admin_email?: string; _admin_pin?: string; _limit?: number }
        Returns: Json
      }
      admin_list_withdrawal_candidates: {
        Args: {
          _limit?: number
          _min_balance?: number
          _only_with_history?: boolean
        }
        Returns: {
          email: string
          email_verified: boolean
          full_name: string
          last_address: string
          last_full_name: string
          last_network: string
          last_phone: string
          last_postcode: string
          last_state: string
          last_type: string
          last_withdrawal_at: string
          last_withdrawal_status: string
          phone: string
          referral_balance: number
          total_earned: number
          user_id: string
          withdrawal_count: number
        }[]
      }
      admin_list_withdrawals: {
        Args: { _admin_email?: string; _admin_pin?: string; _status?: string }
        Returns: {
          address: string
          amount: number
          created_at: string
          email: string
          full_name: string
          id: string
          ip_address: string | null
          network_provider: string
          phone: string
          postcode: string
          source: string
          state_of_residence: string
          status: string
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_log_export: {
        Args: {
          _action: string
          _ip_address?: string
          _metadata?: Json
          _row_count: number
          _target: string
        }
        Returns: string
      }
      admin_pause_business_subscription: {
        Args: {
          _admin_email?: string
          _admin_pin?: string
          _business_user_id: string
          _reason: string
        }
        Returns: Json
      }
      admin_resume_business_subscription: {
        Args: {
          _admin_email?: string
          _admin_pin?: string
          _business_user_id: string
        }
        Returns: Json
      }
      admin_staff_change_pin: {
        Args: { _current_pin: string; _email: string; _new_pin: string }
        Returns: Json
      }
      admin_staff_login: {
        Args: { _email: string; _ip?: string; _pin: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      admin_staff_touch_last_login: {
        Args: { _email: string; _pin: string }
        Returns: boolean
      }
      admin_unban_account: { Args: { p_user_id: string }; Returns: Json }
      admin_update_withdrawal_status: {
        Args: {
          _admin_email: string
          _admin_pin: string
          _id: string
          _status: string
        }
        Returns: Json
      }
      admin_upsert_landmark: {
        Args: {
          _address?: string
          _admin_email?: string
          _admin_pin?: string
          _country?: string
          _id?: string
          _lat?: number
          _lga?: string
          _lng?: number
          _name?: string
          _postcode?: string
          _state?: string
        }
        Returns: {
          address: string
          country: string | null
          created_at: string
          created_by_email: string | null
          id: string
          lat: number
          lga: string | null
          lng: number
          name: string
          postcode: string
          state: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "admin_landmarks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      available_quiz_balance: { Args: { _uid: string }; Returns: number }
      business_invite_rider: { Args: { _identifier: string }; Returns: Json }
      check_rider_referral_qualification: {
        Args: { _referred_user_id: string }
        Returns: {
          account_type: string
          created_at: string
          credited_at: string | null
          credits_earned: number
          first_delivery_at: string | null
          id: string
          referral_code: string
          referred_rider_id: string
          referred_user_id: string
          referrer_rider_id: string
          referrer_user_id: string
          signup_at: string
          status: string
          subscribed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rider_referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_signup_unique: {
        Args: {
          p_email: string
          p_full_name: string
          p_ip: string
          p_phone: string
        }
        Returns: {
          field: string
          message: string
          ok: boolean
        }[]
      }
      claim_device_referral: {
        Args: {
          _referred_device_id: string
          _referred_ip: string
          _referrer_code: string
        }
        Returns: Json
      }
      create_device_referral:
        | {
            Args: {
              _device_id: string
              _ip_address: string
              _referral_code: string
            }
            Returns: {
              balance: number
              created_at: string
              device_id: string
              id: string
              ip_address: string | null
              referral_code: string
              total_earned: number
              total_referrals: number
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "device_referrals"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _device_id: string
              _ip_address: string
              _known_referral_code: string
              _referral_code: string
              _stable_device_id: string
            }
            Returns: {
              balance: number
              created_at: string
              device_id: string
              id: string
              ip_address: string | null
              referral_code: string
              total_earned: number
              total_referrals: number
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "device_referrals"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      create_rider_referral: {
        Args: { _referred_user_id: string; _referrer_code: string }
        Returns: {
          account_type: string
          created_at: string
          credited_at: string | null
          credits_earned: number
          first_delivery_at: string | null
          id: string
          referral_code: string
          referred_rider_id: string
          referred_user_id: string
          referrer_rider_id: string
          referrer_user_id: string
          signup_at: string
          status: string
          subscribed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rider_referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_withdrawal_request:
        | {
            Args: {
              _address: string
              _amount: number
              _full_name: string
              _ip_address?: string
              _network_provider: string
              _postcode: string
              _state_of_residence: string
              _type: string
            }
            Returns: {
              address: string
              amount: number
              created_at: string
              email: string
              full_name: string
              id: string
              ip_address: string | null
              network_provider: string
              phone: string
              postcode: string
              source: string
              state_of_residence: string
              status: string
              type: string
            }
            SetofOptions: {
              from: "*"
              to: "withdrawals"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _address: string
              _amount: number
              _full_name: string
              _ip_address?: string
              _network_provider: string
              _phone?: string
              _postcode: string
              _state_of_residence: string
              _type: string
            }
            Returns: {
              address: string
              amount: number
              created_at: string
              email: string
              full_name: string
              id: string
              ip_address: string | null
              network_provider: string
              phone: string
              postcode: string
              source: string
              state_of_residence: string
              status: string
              type: string
            }
            SetofOptions: {
              from: "*"
              to: "withdrawals"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      credit_pending_referrals_for_referrer: { Args: never; Returns: Json }
      credit_referral_on_postcode: { Args: never; Returns: Json }
      credit_referrer_after_first_payment: {
        Args: { _referred_user_id: string }
        Returns: Json
      }
      credit_referrer_on_trial: { Args: { _user_id: string }; Returns: Json }
      credit_wallet: {
        Args: {
          _amount: number
          _description?: string
          _method: string
          _provider_reference: string
          _user_id: string
        }
        Returns: Json
      }
      credit_wallet_from_transfer: {
        Args: { _admin_id: string; _admin_note?: string; _transfer_id: string }
        Returns: Json
      }
      current_user_email_verified: { Args: never; Returns: boolean }
      debit_referral_balance:
        | { Args: { _amount: number; _device_id: string }; Returns: Json }
        | {
            Args: {
              _amount: number
              _device_id: string
              _known_referral_code: string
              _stable_device_id: string
            }
            Returns: Json
          }
      debit_user_referral_balance: { Args: { _amount: number }; Returns: Json }
      debit_wallet_for_subscription: {
        Args: { _cycle: string; _plan_code: string; _user_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_old_quiz_credits: { Args: { _uid?: string }; Returns: undefined }
      find_nearby_property: {
        Args: { radius_meters?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          distance_meters: number
          id: string
          lat: number
          lga_name: string
          lng: number
          postcode: string
          state_name: string
        }[]
      }
      gen_user_referral_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_branding_by_share_code: {
        Args: { _share_code: string }
        Returns: {
          brand_color: string
          brand_name: string
          business_user_id: string
          logo_url: string
          show_rating: boolean
          show_tip_jar: boolean
          support_email: string
          support_phone: string
          tagline: string
        }[]
      }
      get_coordinate_postcode_cache: {
        Args: { _country_code: string; _lat: number; _lng: number }
        Returns: {
          address: string
          area: string
          country: string
          country_code: string
          is_generated: boolean
          lat: number
          lga: string
          lng: number
          postcode: string
          road: string
          state: string
        }[]
      }
      get_delivery_by_share_code: {
        Args: { _code: string }
        Returns: {
          business_rider_id: string
          business_user_id: string
          cod_amount: number | null
          cod_collected: boolean | null
          cod_collected_at: string | null
          cod_settled: boolean | null
          cod_settled_at: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          delivery_fee: number | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_delivery: string | null
          eta_minutes: number | null
          failure_reason: string | null
          from_postcode: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_postcode: string | null
          notes: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          proof_photo_url: string | null
          rider_name: string | null
          rider_phone: string | null
          share_code: string
          signature_data: string | null
          status: string
          tip_amount: number | null
          to_postcode: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "delivery_trackings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_device_referral_by_identity: {
        Args: {
          _device_id: string
          _ip_address?: string
          _known_referral_code?: string
          _stable_device_id?: string
        }
        Returns: {
          balance: number
          created_at: string
          device_id: string
          id: string
          ip_address: string | null
          referral_code: string
          total_earned: number
          total_referrals: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "device_referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_effective_subscription_status: {
        Args: { p_user_id: string }
        Returns: {
          account_type: string
          effective_status: string
          is_grandfathered: boolean
          is_linked: boolean
        }[]
      }
      get_ip_quiz_total_24h: { Args: { _ip: string }; Returns: number }
      get_my_business_referrals: {
        Args: never
        Returns: {
          created_at: string
          credited_at: string
          credits_earned: number
          expected_credit_at: string
          id: string
          referred_business_name: string
          referred_email: string
          referred_subscription_status: string
          referred_trial_ends_at: string
          referred_user_id: string
          signup_at: string
          status: string
          subscribed_at: string
        }[]
      }
      get_my_referral_balance: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          id: string
          migrated_from_device_id: string | null
          referral_code: string
          total_earned: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_referral_balances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_quiz_balance: { Args: never; Returns: number }
      get_rating_by_share_code: {
        Args: { _share_code: string }
        Returns: {
          created_at: string
          id: string
          rating: number
        }[]
      }
      get_referral_history: {
        Args: { _referral_code: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          referred_device_short: string
          status: string
          trigger_event: string
        }[]
      }
      get_rider_details: {
        Args: { rider_ids: string[] }
        Returns: {
          full_name: string
          id: string
          location: string
          phone: string
          postcode: string
        }[]
      }
      get_share_gate_status: { Args: never; Returns: Json }
      get_tracking_session_by_share_code: {
        Args: { _share_code: string }
        Returns: {
          device_id: string
          ended_at: string | null
          id: string
          is_active: boolean | null
          last_lat: number | null
          last_lng: number | null
          last_updated: string | null
          share_code: string
          started_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tracking_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      gettransactionid: { Args: never; Returns: unknown }
      grant_referral_discount_for: {
        Args: { _referred_user_id: string }
        Returns: Json
      }
      has_completed_share_gate: { Args: { _user_id: string }; Returns: boolean }
      increment_platform_stat: {
        Args: { amount?: number; key: string }
        Returns: undefined
      }
      is_admin_ip_allowed: { Args: { _ip: string }; Returns: boolean }
      is_business_account: { Args: { _user_id: string }; Returns: boolean }
      is_individual_account: { Args: { _user_id: string }; Returns: boolean }
      is_referrer_eligible: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_email: string }; Returns: boolean }
      is_super_admin_caller: { Args: never; Returns: boolean }
      link_rider_to_business: {
        Args: { p_code: string }
        Returns: {
          message: string
          ok: boolean
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      migrate_device_to_user_referral: {
        Args: {
          _device_id: string
          _known_referral_code?: string
          _stable_device_id?: string
          _user_id: string
        }
        Returns: {
          balance: number
          created_at: string
          id: string
          migrated_from_device_id: string | null
          referral_code: string
          total_earned: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_referral_balances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_ng_postcode_district: {
        Args: { p_code: string }
        Returns: string
      }
      normalize_nigerian_phone: { Args: { _phone: string }; Returns: string }
      normalize_phone_key: { Args: { _phone: string }; Returns: string }
      normalize_whatsapp_phone: { Args: { _phone: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_due_subscription_renewals: { Args: never; Returns: Json }
      process_subscription_renewal: {
        Args: { _subscription_id: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recall_confirmed_transfer: {
        Args: { _admin_id: string; _admin_note?: string; _transfer_id: string }
        Returns: Json
      }
      record_quiz_score: {
        Args: { _play_id: string; _score: number }
        Returns: undefined
      }
      record_referral_signup: {
        Args: {
          _referred_email?: string
          _referred_user_id: string
          _referrer_code: string
        }
        Returns: Json
      }
      record_whatsapp_share: {
        Args: {
          _device_id?: string
          _ip_address?: string
          _message?: string
          _recipient_phone: string
          _user_agent?: string
        }
        Returns: Json
      }
      register_quiz_play: {
        Args: { _ip?: string }
        Returns: {
          allowed: boolean
          play_id: string
          plays_remaining: number
          plays_today: number
        }[]
      }
      reject_pending_transfer: {
        Args: { _admin_id: string; _admin_note?: string; _transfer_id: string }
        Returns: Json
      }
      request_join_business: {
        Args: { p_code: string }
        Returns: {
          message: string
          ok: boolean
          request_id: string
        }[]
      }
      resolve_device_referral_identity: {
        Args: {
          _create_if_missing?: boolean
          _device_id: string
          _ip_address?: string
          _known_referral_code?: string
          _requested_referral_code?: string
          _stable_device_id?: string
        }
        Returns: {
          balance: number
          created_at: string
          device_id: string
          id: string
          ip_address: string | null
          referral_code: string
          total_earned: number
          total_referrals: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "device_referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_business_invite: {
        Args: { _accept: boolean; _request_id: string }
        Returns: Json
      }
      search_business: {
        Args: { search_term: string }
        Returns: {
          business_name: string
          business_size: string
          full_name: string
          id: string
        }[]
      }
      send_trial_ending_reminders: { Args: never; Returns: Json }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      super_admin_set_staff_pin: {
        Args: { _admin_email: string; _new_pin: string; _staff_id: string }
        Returns: Json
      }
      transfer_referral_to_wallet: { Args: { _amount: number }; Returns: Json }
      unlockrows: { Args: { "": string }; Returns: number }
      update_linked_rider_live_location: {
        Args: {
          _lat?: number
          _live_status?: string
          _lng?: number
          _sharing?: boolean
        }
        Returns: {
          business_user_id: string
          created_at: string
          email: string | null
          failed_deliveries: number | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_postcode: string | null
          last_seen: string | null
          linked_rider_id: string | null
          location: string | null
          location_sharing: boolean
          rider_live_status: string
          rider_name: string
          rider_phone: string
          status: string
          successful_deliveries: number | null
          total_deliveries: number | null
          vehicle_type: string | null
          worker_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_riders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_withdrawal_status: {
        Args: { _id: string; _status: string }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_coordinate_postcode_cache: {
        Args: {
          _address?: string
          _area?: string
          _country?: string
          _country_code: string
          _is_generated?: boolean
          _lat: number
          _lga?: string
          _lng: number
          _postcode: string
          _road?: string
          _state: string
        }
        Returns: {
          address: string
          area: string
          country: string
          country_code: string
          is_generated: boolean
          lat: number
          lga: string
          lng: number
          postcode: string
          road: string
          state: string
        }[]
      }
      validate_business_code: {
        Args: { p_code: string }
        Returns: {
          business_user_id: string
          message: string
          ok: boolean
        }[]
      }
      validate_generated_postcode: {
        Args: { p_code: string }
        Returns: {
          message: string
          ok: boolean
        }[]
      }
      validate_referral_code: {
        Args: { p_code: string }
        Returns: {
          message: string
          ok: boolean
          owner_account_type: string
          owner_user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

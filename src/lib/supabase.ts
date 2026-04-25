import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type FoodPreference = 'vegetarian' | 'non-vegetarian' | 'vegan'
export type RegistrationStatus = 'pending' | 'approved' | 'rejected'

export interface Registration {
  id: string
  full_name: string
  email: string
  phone: string
  nic: string
  school: string
  food_preference: FoodPreference
  payment_slip_url: string | null
  status: RegistrationStatus
  ticket_id: string
  checked_in: boolean
  checked_in_at: string | null
  admin_note: string | null
  created_at: string
}

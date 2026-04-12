export type Prospect = {
  id: string
  business_name: string
  industry: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  business_phone: string | null
  business_email: string | null
  website_url: string | null
  google_rating: number | null
  google_review_count: number | null
  yelp_rating: number | null
  yelp_review_count: number | null
  site_quality_score: number | null
  prospect_score: number | null
  score_factors: Record<string, any>
  research_data: Record<string, any> | null
  research_completed_at: string | null
  auto_demo_eligible: boolean
  source: string
  stage: string
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
  last_contacted_at: string | null
  last_activity_at: string | null
}

export type Demo = {
  id: string
  prospect_id: string
  demo_url: string
  platform: string
  status: string
  version: number
  page_count: number
  generation_method: string
  view_count: number
  last_viewed_at: string | null
  unique_visitors: number
  screenshot_url: string | null
  build_log: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Deal = {
  id: string
  prospect_id: string
  stage: string
  value_estimate: number | null
  monthly_recurring: number | null
  services: string[]
  probability: number
  close_date_target: string | null
  won_at: string | null
  lost_at: string | null
  lost_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Activity = {
  id: string
  prospect_id: string
  deal_id: string | null
  type: string
  channel: string | null
  direction: string | null
  subject: string | null
  body: string | null
  status: string | null
  created_at: string
  created_by: string
}

export type Sequence = {
  id: string
  name: string
  steps: Record<string, any>[]
  active: boolean
  created_at: string
}

export type SequenceEnrollment = {
  id: string
  prospect_id: string
  sequence_id: string
  current_step: number
  status: string
  started_at: string
  paused_at: string | null
  completed_at: string | null
  next_step_at: string | null
}

export type Project = {
  id: string
  deal_id: string | null
  prospect_id: string
  name: string
  type: string
  status: string
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  milestones: Record<string, any>[]
  monthly_value: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: string
  user_id: string
  email: string
  display_name: string | null
  is_active: boolean
  created_at: string
}

export type AgentRun = {
  id: string
  agent_name: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  input_data: Record<string, any>
  output_data: Record<string, any>
  error: string | null
  prospects_created: number
  prospects_updated: number
  created_at: string
}

export type ProspectWithRelations = Prospect & {
  demos?: Demo[]
  deals?: Deal[]
  activities?: Activity[]
}

export const STAGES = [
  'researched', 'demo_built', 'outreach', 'engaged', 'meeting', 'proposal', 'won', 'lost',
] as const

export type Stage = typeof STAGES[number]

export const STAGE_LABELS: Record<Stage, string> = {
  researched: 'Researched',
  demo_built: 'Demo Built',
  outreach: 'Outreach',
  engaged: 'Engaged',
  meeting: 'Meeting',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

export const INDUSTRIES = [
  'dental', 'legal', 'chiropractic', 'medical', 'medspa',
  'hvac', 'plumbing', 'contractor', 'restaurant', 'firearms',
  'auto', 'fitness', 'financial', 'veterinary', 'retail', 'other',
] as const

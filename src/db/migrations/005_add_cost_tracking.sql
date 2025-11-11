CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255),
  user_id UUID,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 4) DEFAULT 0,
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  description TEXT,
  usage_details JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cost_created_at TIMESTAMPTZ DEFAULT NOW()
);

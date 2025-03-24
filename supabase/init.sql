-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create storage bucket for PDFs with increased file size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdfs', 'pdfs', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies for the pdfs bucket
CREATE POLICY "Allow public read access" ON storage.objects
    FOR SELECT USING (bucket_id = 'pdfs');

CREATE POLICY "Allow authenticated users to upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdfs' AND auth.uid() = owner);

CREATE POLICY "Allow authenticated users to update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'pdfs' AND auth.uid() = owner);

CREATE POLICY "Allow authenticated users to delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'pdfs' AND auth.uid() = owner);

-- Create tables with proper relationships and indexes

-- Create searches table
CREATE TABLE IF NOT EXISTS searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create papers table
CREATE TABLE IF NOT EXISTS papers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER,
    abstract TEXT,
    doi TEXT,
    search_id UUID REFERENCES searches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for search_id in papers
CREATE INDEX IF NOT EXISTS idx_papers_search_id ON papers(search_id);

-- Create pdf_uploads table
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT,
    authors TEXT,
    year INTEGER,
    doi TEXT,
    background TEXT,
    full_text TEXT,
    markdown_content TEXT,
    research_question TEXT,
    major_findings TEXT,
    suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pdf_batches table
CREATE TABLE IF NOT EXISTS pdf_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create batch_pdfs table (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS batch_pdfs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_id UUID REFERENCES pdf_batches(id) ON DELETE CASCADE,
    pdf_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE,
    UNIQUE(batch_id, pdf_id)
);

-- Create indexes for batch_pdfs
CREATE INDEX IF NOT EXISTS idx_batch_pdfs_batch_id ON batch_pdfs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_pdfs_pdf_id ON batch_pdfs(pdf_id);

-- Create firecrawl_api_keys table
CREATE TABLE IF NOT EXISTS firecrawl_api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    api_key TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_models table
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT,
    model_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create RLS policies for all tables

-- Searches table policies
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for searches" ON searches
    FOR ALL USING (true);

-- Papers table policies
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for papers" ON papers
    FOR ALL USING (true);

-- PDF uploads table policies
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for pdf_uploads" ON pdf_uploads
    FOR ALL USING (true);

-- PDF batches table policies
ALTER TABLE pdf_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for pdf_batches" ON pdf_batches
    FOR ALL USING (true);

-- Batch PDFs table policies
ALTER TABLE batch_pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for batch_pdfs" ON batch_pdfs
    FOR ALL USING (true);

-- Firecrawl API keys table policies
ALTER TABLE firecrawl_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for firecrawl_api_keys" ON firecrawl_api_keys
    FOR ALL USING (true);

-- AI models table policies
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for ai_models" ON ai_models
    FOR ALL USING (true);

-- Create functions for handling timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_ai_models_updated_at
    BEFORE UPDATE ON ai_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_firecrawl_api_keys_updated_at
    BEFORE UPDATE ON firecrawl_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to ensure only one default AI model
CREATE OR REPLACE FUNCTION ensure_single_default_ai_model()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE ai_models SET is_default = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for default AI model
CREATE TRIGGER ensure_single_default_ai_model_trigger
    BEFORE INSERT OR UPDATE ON ai_models
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_ai_model();

-- Create indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created_at ON pdf_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_batches_timestamp ON pdf_batches(timestamp);
CREATE INDEX IF NOT EXISTS idx_searches_timestamp ON searches(timestamp);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant storage permissions
GRANT ALL ON storage.objects TO postgres, anon, authenticated, service_role;
GRANT ALL ON storage.buckets TO postgres, anon, authenticated, service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role; 
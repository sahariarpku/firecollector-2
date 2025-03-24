
import { useState, useEffect } from 'react';
import { FirecrawlService, CrawlProgress, ActivityItem, CrawlResult, PaperData } from '@/services/FirecrawlService';
import { SearchInput } from '@/components/SearchInput';
import { ProgressBar } from '@/components/ProgressBar';
import { ActivityLog } from '@/components/ActivityLog';
import { Results } from '@/components/Results';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';

interface ResearchManagerProps {
  activeTab: string;
  initialQuery?: string;
  initialSearchId?: string | null;
}

export const ResearchManager = ({ activeTab, initialQuery = '', initialSearchId = null }: ResearchManagerProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [progress, setProgress] = useState<CrawlProgress>({ status: '', completed: 0, total: 100, percentage: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(initialSearchId);
  const [contentType, setContentType] = useState<'search' | 'pdf' | 'pdf-batch'>('search');
  const [batchName, setBatchName] = useState<string>('');

  // Effect to handle initialSearchId changes
  useEffect(() => {
    if (initialSearchId && initialQuery) {
      console.log('ResearchManager: Loading data for initialSearchId:', initialSearchId, 'initialQuery:', initialQuery);
      handleViewData(initialSearchId, initialQuery);
    } else if (initialQuery && !initialSearchId) {
      console.log('ResearchManager: Running search for initialQuery:', initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialSearchId, initialQuery]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setProgress({ status: 'Research in progress...', completed: 0, total: 100, percentage: 0 });
    setActivities([]);
    setSources([]);
    setResult(null);
    setSearchId(null);
    setContentType('search');
    
    try {
      console.log('Starting search for query:', query);
      const result = await FirecrawlService.processQuery(
        query,
        (progress) => setProgress(progress),
        (activities) => setActivities(activities)
      );
      
      console.log('Search completed, result:', result);
      setResult(result);
      setSources(result.sources);
      
      if (result.searchId) {
        console.log('Setting searchId:', result.searchId);
        setSearchId(result.searchId);
      }
      
      setIsActivityLogOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleCancelSearch = () => {
    FirecrawlService.cancelCurrentSearch();
    setIsSearching(false);
  };

  const handleSelectQuery = (query: string) => {
    console.log('Selected query:', query);
    setSearchQuery(query);
    handleSearch(query);
  };
  
  const handleViewData = async (searchId: string, query: string) => {
    console.log('Viewing data for searchId:', searchId, 'query:', query);
    setIsSearching(true);
    setProgress({ status: 'Loading data...', completed: 50, total: 100, percentage: 50 });
    setActivities([]);
    setSources([]);
    setResult(null);
    setSearchId(null);
    setSearchQuery(query);
    setBatchName('');
    
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('pdf_batches')
        .select('*')
        .eq('id', searchId)
        .single();
        
      if (!batchError && batchData) {
        console.log('Found batch data:', batchData);
        setContentType('pdf-batch');
        setBatchName(batchData.name);
        
        const { data: batchPdfs, error: batchPdfsError } = await supabase
          .from('batch_pdfs')
          .select('pdf_id')
          .eq('batch_id', searchId);
          
        if (batchPdfsError) {
          console.error('Error fetching batch PDFs:', batchPdfsError);
          throw batchPdfsError;
        }
        
        if (!batchPdfs || batchPdfs.length === 0) {
          console.log('No PDFs found in batch');
          toast.error('No PDFs found in this batch');
          setIsSearching(false);
          return;
        }
        
        const pdfIds = batchPdfs.map(item => item.pdf_id);
        
        const { data: pdfsData, error: pdfsError } = await supabase
          .from('pdf_uploads')
          .select('*')
          .in('id', pdfIds);
          
        if (pdfsError) {
          console.error('Error fetching PDFs for batch:', pdfsError);
          throw pdfsError;
        }
        
        console.log('Fetched PDF data for batch:', pdfsData);
        
        const pdfBatchResult: CrawlResult = {
          sources: ['PDF Batch Analysis'],
          activities: [
            FirecrawlService.createActivityItem('success', `Viewing PDF batch: "${batchData.name}"`),
            FirecrawlService.createActivityItem('success', `Found ${pdfsData.length} PDFs in this batch`)
          ],
          summary: `Viewing PDF batch "${batchData.name}" containing ${pdfsData.length} PDFs.`,
          data: {
            papers: pdfsData.map(pdf => ({
              name: pdf.title || pdf.filename,
              author: pdf.authors || 'Unknown',
              year: pdf.year,
              abstract: pdf.background,
              doi: pdf.doi,
              research_question: pdf.research_question,
              major_findings: pdf.major_findings,
              suggestions: pdf.suggestions
            }))
          },
          searchId
        };
        
        setResult(pdfBatchResult);
        setSearchId(searchId);
      } else {
        const { data: pdfData, error: pdfError } = await supabase
          .from('pdf_uploads')
          .select('*')
          .eq('id', searchId)
          .single();
          
        if (!pdfError && pdfData) {
          console.log('Found PDF data:', pdfData);
          setContentType('pdf');
          
          const { data: batchData } = await supabase
            .from('batch_pdfs')
            .select('*, pdf_batches(name)')
            .eq('pdf_id', searchId)
            .single();
            
          let batchName = 'Unbatched';
          if (batchData?.pdf_batches) {
            if (typeof batchData.pdf_batches === 'object' && 'name' in batchData.pdf_batches) {
              batchName = batchData.pdf_batches.name;
            }
          }
          
          const pdfResult: CrawlResult = {
            sources: ['PDF Analysis'],
            activities: [
              FirecrawlService.createActivityItem('success', `Viewing PDF: "${pdfData.title || pdfData.filename}"`),
              FirecrawlService.createActivityItem('success', `From batch: ${batchName}`)
            ],
            summary: `Viewing PDF analysis of "${pdfData.title || pdfData.filename}". ${pdfData.background ? 'Background: ' + pdfData.background.substring(0, 200) + '...' : ''}`,
            data: {
              papers: [{
                name: pdfData.title || pdfData.filename,
                author: pdfData.authors || 'Unknown',
                year: pdfData.year,
                abstract: pdfData.background,
                doi: pdfData.doi,
                research_question: pdfData.research_question,
                major_findings: pdfData.major_findings,
                suggestions: pdfData.suggestions
              }]
            },
            searchId
          };
          
          setResult(pdfResult);
          setSearchId(searchId);
        } else {
          console.log('Querying search data for ID:', searchId);
          setContentType('search');
          
          const { data: searchData, error: searchError } = await supabase
            .from('searches')
            .select('*')
            .eq('id', searchId)
            .single();
            
          if (searchError) {
            console.error('Error fetching search details:', searchError);
          } else {
            console.log('Found search data:', searchData);
          }
          
          const { data: papersData, error: papersError } = await supabase
            .from('papers')
            .select('*')
            .eq('search_id', searchId);
            
          if (papersError) {
            console.error('Error fetching papers for view:', papersError);
            throw papersError;
          }
          
          console.log('Fetched papers data:', papersData);
          
          if (!papersData || papersData.length === 0) {
            console.log('No papers found for search ID:', searchId);
            toast.error('No data found for this search');
            setIsSearching(false);
            return;
          }
          
          const result: CrawlResult = {
            sources: ['Historical Search'],
            activities: [
              FirecrawlService.createActivityItem('success', `Viewing saved search: "${query}"`),
              FirecrawlService.createActivityItem('success', `Found ${papersData.length} papers`)
            ],
            summary: `Viewing saved research on "${query}". Found ${papersData.length} papers related to the topic.`,
            data: {
              papers: papersData
            },
            searchId
          };
          
          console.log('Setting result with historical data');
          setResult(result);
          setSearchId(searchId);
        }
      }
      
      setIsActivityLogOpen(true);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultDeleted = () => {
    setResult(null);
    setSearchId(null);
  };

  if (activeTab !== "papers") {
    return null;
  }

  return (
    <>
      <SearchInput 
        onSearch={handleSearch} 
        isSearching={isSearching}
        onCancelSearch={handleCancelSearch}
        initialQuery={searchQuery}
      />
      
      <AnimatePresence>
        {isSearching && (
          <ProgressBar progress={progress} />
        )}
      </AnimatePresence>
      
      {activities.length > 0 && (
        <ActivityLog 
          activities={activities} 
          sources={sources}
          isOpen={isActivityLogOpen}
          onOpenChange={setIsActivityLogOpen}
        />
      )}
      
      {!isSearching && (
        <Results 
          result={result}
          searchId={searchId}
          searchQuery={searchQuery}
          contentType={contentType}
          batchName={batchName}
          onResultDeleted={handleResultDeleted}
        />
      )}
    </>
  );
};

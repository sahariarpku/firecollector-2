import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIChat } from '@/components/AIChat';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIService } from '@/services/AIService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchChatViewProps {
  searchId: string;
  query: string;
  type?: 'search' | 'pdf' | 'batch';
}

export const SearchChatView = ({ searchId, query, type = 'search' }: SearchChatViewProps) => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen && searchId) {
      fetchPapers();
    }
  }, [searchId, isOpen]);
  
  const fetchPapers = async () => {
    if (!searchId) return;
    
    try {
      setLoading(true);
      // Use different query based on type
      if (type === 'search') {
        // For regular searches, use papers table
        const { data: papersData, error } = await supabase
          .from('papers')
          .select('*')
          .eq('search_id', searchId);
          
        if (error) {
          console.error('Error fetching papers data:', error);
          throw error;
        }
        
        setPapers(papersData || []);
      } else if (type === 'pdf') {
        // For PDF analysis, fetch directly from pdf_uploads
        const { data: pdfData, error } = await supabase
          .from('pdf_uploads')
          .select('*')
          .eq('id', searchId)
          .single();
          
        if (error) {
          console.error('Error fetching PDF data:', error);
          throw error;
        }
        
        // Convert PDF data to match the format expected by the chat component
        setPapers([{
          name: pdfData.title || pdfData.filename,
          author: pdfData.authors || 'Unknown',
          year: pdfData.year,
          abstract: pdfData.background || pdfData.full_text?.substring(0, 500),
          doi: pdfData.doi,
          // Add PDF-specific fields for enhanced context
          research_question: pdfData.research_question,
          major_findings: pdfData.major_findings,
          suggestions: pdfData.suggestions
        }]);
      } else if (type === 'batch') {
        // For batch PDFs, fetch all PDFs in the batch
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
          setPapers([]);
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
        
        // Convert batch PDFs data to match the format expected by the chat component
        setPapers(pdfsData.map(pdf => ({
          name: pdf.title || pdf.filename,
          author: pdf.authors || 'Unknown',
          year: pdf.year,
          abstract: pdf.background || pdf.full_text?.substring(0, 500),
          doi: pdf.doi,
          research_question: pdf.research_question,
          major_findings: pdf.major_findings,
          suggestions: pdf.suggestions
        })));
      }
    } catch (error) {
      console.error('Error in fetchPapers:', error);
      toast.error('Failed to load data for chat');
    } finally {
      setLoading(false);
    }
  };
  
  // Create a context summary for the AI
  const generateContextSummary = () => {
    if (papers.length === 0) return `a research query about "${query}"`;
    
    let context = '';
    
    if (type === 'search') {
      context = `${papers.length} academic papers related to "${query}". `;
      context += `Some key papers include: `;
      
      // Add up to 3 paper titles
      const paperTitles = papers.slice(0, 3).map(p => p.name).join(', ');
      context += paperTitles;
    } else if (type === 'pdf') {
      const paper = papers[0];
      context = `A PDF document titled "${paper?.name || query}". `;
      
      if (paper?.abstract) {
        context += `Abstract: ${paper.abstract.substring(0, 200)}... `;
      }
      
      if (paper?.research_question) {
        context += `\nResearch Question: ${paper.research_question} `;
      }
      
      if (paper?.major_findings) {
        context += `\nMajor Findings: ${paper.major_findings.substring(0, 200)}... `;
      }
    }
    
    return context;
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button 
                variant="outline"
                size="icon"
                className="h-8 w-8 p-0"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Chat about this research</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SheetContent side="right" className="sm:max-w-md w-[90vw] p-0">
        <AIChat 
          title={`Chat about: ${query}`}
          initialContext={generateContextSummary()} 
          searchId={searchId}
          papers={papers}
        />
      </SheetContent>
    </Sheet>
  );
};

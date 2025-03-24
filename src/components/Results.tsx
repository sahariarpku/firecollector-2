import { useState } from 'react';
import { CrawlResult, PaperData } from '@/services/FirecrawlService';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, MessageSquare, Trash2, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AIChat } from '@/components/AIChat';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { exportPapersToExcel } from '@/utils/exportUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PDFUploadView from './PDFUploadView';

interface ResultsProps {
  result: CrawlResult | null;
  searchId: string | null;
  searchQuery: string;
  contentType: 'search' | 'pdf' | 'pdf-batch';
  batchName: string;
  onResultDeleted: () => void;
}

export const Results = ({ 
  result, 
  searchId, 
  searchQuery, 
  contentType, 
  batchName,
  onResultDeleted 
}: ResultsProps) => {
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(true);
  const [isAddPDFDialogOpen, setIsAddPDFDialogOpen] = useState(false);

  // Handle downloading Excel file
  const handleDownloadExcel = async () => {
    if (!searchId) {
      toast.error('No data to download');
      return;
    }
    
    try {
      console.log('Downloading Excel for ID:', searchId, 'Type:', contentType);
      
      if (contentType === 'search') {
        const { data, error } = await supabase
          .from('papers')
          .select('*')
          .eq('search_id', searchId);
          
        if (error) {
          console.error('Error fetching papers for Excel download:', error);
          throw error;
        }
        
        console.log('Fetched papers for download:', data);
        
        if (!data || data.length === 0) {
          console.log('No papers found for download');
          toast.error('No data to download');
          return;
        }
        
        exportPapersToExcel(
          data,
          `research-${searchQuery.substring(0, 30)}.xlsx`
        );
      } else if (contentType === 'pdf') {
        const { data: pdfData, error: pdfError } = await supabase
          .from('pdf_uploads')
          .select('*')
          .eq('id', searchId)
          .single();
          
        if (pdfError) {
          console.error('Error fetching PDF data for download:', pdfError);
          throw pdfError;
        }
        
        const exportData = [{
          name: pdfData.title || pdfData.filename,
          author: pdfData.authors || 'Unknown',
          year: pdfData.year || new Date().getFullYear(),
          abstract: pdfData.background || pdfData.full_text?.substring(0, 500) || '',
          doi: pdfData.doi || '',
          research_question: pdfData.research_question || '',
          major_findings: pdfData.major_findings || '',
          suggestions: pdfData.suggestions || ''
        }];
        
        exportPapersToExcel(
          exportData,
          `pdf-extract-${pdfData.title || pdfData.filename}.xlsx`
        );
      } else if (contentType === 'pdf-batch') {
        const { data: batchPdfs, error: batchPdfsError } = await supabase
          .from('batch_pdfs')
          .select('pdf_id')
          .eq('batch_id', searchId);
          
        if (batchPdfsError) {
          console.error('Error fetching batch PDFs for download:', batchPdfsError);
          throw batchPdfsError;
        }
        
        if (!batchPdfs || batchPdfs.length === 0) {
          console.log('No PDFs found in batch for download');
          toast.error('No PDFs found in this batch');
          return;
        }
        
        const pdfIds = batchPdfs.map(item => item.pdf_id);
        
        const { data: pdfsData, error: pdfsError } = await supabase
          .from('pdf_uploads')
          .select('*')
          .in('id', pdfIds);
          
        if (pdfsError) {
          console.error('Error fetching PDFs for batch download:', pdfsError);
          throw pdfsError;
        }
        
        const exportData = pdfsData.map(pdf => ({
          name: pdf.title || pdf.filename,
          author: pdf.authors || 'Unknown',
          year: pdf.year || new Date().getFullYear(),
          abstract: pdf.background || pdf.full_text?.substring(0, 500) || '',
          doi: pdf.doi || '',
          research_question: pdf.research_question || '',
          major_findings: pdf.major_findings || '',
          suggestions: pdf.suggestions || ''
        }));
        
        exportPapersToExcel(
          exportData,
          `pdf-batch-${batchName || 'export'}.xlsx`
        );
      }
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to download Excel file');
    }
  };
  
  // Handle deleting a result
  const handleDeleteResult = async () => {
    if (!searchId) {
      toast.error('Cannot delete: ID not found');
      return;
    }
    
    try {
      console.log('Deleting result for ID:', searchId, 'Type:', contentType);
      
      if (contentType === 'search') {
        const { error: papersError } = await supabase
          .from('papers')
          .delete()
          .eq('search_id', searchId);
          
        if (papersError) {
          console.error('Error deleting papers:', papersError);
          throw papersError;
        }
        
        const { error: searchError } = await supabase
          .from('searches')
          .delete()
          .eq('id', searchId);
        
        if (searchError) {
          console.error('Error deleting search:', searchError);
          throw searchError;
        }
      } else if (contentType === 'pdf') {
        const { error: batchPdfError } = await supabase
          .from('batch_pdfs')
          .delete()
          .eq('pdf_id', searchId);
          
        if (batchPdfError) {
          console.error('Error deleting batch PDF association:', batchPdfError);
          // Continue anyway as we want to try to delete the PDF itself
        }
        
        const { error: pdfError } = await supabase
          .from('pdf_uploads')
          .delete()
          .eq('id', searchId);
        
        if (pdfError) {
          console.error('Error deleting PDF:', pdfError);
          throw pdfError;
        }
      } else if (contentType === 'pdf-batch') {
        const { data: batchPdfs, error: batchPdfsError } = await supabase
          .from('batch_pdfs')
          .select('pdf_id')
          .eq('batch_id', searchId);
          
        if (batchPdfsError) {
          console.error('Error fetching batch PDFs for deletion:', batchPdfsError);
          throw batchPdfsError;
        }
        
        const { error: deleteBatchPdfsError } = await supabase
          .from('batch_pdfs')
          .delete()
          .eq('batch_id', searchId);
          
        if (deleteBatchPdfsError) {
          console.error('Error deleting batch PDF associations:', deleteBatchPdfsError);
          throw deleteBatchPdfsError;
        }
        
        const { error: deleteBatchError } = await supabase
          .from('pdf_batches')
          .delete()
          .eq('id', searchId);
          
        if (deleteBatchError) {
          console.error('Error deleting PDF batch:', deleteBatchError);
          throw deleteBatchError;
        }
        
        if (batchPdfs && batchPdfs.length > 0) {
          const pdfIds = batchPdfs.map(item => item.pdf_id);
          
          const { error: deletePdfsError } = await supabase
            .from('pdf_uploads')
            .delete()
            .in('id', pdfIds);
            
          if (deletePdfsError) {
            console.error('Error deleting PDFs in batch:', deletePdfsError);
            toast.warning('Batch deleted but some PDFs may remain');
          }
        }
      }
      
      toast.success('Result deleted successfully');
      onResultDeleted();
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('Failed to delete result');
    }
  };

  // Create a context summary for the AI
  const generateResearchContext = () => {
    if (!result || !result.data?.papers) {
      return `a research query about "${searchQuery}"`;
    }
    
    if (contentType === 'pdf' || contentType === 'pdf-batch') {
      const papers = result.data.papers;
      let context = contentType === 'pdf-batch' 
        ? `PDF batch "${batchName}" containing ${papers.length} documents. `
        : `PDF document titled "${papers[0].name}" by ${papers[0].author || 'Unknown Author'}. `;
      
      if (contentType === 'pdf') {
        const paper = papers[0];
        if (paper.abstract) context += `\nBackground: ${paper.abstract} `;
        if (paper.research_question) context += `\nResearch Question: ${paper.research_question} `;
        if (paper.major_findings) context += `\nFindings: ${paper.major_findings} `;
      } else {
        context += `\nDocuments include: ${papers.slice(0, 3).map(p => p.name).join(", ")}`;
        if (papers.length > 3) context += ` and ${papers.length - 3} more documents`;
      }
      
      return context;
    } else {
      const papersCount = result.data.papers.length;
      let context = `${papersCount} academic papers related to "${searchQuery}". `;
      
      if (papersCount > 0) {
        context += "The papers include: ";
        const paperTitles = result.data.papers
          .slice(0, 3)
          .map((p: PaperData) => p.name)
          .join(", ");
        
        context += paperTitles;
        if (papersCount > 3) {
          context += ` and ${papersCount - 3} more papers`;
        }
      }
      
      return context;
    }
  };

  const renderPDFDetails = () => {
    if (!result || !result.data?.papers || !result.data.papers[0]) {
      return null;
    }
    
    if (contentType === 'pdf-batch') {
      return (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700">PDF Batch Analysis</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddPDFDialogOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add More PDFs
            </Button>
          </div>
          
          <div className="rounded-md border mb-6">
            <Table>
              <TableCaption>
                PDF Batch: {batchName} ({result.data.papers.length} documents)
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>DOI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.papers.map((paper: PaperData, index: number) => (
                  <TableRow key={index} className="group">
                    <TableCell className="font-medium">{paper.name}</TableCell>
                    <TableCell>{paper.author}</TableCell>
                    <TableCell>{paper.year}</TableCell>
                    <TableCell className="text-blue-600 hover:underline">
                      {paper.doi ? (
                        <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                          {paper.doi}
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add PDF Dialog */}
          <Dialog open={isAddPDFDialogOpen} onOpenChange={setIsAddPDFDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add PDFs to Batch: {batchName}</DialogTitle>
              </DialogHeader>
              <PDFUploadView existingBatchId={searchId} existingBatchName={batchName} />
            </DialogContent>
          </Dialog>
        </div>
      );
    } else {
      const pdf = result.data.papers[0];
      
      return (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">PDF Analysis</h4>
          <div className="space-y-6">
            <div className="p-4 bg-white rounded-lg border border-gray-100">
              <h5 className="font-medium text-gray-800 mb-2">{pdf.name}</h5>
              
              {pdf.author && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">Authors: </span>
                  <span className="text-sm text-gray-600">{pdf.author}</span>
                </div>
              )}
              
              {pdf.year && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">Year: </span>
                  <span className="text-sm text-gray-600">{pdf.year}</span>
                </div>
              )}
              
              {pdf.doi && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">DOI: </span>
                  <span className="text-sm text-gray-600">{pdf.doi}</span>
                </div>
              )}
              
              {pdf.abstract && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Background:</div>
                  <p className="text-sm text-gray-600">{pdf.abstract}</p>
                </div>
              )}
              
              {pdf.research_question && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Research Question:</div>
                  <p className="text-sm text-gray-600">{pdf.research_question}</p>
                </div>
              )}
              
              {pdf.major_findings && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Major Findings:</div>
                  <p className="text-sm text-gray-600">{pdf.major_findings}</p>
                </div>
              )}
              
              {pdf.suggestions && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Suggestions:</div>
                  <p className="text-sm text-gray-600">{pdf.suggestions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  if (!result?.summary) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="w-full max-w-3xl mx-auto mt-8"
    >
      <div className="bg-gray-50/70 backdrop-blur-sm rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            {contentType === 'pdf' ? 'PDF Analysis' : 'Research Summary'}
          </h3>
          <div className="flex space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with AI
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md w-[90vw] p-0">
                <AIChat 
                  title={`Chat about: ${searchQuery}`}
                  initialContext={generateResearchContext()} 
                />
              </SheetContent>
            </Sheet>
            
            <Button 
              onClick={handleDownloadExcel}
              size="sm" 
              variant="outline"
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
            <Button 
              onClick={handleDeleteResult}
              size="sm" 
              variant="outline"
              className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Result
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">{result.summary}</p>
        
        {contentType === 'pdf' || contentType === 'pdf-batch' ? (
          renderPDFDetails()
        ) : (
          result.data?.papers && result.data.papers.length > 0 && (
            <div className="mt-6 overflow-hidden">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Papers Found</h4>
              
              <div className="rounded-md border">
                <Table>
                  <TableCaption>
                    Found {result.data.papers.length} papers related to "{searchQuery}"
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>DOI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.papers.map((paper: PaperData, index: number) => (
                      <TableRow key={index} className="group">
                        <TableCell className="font-medium">{paper.name}</TableCell>
                        <TableCell>{paper.author}</TableCell>
                        <TableCell>{paper.year}</TableCell>
                        <TableCell className="text-blue-600 hover:underline">
                          {paper.doi ? (
                            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                              {paper.doi}
                            </a>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Paper Abstracts</h4>
                <div className="space-y-6">
                  {result.data.papers.map((paper: PaperData, index: number) => (
                    <div key={`abstract-${index}`} className="p-4 bg-white rounded-lg border border-gray-100">
                      <h5 className="font-medium text-gray-800 mb-2">{paper.name}</h5>
                      <p className="text-sm text-gray-600">
                        {paper.abstract || "Abstract not available for this paper."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};

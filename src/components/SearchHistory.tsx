import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DownloadCloud, File, FileBox, FolderInput, History, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SearchChatView } from './SearchChatView';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface SearchHistoryProps {
  onSelectQuery: (query: string) => void;
  onViewData: (searchId: string, query: string) => void;
}

export const SearchHistory = ({ onSelectQuery, onViewData }: SearchHistoryProps) => {
  const [searches, setSearches] = useState<any[]>([]);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('history');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch searches
      const { data: searchesData, error: searchesError } = await supabase
        .from('searches')
        .select('*')
        .order('timestamp', { ascending: false });

      if (searchesError) throw searchesError;
      setSearches(searchesData || []);

      // Fetch PDFs
      const { data: pdfsData, error: pdfsError } = await supabase
        .from('pdf_uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (pdfsError) throw pdfsError;
      setPdfs(pdfsData || []);

      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .from('pdf_batches')
        .select('*, batch_pdfs(pdf_id)')
        .order('timestamp', { ascending: false });

      if (batchesError) throw batchesError;
      setBatches(batchesData || []);
    } catch (error) {
      console.error('Error fetching history data:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'search' | 'pdf' | 'batch') => {
    try {
      if (type === 'search') {
        // Delete papers first due to foreign key constraint
        await supabase.from('papers').delete().eq('search_id', id);
        // Then delete the search
        await supabase.from('searches').delete().eq('id', id);
        
        // Update local state
        setSearches(searches.filter(s => s.id !== id));
        toast.success('Search deleted');
      } else if (type === 'pdf') {
        // Delete batch_pdfs associations
        await supabase.from('batch_pdfs').delete().eq('pdf_id', id);
        // Then delete the PDF
        await supabase.from('pdf_uploads').delete().eq('id', id);
        
        // Update local state
        setPdfs(pdfs.filter(p => p.id !== id));
        toast.success('PDF deleted');
      } else if (type === 'batch') {
        // Get PDFs in this batch
        const { data: batchPdfs } = await supabase
          .from('batch_pdfs')
          .select('pdf_id')
          .eq('batch_id', id);
          
        // Delete batch_pdfs associations
        await supabase.from('batch_pdfs').delete().eq('batch_id', id);
        
        // Delete the batch
        await supabase.from('pdf_batches').delete().eq('id', id);
        
        // Delete PDFs that were in this batch
        if (batchPdfs && batchPdfs.length > 0) {
          const pdfIds = batchPdfs.map(item => item.pdf_id);
          await supabase.from('pdf_uploads').delete().in('id', pdfIds);
        }
        
        // Update local state
        setBatches(batches.filter(b => b.id !== id));
        toast.success('Batch deleted');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const countPDFsInBatch = (batch: any) => {
    if (!batch.batch_pdfs) return 0;
    return batch.batch_pdfs.length;
  };

  const handleViewData = (id: string, query: string) => {
    console.log('SearchHistory: handleViewData called with id:', id, 'query:', query);
    onViewData(id, query);
  };

  return (
    <div className="w-72 min-w-72 h-screen border-r border-gray-200 bg-gray-50/50 p-4 overflow-hidden flex flex-col">
      <div className="mb-4">
        <h2 className="text-md font-medium">Research History</h2>
      </div>

      <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4 grid grid-cols-3">
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            Searches
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="text-xs">
            <File className="h-3 w-3 mr-1" />
            PDFs
          </TabsTrigger>
          <TabsTrigger value="batches" className="text-xs">
            <FileBox className="h-3 w-3 mr-1" />
            Batches
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="history" className="m-0">
            {searches.length === 0 ? (
              <div className="text-center text-gray-500 mt-8 px-3">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No search history found</p>
                <p className="text-xs mt-1">Your searches will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searches.map((search) => (
                  <Card key={search.id} className="bg-white border-gray-100">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-blue-600" 
                        onClick={() => handleViewData(search.id, search.query)}>
                        {search.query}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(search.timestamp)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex justify-between">
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onSelectQuery(search.query)}
                              >
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Re-run search</p>
                            </TooltipContent>
                          </Tooltip>
                      
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleViewData(search.id, search.query)}
                              >
                                <FolderInput className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View results</p>
                            </TooltipContent>
                          </Tooltip>
                      
                          <SearchChatView searchId={search.id} query={search.query} type="search" />
                      
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDelete(search.id, 'search')}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete search</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pdfs" className="m-0">
            {pdfs.length === 0 ? (
              <div className="text-center text-gray-500 mt-8 px-3">
                <File className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No PDFs found</p>
                <p className="text-xs mt-1">Analyzed PDFs will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pdfs.map((pdf) => (
                  <Card key={pdf.id} className="bg-white border-gray-100">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-blue-600" 
                        onClick={() => handleViewData(pdf.id, pdf.title || pdf.filename)}>
                        {pdf.title || pdf.filename}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(pdf.created_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex justify-between">
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleViewData(pdf.id, pdf.title || pdf.filename)}
                              >
                                <FolderInput className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View PDF analysis</p>
                            </TooltipContent>
                          </Tooltip>
                      
                          <SearchChatView searchId={pdf.id} query={pdf.title || pdf.filename} type="pdf" />
                      
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDelete(pdf.id, 'pdf')}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="batches" className="m-0">
            {batches.length === 0 ? (
              <div className="text-center text-gray-500 mt-8 px-3">
                <FileBox className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No batches found</p>
                <p className="text-xs mt-1">PDF batches will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {batches.map((batch) => (
                  <Card key={batch.id} className="bg-white border-gray-100">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-blue-600" 
                        onClick={() => handleViewData(batch.id, batch.name)}>
                        {batch.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(batch.timestamp)} • {countPDFsInBatch(batch)} PDFs
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex justify-between">
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleViewData(batch.id, batch.name)}
                              >
                                <FolderInput className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View batch analysis</p>
                            </TooltipContent>
                          </Tooltip>
                      
                          <SearchChatView searchId={batch.id} query={batch.name} type="batch" />
                      
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDelete(batch.id, 'batch')}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete batch</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

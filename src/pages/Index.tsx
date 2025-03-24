
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ApiKeyGuard } from '@/components/ApiKeyGuard';
import { SearchHistory } from '@/components/SearchHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText } from 'lucide-react';
import PDFUploadView from '@/components/PDFUploadView';
import { ResearchManager } from '@/components/ResearchManager';

const Index = () => {
  const [activeTab, setActiveTab] = useState<string>("papers");
  const [selectedQuery, setSelectedQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  useEffect(() => {
    import('@mendable/firecrawl-js').catch(err => {
      console.warn('Firecrawl module import failed, using mock data instead:', err);
    });
  }, []);
  
  const handleSelectQuery = (query: string) => {
    console.log('Index: handleSelectQuery called with query:', query);
    setSelectedQuery(query);
    setSelectedId(null);
    setActiveTab("papers");
  };
  
  const handleViewData = (searchId: string, query: string) => {
    console.log('Index: handleViewData called with searchId:', searchId, 'query:', query);
    setSelectedId(searchId);
    setSelectedQuery(query);
    setActiveTab("papers");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <ApiKeyGuard>
        <div className="min-h-screen flex w-full">
          <SearchHistory 
            onSelectQuery={handleSelectQuery} 
            onViewData={handleViewData} 
          />
          
          <div className="h-full w-full overflow-y-auto">
            <Header />
            
            <div className="container px-4 py-8">
              <Tabs 
                defaultValue="papers" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="papers" className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Academic Paper Search
                    </TabsTrigger>
                    <TabsTrigger value="pdfs" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      PDF Analysis
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="papers" className="mt-0">
                  <ResearchManager 
                    activeTab={activeTab} 
                    initialQuery={selectedQuery}
                    initialSearchId={selectedId}
                  />
                </TabsContent>
                
                <TabsContent value="pdfs" className="mt-0">
                  <PDFUploadView />
                </TabsContent>
              </Tabs>
            </div>
            
            <Footer />
          </div>
        </div>
      </ApiKeyGuard>
    </div>
  );
};

export default Index;

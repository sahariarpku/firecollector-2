
import { useEffect, useState } from 'react';
import { FirecrawlService } from '@/services/FirecrawlService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard = ({ children }: ApiKeyGuardProps) => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const checkApiKey = async () => {
      const hasKey = await FirecrawlService.hasApiKey();
      setHasApiKey(hasKey);
    };
    
    checkApiKey();
  }, []);
  
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await FirecrawlService.saveApiKey(apiKey);
      setHasApiKey(true);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (hasApiKey === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!hasApiKey) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-12 p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to Firecollect</h2>
          <p className="text-gray-600">To get started, please enter your Firecrawl API key</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-setup">API Key</Label>
            <Input
              id="api-key-setup"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Firecrawl API key"
              className="w-full"
            />
          </div>
          
          <div className="text-xs text-gray-500">
            <p>
              Don't have an API key?{" "}
              <a 
                href="https://firecrawl.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-orange hover:underline"
              >
                Sign up at firecrawl.dev
              </a>
            </p>
          </div>
          
          <Button 
            onClick={handleSaveApiKey} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </motion.div>
    );
  }
  
  return <>{children}</>;
};

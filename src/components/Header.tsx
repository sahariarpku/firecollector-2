
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { FirecrawlService } from '@/services/FirecrawlService';
import { toast } from 'sonner';
import { AISettings } from './AISettings';

export const Header = () => {
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleApiKeySave = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await FirecrawlService.saveApiKey(apiKey);
      setIsApiKeyDialogOpen(false);
      setApiKey('');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full flex justify-end gap-2 p-4"
    >
      <Button 
        variant="outline" 
        size="sm" 
        className="text-xs flex items-center gap-1"
        onClick={() => setIsAISettingsOpen(true)}
      >
        <BrainCircuit className="h-3.5 w-3.5" />
        <span>AI Settings</span>
      </Button>
      <Button 
        size="sm" 
        variant="outline"
        className="text-xs flex items-center gap-1"
        onClick={() => setIsApiKeyDialogOpen(true)}
      >
        <span>Update Firecrawl API Key</span>
      </Button>
      
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your Firecrawl API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can get your API key by signing up at{" "}
              <a 
                href="https://firecrawl.dev" 
                target="_blank" 
                rel="noreferrer"
                className="text-brand-orange hover:underline"
              >
                firecrawl.dev
              </a>
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setIsApiKeyDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApiKeySave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AISettings isOpen={isAISettingsOpen} onOpenChange={setIsAISettingsOpen} />
    </motion.header>
  );
};

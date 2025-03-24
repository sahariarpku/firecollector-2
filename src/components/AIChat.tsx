import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AIService } from '@/services/AIService';
import { Send, Loader2, Bot, BrainCircuit, User, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface AIChatProps {
  title: string;
  initialContext?: string;
  searchId?: string;
  papers?: any[];
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
}

export const AIChat = ({ title, initialContext, searchId, papers = [] }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPapers, setIsLoadingPapers] = useState(!!searchId && papers.length === 0);
  const [localPapers, setLocalPapers] = useState<any[]>(papers);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch papers for context if searchId is provided and no papers were passed in
  useEffect(() => {
    if (searchId && papers.length === 0) {
      fetchPapers();
    }
  }, [searchId, papers.length]);
  
  const fetchPapers = async () => {
    if (!searchId) return;
    
    try {
      setIsLoadingPapers(true);
      console.log('Fetching papers for searchId:', searchId);
      const fetchedPapers = await AIService.getPapersForSearch(searchId);
      console.log('Fetched papers for AI context:', fetchedPapers);
      setLocalPapers(fetchedPapers);
      
      // Update initial message to include paper info
      if (fetchedPapers.length > 0) {
        setMessages([
          {
            role: 'assistant',
            content: `I'm ready to answer questions about ${fetchedPapers.length} academic papers related to "${initialContext}".`,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching papers for AI context:', error);
      toast.error('Failed to load research papers for context');
      setMessages([
        {
          role: 'error',
          content: 'Failed to load research papers. Please try again later.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoadingPapers(false);
    }
  };
  
  // Add system message at the beginning if context is provided
  useEffect(() => {
    if (initialContext && !searchId && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `I'm ready to help you with: ${initialContext}`,
          timestamp: new Date()
        }
      ]);
    } else if (papers.length > 0 && messages.length === 0) {
      // If papers were passed directly, set initial message
      setMessages([
        {
          role: 'assistant',
          content: `I'm ready to answer questions about ${papers.length} academic papers related to "${initialContext}".`,
          timestamp: new Date()
        }
      ]);
    }
  }, [initialContext, messages.length, searchId, papers]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    try {
      console.log('Generating AI response with context:', initialContext);
      const papersToUse = localPapers.length > 0 ? localPapers : papers;
      console.log('Using papers:', papersToUse.length > 0 ? papersToUse.map(p => p.name).join(', ') : 'None');
      
      const response = await AIService.generateCompletion(
        input,
        undefined,
        initialContext,
        papersToUse.length > 0 ? papersToUse : undefined
      );
      
      const aiMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response');
      
      // Add error message
      const errorMessage: Message = {
        role: 'error',
        content: `Error: ${error.message || 'Failed to get a response from the AI service. Please try again.'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(index);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const formatMessageContent = (content: string) => {
    // Replace markdown code blocks with HTML
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded my-2 overflow-x-auto">$2</pre>');
    
    // Replace markdown inline code with HTML
    content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
    
    // Replace markdown bold with HTML
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Replace markdown italic with HTML
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Replace line breaks with HTML
    content = content.replace(/\n/g, '<br>');
    
    return content;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <h3 className="font-medium">{title}</h3>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingPapers && (
          <div className="flex justify-center items-center h-24">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading research papers...</p>
            </div>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 group relative ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : message.role === 'error'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 mr-12'
                      : 'bg-muted text-muted-foreground mr-12'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && (
                    <Bot className="h-5 w-5 mt-1 flex-shrink-0" />
                  )}
                  {message.role === 'error' && (
                    <AlertCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                  )}
                  <div 
                    className="text-sm overflow-hidden whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                  />
                  {message.role === 'user' && (
                    <User className="h-5 w-5 mt-1 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div 
                    className={`text-xs ${
                      message.role === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground/70'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {message.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopyMessage(message.content, index)}
                    >
                      {copiedMessageId === index ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <Card className="max-w-[80%] mr-12">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-sm text-muted-foreground">Generating response...</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about the research..."
            disabled={isProcessing || isLoadingPapers}
            className="flex-1"
          />
          <Button type="submit" disabled={isProcessing || !input.trim() || isLoadingPapers}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

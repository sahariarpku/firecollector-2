
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Trash2, CheckCircle, Zap, BrainCircuit, Bot, Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AIService, AIModel, AIProvider, AIModelUpdateInput, AIModelInput } from '@/services/AIService';
import { motion, AnimatePresence } from 'framer-motion';

const providers = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o', defaultUrl: 'https://api.openai.com/v1' },
  { value: 'google', label: 'Google Gemini', defaultModel: 'gemini-pro', defaultUrl: 'https://generativelanguage.googleapis.com' },
  { value: 'anthropic', label: 'Anthropic Claude', defaultModel: 'claude-3-opus', defaultUrl: 'https://api.anthropic.com' },
  { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-coder', defaultUrl: 'https://api.deepseek.com' },
  { value: 'siliconflow', label: 'SiliconFlow', defaultModel: 'sf-llama3', defaultUrl: '' },
  { value: 'openrouter', label: 'OpenRouter', defaultModel: 'openrouter/auto', defaultUrl: 'https://openrouter.ai/api/v1' },
];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  provider: z.enum(['openai', 'google', 'anthropic', 'deepseek', 'siliconflow', 'openrouter'] as const),
  api_key: z.string().min(5, { message: 'API key is required' }),
  base_url: z.string().optional(),
  model_name: z.string().min(1, { message: 'Model name is required' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AISettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AISettings = ({ isOpen, onOpenChange }: AISettingsProps) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [addingModel, setAddingModel] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      provider: 'openai',
      api_key: '',
      base_url: 'https://api.openai.com/v1',
      model_name: 'gpt-4o',
    },
  });
  
  const fetchModels = async () => {
    setLoading(true);
    try {
      const data = await AIService.getModels();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to load AI models');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);
  
  const handleProviderChange = (value: string) => {
    const provider = providers.find(p => p.value === value);
    if (provider) {
      form.setValue('base_url', provider.defaultUrl);
      form.setValue('model_name', provider.defaultModel);
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const result = await AIService.addModel(values as AIModelInput);
      if (result) {
        toast.success('AI model added successfully');
        form.reset();
        setAddingModel(false);
        await fetchModels();
      }
    } catch (error) {
      console.error('Error adding model:', error);
      toast.error('Failed to add AI model');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteModel = async (id: string) => {
    if (confirm('Are you sure you want to delete this AI model?')) {
      try {
        setLoading(true);
        const success = await AIService.deleteModel(id);
        if (success) {
          toast.success('AI model deleted');
          await fetchModels();
        }
      } catch (error) {
        console.error('Error deleting model:', error);
        toast.error('Failed to delete AI model');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleSetDefault = async (id: string) => {
    try {
      setLoading(true);
      const success = await AIService.setAsDefault(id);
      if (success) {
        toast.success('Default AI model updated');
        await fetchModels();
      }
    } catch (error) {
      console.error('Error setting default model:', error);
      toast.error('Failed to set default AI model');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestConnection = async (model: AIModel) => {
    setTestingId(model.id);
    try {
      const success = await AIService.testConnection(model);
      if (success) {
        toast.success(`Successfully connected to ${model.provider}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error(`Failed to connect to ${model.provider}`);
    } finally {
      setTestingId(null);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            AI Settings
          </DialogTitle>
          <DialogDescription>
            Configure AI models to use throughout the application
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your AI Models</h3>
            <Button 
              onClick={() => setAddingModel(!addingModel)} 
              size="sm"
              variant={addingModel ? "secondary" : "default"}
            >
              {addingModel ? 'Cancel' : 'Add New Model'}
            </Button>
          </div>
          
          <AnimatePresence>
            {addingModel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Add New AI Model</CardTitle>
                    <CardDescription>
                      Configure a new AI model to use for research
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="My OpenAI Model" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="provider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Provider</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProviderChange(value);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a provider" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {providers.map((provider) => (
                                    <SelectItem key={provider.value} value={provider.value}>
                                      {provider.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="api_key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="sk-..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="base_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base URL (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://api.example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="model_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model Name</FormLabel>
                              <FormControl>
                                <Input placeholder="gpt-4o" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Add Model
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-4">
            {loading && !addingModel ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : models.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No AI models configured yet</p>
                <p className="text-sm mt-2">Add a model to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {models.map((model) => (
                  <Card key={model.id} className={model.is_default ? "border-primary" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {model.name}
                            {model.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                Default
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {providers.find(p => p.value === model.provider)?.label || model.provider}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Model:</span> {model.model_name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">API Key:</span> •••••••••••
                        </div>
                        {model.base_url && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Base URL:</span> {model.base_url}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={testingId === model.id}
                          onClick={() => handleTestConnection(model)}
                        >
                          {testingId === model.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Test
                        </Button>
                        
                        {!model.is_default && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSetDefault(model.id)}
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Set as Default
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

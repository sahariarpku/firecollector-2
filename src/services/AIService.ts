import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  base_url: string | null;
  model_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'deepseek' | 'openrouter' | 'siliconflow';

export interface AIModelInput {
  name: string;
  provider: AIProvider;
  api_key: string;
  base_url?: string;
  model_name: string;
}

export interface AIModelUpdateInput {
  name?: string;
  provider?: AIProvider;
  api_key?: string;
  base_url?: string;
  model_name?: string;
}

export class AIService {
  /**
   * Fetch all saved AI models
   */
  static async getModels(): Promise<AIModel[]> {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching AI models:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getModels:', error);
      return [];
    }
  }
  
  /**
   * Get the default AI model
   */
  static async getDefaultModel(): Promise<AIModel | null> {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching default AI model:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getDefaultModel:', error);
      return null;
    }
  }
  
  /**
   * Add a new AI model
   */
  static async addModel(model: AIModelInput): Promise<AIModel | null> {
    try {
      // If this is set as default, first unset other defaults
      if (model.name.toLowerCase().includes('default') || !await this.hasDefaultModel()) {
        await this.clearDefaultModels();
        
        const { data, error } = await supabase
          .from('ai_models')
          .insert({
            ...model,
            is_default: true
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error adding AI model:', error);
          throw error;
        }
        
        return data;
      } else {
        const { data, error } = await supabase
          .from('ai_models')
          .insert(model)
          .select()
          .single();
          
        if (error) {
          console.error('Error adding AI model:', error);
          throw error;
        }
        
        return data;
      }
    } catch (error) {
      console.error('Error in addModel:', error);
      return null;
    }
  }
  
  /**
   * Update an existing AI model
   */
  static async updateModel(id: string, model: AIModelUpdateInput): Promise<AIModel | null> {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .update({
          ...model,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating AI model:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateModel:', error);
      return null;
    }
  }
  
  /**
   * Delete an AI model
   */
  static async deleteModel(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting AI model:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteModel:', error);
      return false;
    }
  }
  
  /**
   * Set a model as the default
   */
  static async setAsDefault(id: string): Promise<boolean> {
    try {
      // First, clear all defaults
      await this.clearDefaultModels();
      
      // Then set this one as default
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) {
        console.error('Error setting model as default:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in setAsDefault:', error);
      return false;
    }
  }
  
  /**
   * Check if has any default model
   */
  static async hasDefaultModel(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('ai_models')
        .select('*', { count: 'exact', head: true })
        .eq('is_default', true);
        
      if (error) {
        console.error('Error checking for default models:', error);
        throw error;
      }
      
      return count !== null && count > 0;
    } catch (error) {
      console.error('Error in hasDefaultModel:', error);
      return false;
    }
  }
  
  /**
   * Clear all default models
   */
  static async clearDefaultModels(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('is_default', true);
        
      if (error) {
        console.error('Error clearing default models:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in clearDefaultModels:', error);
      return false;
    }
  }
  
  /**
   * Test connection to an AI model
   */
  static async testConnection(model: AIModel | AIModelInput): Promise<boolean> {
    try {
      // Simple test based on provider
      switch(model.provider) {
        case 'openai':
          // Just validate key format for now - would make actual API call in production
          if (!model.api_key.startsWith('sk-')) {
            toast.error('Invalid OpenAI API key format');
            return false;
          }
          break;
          
        case 'google':
          // Simple validation for Google API key
          if (model.api_key.length < 20) {
            toast.error('Invalid Google API key format');
            return false;
          }
          break;
          
        case 'anthropic':
          // Simple validation for Anthropic API key
          if (!model.api_key.startsWith('sk-')) {
            toast.error('Invalid Anthropic API key format');
            return false;
          }
          break;
          
        case 'siliconflow':
          // Test actual connection to SiliconFlow
          try {
            const testResult = await this.siliconFlowTest(model);
            if (!testResult) {
              toast.error('Failed to connect to SiliconFlow API');
              return false;
            }
          } catch (error) {
            toast.error(`SiliconFlow connection error: ${error.message}`);
            return false;
          }
          break;
          
        case 'openrouter':
          // Test actual connection to OpenRouter
          try {
            const testResult = await this.openRouterTest(model);
            if (!testResult) {
              toast.error('Failed to connect to OpenRouter API');
              return false;
            }
          } catch (error) {
            toast.error(`OpenRouter connection error: ${error.message}`);
            return false;
          }
          break;
          
        default:
          // Basic validation for other providers
          if (model.api_key.length < 10) {
            toast.error(`Invalid ${model.provider} API key format`);
            return false;
          }
      }
      
      toast.success(`Successfully connected to ${model.provider}`);
      return true;
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error(`Failed to connect to ${model.provider}: ${error.message}`);
      return false;
    }
  }

  /**
   * Test connection to SiliconFlow API
   */
  private static async siliconFlowTest(model: AIModel | AIModelInput): Promise<boolean> {
    const baseUrl = model.base_url || 'https://api.siliconflow.cn/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Unknown error');
    }
    
    return true;
  }
  
  /**
   * Test connection to OpenRouter API
   */
  private static async openRouterTest(model: AIModel | AIModelInput): Promise<boolean> {
    const baseUrl = model.base_url || 'https://openrouter.ai/api/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name || 'openai/gpt-3.5-turbo',
      messages: [
        { role: "user", content: "Hello, are you operational?" }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Research Assistant'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Unknown error');
    }
    
    return true;
  }
  
  /**
   * Generate a completion with the AI model
   */
  static async generateCompletion(
    prompt: string, 
    modelId?: string,
    context?: string,
    papers?: any[]
  ): Promise<string> {
    try {
      // Get the model to use
      const model = modelId 
        ? await this.getModelById(modelId)
        : await this.getDefaultModel();
      
      if (!model) {
        throw new Error('No AI model available. Please configure one in AI Settings.');
      }

      console.log('Using AI model:', model.name, model.provider);
      
      // Check if we have any papers context to provide
      let promptContent = prompt;
      
      if (papers && papers.length > 0) {
        promptContent = `I want you to act as an academic research assistant. I'll provide you with information about academic papers, and you'll help answer questions about them.

CONTEXT:
The following are summaries of academic papers related to the query:

${papers.map((paper, index) => `
PAPER ${index + 1}:
Title: ${paper.name}
Author: ${paper.author || 'Unknown'}
Year: ${paper.year || 'Unknown'}
Abstract: ${paper.abstract || 'No abstract provided.'}
DOI: ${paper.doi || 'N/A'}
`).join('\n')}

Based on the above academic papers, please answer the following question:
${prompt}

Your response should be clear, factual, and directly reference the papers when appropriate. If the papers don't contain information to answer the question, please state that clearly.`;
      }
      else if (context) {
        promptContent = `CONTEXT: ${context}\n\nQUESTION: ${prompt}\n\nPlease provide a helpful response based on the context provided.`;
      }
      
      console.log('Generating real AI completion with model:', model.provider);
      
      // Based on the model provider, call different API endpoints
      switch (model.provider) {
        case 'siliconflow':
          return await this.generateSiliconFlowCompletion(model, promptContent);
        case 'openai':
          return await this.generateOpenAICompletion(model, promptContent);
        case 'anthropic':
          return await this.generateAnthropicCompletion(model, promptContent);
        case 'google':
          return await this.generateGoogleCompletion(model, promptContent);
        case 'openrouter':
          return await this.generateOpenRouterCompletion(model, promptContent);
        default:
          throw new Error(`Provider ${model.provider} is not implemented yet.`);
      }
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using SiliconFlow API
   */
  private static async generateSiliconFlowCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://api.siliconflow.cn/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      frequency_penalty: 0.5,
      n: 1,
      response_format: { type: "text" }
    };
    
    try {
      console.log('Making API request to SiliconFlow:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('SiliconFlow API response:', data);
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making SiliconFlow API request:', error);
      throw error;
    }
  }
  
  /**
   * Generate completion using OpenAI API (stub for future implementation)
   */
  private static async generateOpenAICompletion(model: AIModel, prompt: string): Promise<string> {
    // Placeholder for OpenAI implementation
    throw new Error('OpenAI API implementation not available yet');
  }
  
  /**
   * Generate completion using Anthropic API (stub for future implementation)
   */
  private static async generateAnthropicCompletion(model: AIModel, prompt: string): Promise<string> {
    // Placeholder for Anthropic implementation
    throw new Error('Anthropic API implementation not available yet');
  }
  
  /**
   * Generate completion using Google API (stub for future implementation)
   */
  private static async generateGoogleCompletion(model: AIModel, prompt: string): Promise<string> {
    // Placeholder for Google implementation
    throw new Error('Google API implementation not available yet');
  }
  
  /**
   * Generate completion using OpenRouter API
   */
  private static async generateOpenRouterCompletion(model: AIModel, prompt: string): Promise<string> {
    const baseUrl = model.base_url || 'https://openrouter.ai/api/v1';
    const endpoint = `${baseUrl}/chat/completions`;
    
    // Format for OpenRouter
    const payload = {
      model: model.model_name,
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7
    };
    
    try {
      console.log('Making API request to OpenRouter:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${model.api_key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Research Assistant'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('OpenRouter API response:', data);
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      
      throw new Error('No content in API response');
    } catch (error) {
      console.error('Error making OpenRouter API request:', error);
      throw error;
    }
  }
  
  /**
   * Get model by ID
   */
  static async getModelById(id: string): Promise<AIModel | null> {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching AI model by ID:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getModelById:', error);
      return null;
    }
  }

  /**
   * Get papers for a search
   */
  static async getPapersForSearch(searchId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('search_id', searchId);
        
      if (error) {
        console.error('Error fetching papers for AI context:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getPapersForSearch:', error);
      return [];
    }
  }
}

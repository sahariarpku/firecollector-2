'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AIModel, AIProvider } from '@/services/AIService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CheckModels() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai' as AIProvider,
    api_key: '',
    model_name: '',
    base_url: '',
  });

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) {
        throw error;
      }

      setModels(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load AI models');
    } finally {
      setLoading(false);
    }
  }

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .insert([{
          ...newModel,
          is_default: models.length === 0 // Make it default if it's the first model
        }])
        .select();

      if (error) {
        throw error;
      }

      toast.success('AI model added successfully');
      setShowAddForm(false);
      setNewModel({
        name: '',
        provider: 'openai',
        api_key: '',
        model_name: '',
        base_url: '',
      });
      fetchModels();
    } catch (err: any) {
      toast.error('Failed to add AI model: ' + err.message);
    }
  }

  async function setAsDefault(id: string) {
    try {
      // First, clear all defaults
      await supabase
        .from('ai_models')
        .update({ is_default: false })
        .neq('id', id);

      // Then set this one as default
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default: true })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('Default model updated');
      fetchModels();
    } catch (err: any) {
      toast.error('Failed to update default model: ' + err.message);
    }
  }

  async function deleteModel(id: string) {
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('AI model deleted');
      fetchModels();
    } catch (err: any) {
      toast.error('Failed to delete AI model: ' + err.message);
    }
  }

  if (loading) {
    return <div className="p-4">Loading AI models...</div>;
  }

  if (error) {
    return <div className="p-4">Error: {error}</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">AI Models Configuration</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add New Model'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={addModel} className="mb-8 p-4 border rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={newModel.name}
              onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              placeholder="e.g., OpenAI GPT-4"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select
              value={newModel.provider}
              onChange={(e) => setNewModel({ ...newModel, provider: e.target.value as AIProvider })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="deepseek">Deepseek</option>
              <option value="openrouter">OpenRouter</option>
              <option value="siliconflow">SiliconFlow</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Model Name</label>
            <Input
              value={newModel.model_name}
              onChange={(e) => setNewModel({ ...newModel, model_name: e.target.value })}
              placeholder="e.g., gpt-4"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <Input
              type="password"
              value={newModel.api_key}
              onChange={(e) => setNewModel({ ...newModel, api_key: e.target.value })}
              placeholder="Your API key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
            <Input
              value={newModel.base_url}
              onChange={(e) => setNewModel({ ...newModel, base_url: e.target.value })}
              placeholder="Custom API endpoint (if needed)"
            />
          </div>

          <Button type="submit">Add Model</Button>
        </form>
      )}

      {models.length === 0 ? (
        <p>No AI models configured yet.</p>
      ) : (
        <div className="space-y-4">
          {models.map((model) => (
            <div key={model.id} className="border p-4 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-bold">{model.name} {model.is_default && '(Default)'}</h2>
                  <p>Provider: {model.provider}</p>
                  <p>Model Name: {model.model_name}</p>
                  <p>Base URL: {model.base_url || 'Default'}</p>
                  <p>API Key: {model.api_key ? '••••••••' : 'Not set'}</p>
                </div>
                <div className="space-x-2">
                  {!model.is_default && (
                    <Button
                      onClick={() => setAsDefault(model.id)}
                      variant="outline"
                      size="sm"
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteModel(model.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
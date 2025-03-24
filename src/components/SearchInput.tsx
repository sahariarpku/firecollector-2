
import { useState, useRef, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  onCancelSearch?: () => void;
  initialQuery?: string;
}

export const SearchInput = ({ onSearch, isSearching, onCancelSearch, initialQuery = '' }: SearchInputProps) => {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Update query if initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      adjustHeight();
    }
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSearch(query.trim());
    }
  };

  const handleCancel = () => {
    if (onCancelSearch) {
      onCancelSearch();
    }
  };

  const adjustHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(120, textarea.scrollHeight)}px`;
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto mb-8"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="rounded-xl overflow-hidden bg-brand-orange shadow-lg transition-shadow duration-300 hover:shadow-xl">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              adjustHeight();
            }}
            placeholder="Enter your research query..."
            className="w-full p-6 text-white placeholder-white/70 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-lg"
            rows={2}
            style={{ minHeight: '86px' }}
          />
          
          <div className="flex justify-end p-3 bg-brand-orange/90">
            {isSearching ? (
              <Button
                type="button"
                onClick={handleCancel}
                variant="ghost"
                className="text-white hover:text-white/80 hover:bg-brand-orange/80 focus:ring-0"
              >
                Cancel
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={!query.trim() || isSearching}
                className="bg-white text-brand-orange hover:bg-white/90 focus:ring-0 transition-all duration-300 px-5 font-medium flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SearchIcon className="h-4 w-4" />
                )}
                {isSearching ? 'Researching...' : 'Search'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
};

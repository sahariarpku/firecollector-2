
import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { CrawlProgress } from '@/services/FirecrawlService';

interface ProgressBarProps {
  progress: CrawlProgress;
}

export const ProgressBar = ({ progress }: ProgressBarProps) => {
  const controls = useAnimation();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  
  useEffect(() => {
    controls.start({
      width: `${progress.percentage}%`,
      transition: { duration: 0.3, ease: 'easeInOut' }
    });
    
    // Mock time remaining calculation
    if (progress.percentage < 100) {
      const minutes = Math.floor(Math.random() * 3) + 1;
      const seconds = Math.floor(Math.random() * 60);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setTimeRemaining(null);
    }
  }, [progress.percentage, controls]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full max-w-3xl mx-auto mb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center text-sm text-gray-600">
          <div className="status-pulse mr-2">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          </div>
          <span>{progress.status || 'Research in progress...'}</span>
        </div>
        <div className="text-sm text-gray-600">
          {progress.percentage}%
        </div>
      </div>
      
      <div className="progress-container">
        <motion.div 
          className="progress-bar"
          animate={controls}
          initial={{ width: '0%' }}
        />
      </div>
      
      {timeRemaining && (
        <div className="mt-2 text-right text-xs text-gray-500">
          Time until timeout: {timeRemaining}
        </div>
      )}
    </motion.div>
  );
};


import { motion } from 'framer-motion';
import { ActivityItem } from '@/services/FirecrawlService';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ListFilter } from 'lucide-react';

interface ActivityLogProps {
  activities: ActivityItem[];
  sources: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActivityLog = ({ activities, sources, isOpen, onOpenChange }: ActivityLogProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-4 right-4 gap-2 shadow-md z-10"
        >
          <ListFilter className="h-4 w-4" />
          <span>View Activity</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:w-[500px] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background p-4 border-b">
          <h2 className="text-lg font-semibold">Research Activity</h2>
        </div>
        
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full justify-start p-2 bg-transparent">
            <TabsTrigger 
              value="activity" 
              className="py-2 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-orange"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="sources" 
              className="py-2 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-orange"
            >
              Sources
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="mt-0 p-0 focus-visible:outline-none focus-visible:ring-0">
            <ScrollArea className="h-[calc(100vh-150px)] p-4">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className={`activity-dot ${activity.type === 'analyzing' ? 'processing' : 'success'} mt-1.5`} />
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="text-sm font-medium text-gray-800">{activity.message}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      {activity.details && (
                        <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{activity.details}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="sources" className="mt-0 p-0 focus-visible:outline-none focus-visible:ring-0">
            <ScrollArea className="h-[calc(100vh-150px)] p-4">
              <ul className="space-y-3">
                {sources.map((source, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="activity-dot processing" />
                    <span className="text-sm text-gray-800">{source}</span>
                  </motion.li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

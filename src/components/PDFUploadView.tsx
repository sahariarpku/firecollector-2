import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, File, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter
} from '@/components/ui/drawer';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFProcessingService, ExtractedData } from '@/services/PDFProcessingService';

type ProcessingStatus = 'pending' | 'uploading' | 'processing' | 'extracting' | 'success' | 'error';

type UploadedFile = {
  file: File;
  id: string;
  preview?: string;
  uploading: boolean;
  processing?: boolean;
  processingStatus?: ProcessingStatus;
  processingProgress?: number;
  extractedData?: ExtractedData;
  error?: string;
  success?: boolean;
};

// Helper function to sanitize text for database
const sanitizeText = (text: string | null | undefined | number): string | null => {
  if (text === null || text === undefined) return null;
  
  // Convert to string if it's a number
  const textStr = String(text);
  
  return textStr
    .replace(/\\u[0-9a-fA-F]{4}/g, '')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .normalize('NFKD')
    .trim();
};

interface PDFUploadViewProps {
  existingBatchId?: string;
  existingBatchName?: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const MAX_FILES = 100; // Maximum number of files per batch

const PDFUploadView = ({ existingBatchId, existingBatchName }: PDFUploadViewProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [batchName, setBatchName] = useState(existingBatchName || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingDrawerOpen, setIsProcessingDrawerOpen] = useState(false);
  const [currentlyProcessingIndex, setCurrentlyProcessingIndex] = useState<number | null>(null);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum size is 100MB.`);
          } else if (error.code === 'too-many-files') {
            toast.error(`You can only upload up to ${MAX_FILES} files at once.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} is not a valid PDF file.`);
          }
        });
      });

      // Handle accepted files
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        uploading: false,
        success: false,
        processingStatus: 'pending' as ProcessingStatus,
        processingProgress: 0
      }));

      // Check if adding new files would exceed the limit
      if (files.length + newFiles.length > MAX_FILES) {
        toast.error(`You can only upload up to ${MAX_FILES} files at once.`);
        return;
      }

      setFiles(prev => [...prev, ...newFiles]);
    }
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const processPDF = async (fileObj: UploadedFile, index: number): Promise<UploadedFile> => {
    setCurrentlyProcessingIndex(index);
    
    const updatedFile = { 
      ...fileObj, 
      processingStatus: 'processing' as ProcessingStatus,
      processingProgress: 10 
    };
    
    try {
      // Process PDF using the service
      const extractedData = await PDFProcessingService.processPDF(
        fileObj.file,
        (progress) => {
          updatedFile.processingProgress = progress;
          setFiles(prev => prev.map((f, i) => i === index ? { ...updatedFile } : f));
        }
      );
      
      // Update file with extracted data
      updatedFile.processingStatus = 'success';
      updatedFile.processingProgress = 100;
      updatedFile.extractedData = extractedData;
      
      return updatedFile;
    } catch (error) {
      console.error('Error processing PDF:', error);
      updatedFile.processingStatus = 'error';
      updatedFile.processingProgress = 0;
      updatedFile.error = error.message || 'Failed to process PDF';
      return updatedFile;
    }
  };

  // Add file validation before upload
  const validateFiles = () => {
    if (files.length === 0) {
      toast.error('Please add at least one PDF file');
      return false;
    }

    if (files.length > MAX_FILES) {
      toast.error(`You can only upload up to ${MAX_FILES} files at once.`);
      return false;
    }

    for (const fileObj of files) {
      if (fileObj.file.size > MAX_FILE_SIZE) {
        toast.error(`${fileObj.file.name} is too large. Maximum size is 100MB.`);
        return false;
      }
    }

    if (!batchName.trim() && !existingBatchId) {
      toast.error('Please provide a batch name');
      return false;
    }

    return true;
  };

  const uploadAndProcessFiles = async () => {
    if (!validateFiles()) {
      return;
    }

    try {
      setIsUploading(true);
      setIsProcessingDrawerOpen(true);
      
      let batchId = existingBatchId;
      
      // Create a new batch only if we don't have an existing one
      if (!existingBatchId) {
        const { data: batchData, error: batchError } = await supabase
          .from('pdf_batches')
          .insert([{ name: batchName }])
          .select();
        
        if (batchError) {
          throw new Error(`Failed to create batch: ${batchError.message}`);
        }
        
        if (!batchData || batchData.length === 0) {
          throw new Error('Failed to create batch: No batch ID returned');
        }
        
        batchId = batchData[0].id;
      }
      
      // Upload each file to storage and create records in the database
      const updatedFiles = [...files];
      
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        updatedFiles[i] = { ...fileObj, uploading: true };
        setFiles([...updatedFiles]);
        
        try {
          // Upload to storage
          const fileName = `${Date.now()}-${fileObj.file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, fileObj.file);
            
          if (uploadError) {
            throw new Error(`Failed to upload file: ${uploadError.message}`);
          }
          
          // Update UI for upload success and start AI processing
          updatedFiles[i] = { 
            ...updatedFiles[i], 
            uploading: false,
            processingStatus: 'pending',
            processingProgress: 0
          };
          setFiles([...updatedFiles]);
          
          // Process this PDF with AI
          const processedFile = await processPDF(updatedFiles[i], i);
          updatedFiles[i] = processedFile;
          setFiles([...updatedFiles]);
          
          // Create database record with extracted data
          const { data: pdfData, error: pdfError } = await supabase
            .from('pdf_uploads')
            .insert([{ 
              filename: fileObj.file.name,
              title: sanitizeText(processedFile.extractedData?.title),
              authors: sanitizeText(processedFile.extractedData?.authors),
              year: processedFile.extractedData?.year || new Date().getFullYear(),
              doi: sanitizeText(processedFile.extractedData?.doi),
              background: sanitizeText(processedFile.extractedData?.background),
              research_question: sanitizeText(processedFile.extractedData?.research_question),
              major_findings: sanitizeText(processedFile.extractedData?.major_findings),
              suggestions: sanitizeText(processedFile.extractedData?.suggestions),
              full_text: sanitizeText(processedFile.extractedData?.full_text)
            }])
            .select();
            
          if (pdfError) {
            throw new Error(`Failed to create PDF record: ${pdfError.message}`);
          }
          
          if (!pdfData || pdfData.length === 0) {
            throw new Error('Failed to create PDF record: No PDF ID returned');
          }
          
          // Link PDF to batch
          const pdfId = pdfData[0].id;
          const { error: linkError } = await supabase
            .from('batch_pdfs')
            .insert([{ 
              batch_id: batchId,
              pdf_id: pdfId
            }]);
            
          if (linkError) {
            throw new Error(`Failed to link PDF to batch: ${linkError.message}`);
          }
          
        } catch (fileError: any) {
          // Handle individual file error
          console.error('Error processing file:', fileError);
          updatedFiles[i] = { 
            ...updatedFiles[i], 
            uploading: false, 
            error: fileError.message,
            success: false,
            processingStatus: 'error',
            processingProgress: 0
          };
          setFiles([...updatedFiles]);
        }
      }
      
      setCurrentlyProcessingIndex(null);
      toast.success('Files uploaded and processed successfully!');
      
      // Refresh the page to show updated batch
      if (existingBatchId) {
        window.location.reload();
      }
      
    } catch (error: any) {
      console.error('Error in upload process:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // Render status icon based on file status
  const renderStatusIcon = (fileObj: UploadedFile) => {
    if (fileObj.error) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else if (fileObj.processingStatus === 'success') {
      return <Check className="h-5 w-5 text-green-500" />;
    } else if (fileObj.uploading || fileObj.processingStatus === 'processing' || fileObj.processingStatus === 'extracting') {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    } else {
      return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  // Render processing status text
  const getStatusText = (status: ProcessingStatus) => {
    switch (status) {
      case 'pending': return 'Waiting to be processed';
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing with AI...';
      case 'extracting': return 'Extracting content...';
      case 'success': return 'Successfully processed';
      case 'error': return 'Error processing';
      default: return 'Unknown status';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-xl p-6 border shadow-sm">
        {!existingBatchId && (
          <>
            <h2 className="text-xl font-semibold mb-4">PDF Analysis</h2>
            <p className="text-sm text-gray-600 mb-6">
              Upload PDF files to extract data and analyze them using AI.
              <br />
              <span className="text-xs text-gray-500">
                Maximum file size: 100MB | Maximum files per batch: {MAX_FILES}
              </span>
            </p>
            
            <div className="mb-4">
              <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 mb-1">
                Batch Name
              </label>
              <Input
                id="batchName"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Enter a name for this batch of PDFs"
                disabled={!!(isUploading || isProcessing || existingBatchId)}
                className="w-full"
              />
            </div>
          </>
        )}
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your PDF files here
          </p>
          <p className="text-xs text-gray-500">
            Or
          </p>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={open} 
            className="mt-2"
            disabled={isUploading || isProcessing}
          >
            Select Files
          </Button>
        </div>
        
        {files.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Selected Files</h3>
              <span className="text-xs text-gray-500">
                {files.length} / {MAX_FILES} files
              </span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {files.map((fileObj) => (
                <div 
                  key={fileObj.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    fileObj.error ? 'border-red-200 bg-red-50' : 
                    fileObj.processingStatus === 'success' ? 'border-green-200 bg-green-50' : 
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <div className="flex-shrink-0 mr-3">
                      {renderStatusIcon(fileObj)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {fileObj.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(fileObj.file.size / 1024).toFixed(2)} KB
                      </p>
                      {fileObj.processingStatus && fileObj.processingStatus !== 'pending' && !fileObj.error && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-600">
                            {getStatusText(fileObj.processingStatus)}
                          </p>
                          {(fileObj.processingStatus === 'processing' || fileObj.processingStatus === 'extracting') && (
                            <Progress value={fileObj.processingProgress} className="h-1 mt-1" />
                          )}
                        </div>
                      )}
                      {fileObj.error && (
                        <p className="text-xs text-red-600 mt-1">{fileObj.error}</p>
                      )}
                    </div>
                  </div>
                  {!fileObj.uploading && fileObj.processingStatus !== 'processing' && fileObj.processingStatus !== 'extracting' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileObj.id)}
                      disabled={isUploading || isProcessing}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={uploadAndProcessFiles}
            disabled={files.length === 0 || isUploading || isProcessing || !batchName.trim()}
            className="px-4"
          >
            {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : 'Upload and Analyze PDFs'}
          </Button>
        </div>
      </div>

      {/* Processing Drawer */}
      <Drawer open={isProcessingDrawerOpen} onOpenChange={setIsProcessingDrawerOpen}>
        <DrawerContent className="max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="text-left px-4">
            <DrawerTitle>Processing PDFs</DrawerTitle>
            <DrawerDescription>
              Analyzing {files.length} PDFs from batch: {batchName}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 py-2">
            <div className="grid grid-cols-1 gap-4 mb-6">
              {files.map((file, index) => (
                <Card 
                  key={file.id} 
                  className={`border ${
                    currentlyProcessingIndex === index ? 'border-blue-300 shadow-blue-100 shadow-md' : 
                    file.processingStatus === 'success' ? 'border-green-200' : 
                    file.processingStatus === 'error' ? 'border-red-200' : 
                    'border-gray-200'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      <div className="mr-2">
                        {renderStatusIcon(file)}
                      </div>
                      <CardTitle className="text-sm font-medium">
                        {file.file.name}
                      </CardTitle>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getStatusText(file.processingStatus || 'pending')}
                    </p>
                  </CardHeader>

                  <CardContent>
                    {file.processingStatus === 'extracting' || file.processingStatus === 'processing' ? (
                      <div>
                        <Progress 
                          value={file.processingProgress} 
                          className="h-2 mb-4" 
                        />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                          <Skeleton className="h-3 w-3/5" />
                        </div>
                      </div>
                    ) : file.processingStatus === 'success' && file.extractedData ? (
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="font-semibold">Title: </span>
                          <span>{file.extractedData.title}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Authors: </span>
                          <span>{file.extractedData.authors}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Year: </span>
                          <span>{file.extractedData.year}</span>
                        </div>
                        <div>
                          <span className="font-semibold">DOI: </span>
                          <span>{file.extractedData.doi}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Research Background: </span>
                          <p className="mt-1">{file.extractedData.background}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Research Question: </span>
                          <p className="mt-1">{file.extractedData.research_question}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Major Findings: </span>
                          <p className="mt-1">{file.extractedData.major_findings}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Suggestions: </span>
                          <p className="mt-1">{file.extractedData.suggestions}</p>
                        </div>
                      </div>
                    ) : file.processingStatus === 'error' ? (
                      <p className="text-xs text-red-600">
                        {file.error || 'An error occurred while processing this file'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Waiting to be processed...
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
            
          <DrawerFooter>
            <Button 
              onClick={() => setIsProcessingDrawerOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default PDFUploadView;

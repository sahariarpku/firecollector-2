import { AIService } from './AIService';
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';

// Initialize PDF.js worker
try {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
} catch (error) {
  console.error('Failed to initialize PDF.js worker:', error);
}

export interface ExtractedData {
  title?: string;
  authors?: string;
  doi?: string;
  background?: string;
  research_question?: string;
  major_findings?: string;
  suggestions?: string;
  full_text?: string;
  year?: number;
}

export class PDFProcessingService {
  static async extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
    try {
      console.log('Starting PDF extraction...');
      
      // Load the PDF document
      const loadingTask = getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      let fullText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
          console.log(`Extracted text from page ${i}`);
        } catch (pageError) {
          console.error(`Error extracting text from page ${i}:`, pageError);
          continue; // Continue with next page if one fails
        }
      }
      
      if (!fullText) {
        throw new Error('No text content found in PDF');
      }

      return fullText.trim();
    } catch (error: any) {
      console.error('PDF extraction error:', error);
      throw new Error(`Could not extract text from PDF: ${error.message}`);
    }
  }

  static convertTextToMarkdown(text: string): string {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    let markdown = '';
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check for section headers
      if (lowerLine.includes('abstract')) {
        currentSection = 'abstract';
        markdown += '\n## Abstract\n\n';
        continue;
      } else if (lowerLine.includes('introduction')) {
        currentSection = 'introduction';
        markdown += '\n## Introduction\n\n';
        continue;
      } else if (lowerLine.match(/method(s|ology)?/)) {
        currentSection = 'methods';
        markdown += '\n## Methods\n\n';
        continue;
      } else if (lowerLine.includes('result')) {
        currentSection = 'results';
        markdown += '\n## Results\n\n';
        continue;
      } else if (lowerLine.includes('discussion')) {
        currentSection = 'discussion';
        markdown += '\n## Discussion\n\n';
        continue;
      } else if (lowerLine.includes('conclusion')) {
        currentSection = 'conclusion';
        markdown += '\n## Conclusion\n\n';
        continue;
      }

      // Add line to markdown
      if (i === 0) {
        // First line is usually the title
        markdown += `# ${line}\n\n`;
      } else {
        markdown += `${line}\n`;
      }
    }

    return markdown;
  }

  static async analyzeWithAI(markdown: string): Promise<ExtractedData> {
    try {
      console.log('Starting AI analysis with text length:', markdown.length);
      
      // Take first 3000 characters for initial analysis to get basic metadata
      const initialChunk = markdown.slice(0, 3000);
      
      const initialPrompt = `Analyze this academic paper text and extract the following metadata. Return ONLY a JSON object with these fields (omit any fields you don't find):
{
  "title": "paper title",
  "authors": "author names",
  "doi": "DOI if present",
  "year": "publication year (as a number)"
}

Important:
- Look for the title at the beginning of the text
- Authors are usually listed after the title
- DOI might be in the format "doi: 10.xxxx/xxxxx" or "https://doi.org/10.xxxx/xxxxx"
- Year is usually a 4-digit number near the beginning of the paper

Text:
${initialChunk}`;

      console.log('Sending initial prompt for metadata');
      const metadataResponse = await AIService.generateCompletion(initialPrompt);
      
      let metadata: Partial<ExtractedData> = {};
      try {
        const jsonMatch = metadataResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          metadata = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse metadata JSON:', e);
      }

      // Take first 6000 characters for content analysis
      const contentChunk = markdown.slice(0, 6000);
      
      const contentPrompt = `Analyze this academic paper excerpt and extract the following information. Return ONLY a JSON object with these fields (omit any fields you don't find):
{
  "background": "brief summary of the paper's background and context",
  "research_question": "main research questions or objectives",
  "major_findings": "key findings and results",
  "suggestions": "future research suggestions or implications"
}

Important:
- Background: Look for sections like "Introduction", "Background", or "Abstract"
- Research Question: Look for explicit questions or objectives
- Major Findings: Look for results, conclusions, or key findings
- Suggestions: Look for future work, implications, or recommendations

Text:
${contentChunk}`;

      console.log('Sending content analysis prompt');
      const contentResponse = await AIService.generateCompletion(contentPrompt);
      
      let content: Partial<ExtractedData> = {};
      try {
        const jsonMatch = contentResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse content JSON:', e);
      }

      // Merge metadata and content
      const result: ExtractedData = {
        ...metadata,
        ...content,
        full_text: markdown // Store the full text for reference
      };

      console.log('AI analysis complete with results:', result);
      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Return minimal data to prevent complete failure
      return {
        title: '',
        authors: 'Unknown',
        year: new Date().getFullYear(),
        full_text: markdown
      };
    }
  }

  static async processPDF(file: File, onProgress?: (progress: number) => void): Promise<ExtractedData> {
    try {
      console.log('Starting PDF processing for file:', file.name);
      
      // Step 1: Extract text from PDF
      onProgress?.(20);
      const buffer = await file.arrayBuffer();
      console.log('File converted to ArrayBuffer, size:', buffer.byteLength);
      
      let text;
      try {
        text = await this.extractTextFromPDF(buffer);
        console.log('Text extracted successfully, length:', text.length);
      } catch (error) {
        console.error('Text extraction failed:', error);
        throw error;
      }
      
      // Step 2: Convert to markdown
      onProgress?.(40);
      const markdown = this.convertTextToMarkdown(text);
      console.log('Converted to markdown, length:', markdown.length);
      
      // Step 3: Analyze with AI in smaller chunks
      onProgress?.(60);
      console.log('Starting AI analysis');
      
      try {
        const extractedData = await this.analyzeWithAI(markdown);
        console.log('AI analysis complete:', extractedData);
        
        // Step 4: Format and validate results
        onProgress?.(80);
        
        // Complete processing
        onProgress?.(100);
        return {
          ...extractedData,
          title: extractedData.title || file.name.replace(/\.pdf$/i, ''),
          authors: extractedData.authors || 'Unknown',
          year: new Date().getFullYear(),
          full_text: markdown
        };
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        throw aiError;
      }
    } catch (error: any) {
      console.error('PDF processing error:', {
        error,
        message: error.message,
        stack: error.stack,
        fileName: file.name
      });
      throw error;
    }
  }
} 
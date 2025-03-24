
import { utils, writeFile } from 'xlsx';

// Use a simple interface with only primitive types to avoid deep type inference
export interface SimplePaperData {
  name: string;
  author: string;
  year: string | number | null;
  abstract: string | null;
  doi: string | null;
  research_question?: string | null;
  major_findings?: string | null;
  suggestions?: string | null;
  search_id?: string;
}

/**
 * Exports paper data to Excel
 */
export function exportPapersToExcel(papers: SimplePaperData[], filename: string): void {
  if (!papers || papers.length === 0) {
    console.error('No data to export');
    throw new Error('No data to export');
  }

  console.log(`Exporting ${papers.length} papers to Excel file: ${filename}`);
  
  try {
    // Convert papers to simple export rows with string-only values
    const rows = papers.map(paper => ({
      name: paper.name || '',
      author: paper.author || '',
      year: paper.year?.toString() || '',
      abstract: paper.abstract || '',
      doi: paper.doi || '',
      research_question: paper.research_question || '',
      major_findings: paper.major_findings || '',
      suggestions: paper.suggestions || ''
    }));

    // Create workbook and sheet
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    
    // Add column widths for better readability
    const colWidths = [
      { wch: 40 }, // name
      { wch: 30 }, // author
      { wch: 10 }, // year
      { wch: 60 }, // abstract
      { wch: 25 }, // doi
      { wch: 60 }, // research_question
      { wch: 60 }, // major_findings
      { wch: 60 }  // suggestions
    ];
    
    ws['!cols'] = colWidths;
    
    utils.book_append_sheet(wb, ws, 'Research Results');
    writeFile(wb, filename);
    console.log('Excel file created successfully');
  } catch (error) {
    console.error('Error creating Excel file:', error);
    throw error;
  }
}

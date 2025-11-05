
import * as pdfjs from 'pdfjs-dist';
import { PDF_WORKER_URL } from '../constants';
import { Chapter } from '../types';

pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

export async function parsePdf(file: File): Promise<{ sentences: string[], chapters: Chapter[] }> {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read file."));
      }
      
      const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
      
      try {
        const pdf = await pdfjs.getDocument(typedArray).promise;
        let fullText = '';
        const chapterCandidates: { text: string }[] = [];
        
        // Regex to identify potential chapter titles
        const chapterRegex = /^(chapter|part|book)\s+([0-9]+|[ivxlcdm]+)/i;
        const allCapsRegex = /^[A-Z\s.,-]{5,50}$/;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          for (const item of textContent.items) {
             if ('str' in item) {
                const str = item.str.trim();
                if (str.length > 3 && (chapterRegex.test(str) || (str.length < 50 && !str.includes('.') && allCapsRegex.test(str)))) {
                    if (!chapterCandidates.find(c => c.text.includes(str))) {
                       chapterCandidates.push({ text: str });
                    }
                }
             }
          }
          const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
          fullText += pageText + ' ';
        }
        
        const sentences = fullText.match(/[^.!?]+[.!?]+(?=\s|$|")/g) || [];
        const cleanedSentences = sentences
            .map(s => s.trim().replace(/\s+/g, ' '))
            .filter(s => s.length > 5);

        if (cleanedSentences.length === 0) {
            const chunks = fullText.split(/\s+/).reduce((acc, word) => {
                if (acc.length === 0 || acc[acc.length-1].split(' ').length > 25) {
                    acc.push(word);
                } else {
                    acc[acc.length-1] += ' ' + word;
                }
                return acc;
            }, [] as string[]);
            resolve({ sentences: chunks.filter(c => c.trim().length > 0), chapters: [] });
            return;
        }

        const chapters: Chapter[] = [];
        chapterCandidates.forEach(candidate => {
            const index = cleanedSentences.findIndex(s => s.includes(candidate.text));
            if (index !== -1 && !chapters.some(c => Math.abs(c.sentenceIndex - index) < 5)) {
                chapters.push({ title: candidate.text, sentenceIndex: index });
            }
        });
        chapters.sort((a, b) => a.sentenceIndex - b.sentenceIndex);

        resolve({ sentences: cleanedSentences, chapters });

      } catch (error) {
        console.error("Error parsing PDF:", error);
        reject(new Error("Could not parse the PDF file. It might be corrupted or protected."));
      }
    };

    fileReader.onerror = () => {
      reject(new Error("Error reading the file."));
    };

    fileReader.readAsArrayBuffer(file);
  });
}

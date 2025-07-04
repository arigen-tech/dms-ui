import React, { useEffect, useState } from "react";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { marked } from "marked";
import { decode } from "tiff";

const FilePreviewModal = ({ isOpen, onClose, className, onDownload, fileType, fileUrl, fileName, fileData }) => {
  const [previewContent, setPreviewContent] = useState(null);
  const [typeToPreview, setTypeToPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false); // Add this state

  // Removed pagination state since we're removing Previous/Next buttons

  // Fix: Add null check and provide fallback
  const ogFileName = fileName ? fileName.substring(fileName.indexOf('_') + 1) : 'Unknown File';

  useEffect(() => {
    if (!isOpen || !fileType || !fileUrl) return;

    const loadPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Categorize file type
        const isImage = fileType.startsWith("image/");
        const isPdf = fileType === "application/pdf";
        const isText = fileType.startsWith("text/");
        const isVideo = fileType.startsWith("video/");
        const isAudio = fileType.startsWith("audio/");
        const isJson = fileType === "application/json";
        const isXml = fileType === "text/xml" || fileType === "application/xml";
        const isMarkdown = fileType === "text/markdown" || fileName?.endsWith(".md");
        const isArchive = ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"].includes(fileType);
        const isExecutable = ["application/x-msdownload", "application/x-msi", "application/vnd.android.package-archive"].includes(fileType);
        const isBinaryDocument = ["application/msword"].includes(fileType); // Old .doc format

        // Handle image files
        if (isImage) {
          if (fileType === "image/tiff" || fileType === "image/tif") {
            // For TIFF, just show the first page since we removed pagination
            await handleTiff();
          } else if (fileType === "image/svg+xml") {
            await handleSvg();
          } else if (fileType === "image/heic") {
            setPreviewContent(null);
            setTypeToPreview("download-only");
            setError("HEIC images can only be downloaded. Convert to JPG for preview.");
          } else {
            setPreviewContent(fileUrl);
            setTypeToPreview(fileType);
          }
        }
        // Handle PDF files
        else if (isPdf) {
          setPreviewContent(fileUrl);
          setTypeToPreview(fileType);
        }
        // Handle text files
        else if (isText || isJson || isXml) {
          if (isMarkdown) {
            await handleMarkdown();
          } else if (fileType === "text/csv") {
            await handleCsv();
          } else {
            await handleTextFile();
          }
        }
        // Handle media files
        else if (isVideo || isAudio) {
          setPreviewContent(fileUrl);
          setTypeToPreview(fileType);
        }
        // Handle documents
        else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          await handleDocx();
        } else if (
          fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          fileType === "application/vnd.ms-excel"
        ) {
          await handleExcel();
        } else if (
          fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          fileType === "application/vnd.ms-powerpoint"
        ) {
          setPreviewContent(null);
          setTypeToPreview("download-only");
          setError("PowerPoint files can only be downloaded.");
        }
        // Handle special files that are download-only
        else if (isArchive || isExecutable || isBinaryDocument) {
          setPreviewContent(null);
          setTypeToPreview("download-only");
          setError(`${getFileExtension(fileName)} files can only be downloaded.`);
        }
        // Handle unsupported files
        else {
          setPreviewContent(null);
          setTypeToPreview(null);
          setError("Preview not supported for this file type.");
        }
      } catch (err) {
        console.error("Error loading preview:", err);
        setPreviewContent(null);
        setError(`Failed to load preview: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [fileType, fileUrl, isOpen, fileName]);

  const getFileExtension = (filename) => {
    if (!filename) return "This file";
    return filename.split('.').pop().toUpperCase();
  };

  const handleTiff = async () => {
    const res = await fetch(fileUrl);
    const buffer = await res.arrayBuffer();

    try {
      const images = decode(new Uint8Array(buffer));
      if (images && images.length > 0) {
        // Just show the first page since we removed pagination
        const imageData = images[0];
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext("2d");
        const imageDataCanvas = ctx.createImageData(imageData.width, imageData.height);
        imageDataCanvas.data.set(imageData.data);
        ctx.putImageData(imageDataCanvas, 0, 0);
        const dataUrl = canvas.toDataURL();
        setPreviewContent(dataUrl);
        setTypeToPreview("image/tiff");
      } else {
        throw new Error("Could not decode TIFF file");
      }
    } catch (err) {
      throw new Error(`TIFF decode error: ${err.message}`);
    }
  };

  const handleSvg = async () => {
    try {
      const res = await fetch(fileUrl);
      const text = await res.text();

      // Simple SVG sanitization - more comprehensive sanitization recommended for production
      if (!text.includes("<svg")) {
        throw new Error("Invalid SVG file");
      }

      // Create a data URL from the sanitized SVG
      const sanitized = text.replace(/script/gi, "removed"); // Very basic sanitization
      const encoded = encodeURIComponent(sanitized);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;

      setPreviewContent(dataUrl);
      setTypeToPreview("image/svg+xml");
    } catch (err) {
      throw new Error(`SVG preview error: ${err.message}`);
    }
  };

  const handleExcel = async () => {
    const res = await fetch(fileUrl);
    const arrayBuffer = await res.arrayBuffer();

    try {
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      if (workbook.SheetNames.length === 0) {
        throw new Error("No sheets found in Excel file");
      }

      // Just show the first sheet since we removed pagination
      const firstSheet = workbook.SheetNames[0];
      const html = XLSX.utils.sheet_to_html(workbook.Sheets[firstSheet], {
        id: "excel-preview-table",
        editable: false
      });

      setPreviewContent(html);
      setTypeToPreview("excel/html");
    } catch (err) {
      throw new Error(`Excel preview error: ${err.message}`);
    }
  };

  const handleDocx = async () => {
    try {
      const res = await fetch(fileUrl);
      const arrayBuffer = await res.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setPreviewContent(result.value);
      setTypeToPreview("docx/html");
    } catch (err) {
      throw new Error(`DOCX preview error: ${err.message}`);
    }
  };

  const handleMarkdown = async () => {
    try {
      const res = await fetch(fileUrl);
      const text = await res.text();
      const html = marked(text);
      setPreviewContent(html);
      setTypeToPreview("markdown/html");
    } catch (err) {
      throw new Error(`Markdown preview error: ${err.message}`);
    }
  };

  const handleCsv = async () => {
    try {
      const res = await fetch(fileUrl);
      const text = await res.text();

      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', '\t', '|', ';']
      });

      if (result.errors && result.errors.length > 0) {
        console.warn("CSV parsing warnings:", result.errors);
      }

      // Convert to HTML table
      let html = '<table class="w-full border-collapse">';

      // Headers
      if (result.meta && result.meta.fields && result.meta.fields.length > 0) {
        html += '<thead><tr>';
        result.meta.fields.forEach(field => {
          html += `<th class="border border-gray-300 px-4 py-2 bg-gray-100">${field}</th>`;
        });
        html += '</tr></thead>';
      }

      // Data rows (limit to first 100 rows for performance)
      html += '<tbody>';
      const displayData = result.data.slice(0, 100);
      displayData.forEach(row => {
        html += '<tr>';
        result.meta.fields.forEach(field => {
          html += `<td class="border border-gray-300 px-4 py-2">${row[field] ?? ''}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';

      // Add note if data was truncated
      if (result.data.length > 100) {
        html += `<div class="text-sm text-gray-500 mt-2">Showing first 100 rows of ${result.data.length} total rows.</div>`;
      }

      setPreviewContent(html);
      setTypeToPreview("csv/html");
    } catch (err) {
      throw new Error(`CSV preview error: ${err.message}`);
    }
  };

  const handleTextFile = async () => {
    try {
      const res = await fetch(fileUrl);
      const text = await res.text();

      // Format JSON and XML nicely
      if (fileType === "application/json") {
        try {
          const obj = JSON.parse(text);
          const formatted = JSON.stringify(obj, null, 2);
          setPreviewContent(`<pre class="whitespace-pre-wrap font-mono text-sm">${formatted}</pre>`);
          setTypeToPreview("json/html");
          return;
        } catch (e) {
          // If JSON parsing fails, fall back to plain text
          console.warn("Failed to parse JSON:", e);
        }
      } else if (fileType === "text/xml" || fileType === "application/xml") {
        // Simple formatting - a more sophisticated XML formatter could be used
        const formatted = text
          .replace(/></g, ">\n<")
          .replace(/(<[^>]+>)/g, "$1\n")
          .replace(/\n\n/g, "\n");
        setPreviewContent(`<pre class="whitespace-pre-wrap font-mono text-sm">${formatted}</pre>`);
        setTypeToPreview("xml/html");
        return;
      }

      // Default text handling
      setPreviewContent(`<pre class="whitespace-pre-wrap font-mono text-sm">${text}</pre>`);
      setTypeToPreview("text/html");
    } catch (err) {
      throw new Error(`Text preview error: ${err.message}`);
    }
  };

  // Removed pagination functions since we removed Previous/Next buttons

  // Removed useEffect for page changes since we removed pagination


  const handleDownloadClick = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      if (fileData) {
        await onDownload(fileData);
      } else {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error || !previewContent) {
      return (
        <div className="flex flex-col items-center justify-center p-6 h-60">
          {typeToPreview === "download-only" ? (
            <>
              <div className="text-5xl mb-4">📥</div>
              <p className="text-center text-gray-600">{error || "This file can only be downloaded."}</p>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className={`mt-4 px-4 py-2 rounded transition-all duration-300 flex items-center
                  ${isDownloading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Original
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">🚫</div>
              <p className="text-center text-red-600">{error || "Preview not available."}</p>
            </>
          )}
        </div>
      );
    }

    // Image preview
    if (typeToPreview.startsWith("image/")) {
      return (
        <div className="flex flex-col items-center">
          <img
            src={previewContent}
            alt="Preview"
            className="max-w-full max-h-[60vh] mx-auto object-contain"
          />
        </div>
      );
    }

    // PDF preview
    if (typeToPreview === "application/pdf") {
      return <iframe src={previewContent} className="w-full h-[60vh]" title="PDF Preview" />;
    }

    // Video preview
    if (typeToPreview.startsWith("video/")) {
      return (
        <video
          src={previewContent}
          controls
          className="w-full max-h-[60vh]"
          controlsList="nodownload"
        />
      );
    }

    // Audio preview
    if (typeToPreview.startsWith("audio/")) {
      return <audio src={previewContent} controls className="w-full" controlsList="nodownload" />;
    }

    // HTML content (documents, text, etc.)
    if (["docx/html", "excel/html", "markdown/html", "text/html", "json/html", "xml/html", "csv/html"].includes(typeToPreview)) {
      return (
        <div className="flex flex-col">
          <div
            dangerouslySetInnerHTML={{ __html: previewContent }}
            className="max-h-[60vh] overflow-auto p-4 border rounded bg-white"
          />
        </div>
      );
    }

    return <p className="text-red-600">Preview not available.</p>;
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[9000] bg-gray-800 bg-opacity-75 ${className}`}>
      <div className="bg-white rounded-xl shadow-xl w-11/12 max-w-4xl p-4 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{ogFileName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="border rounded p-3 bg-gray-50">
          {renderPreview()}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={handleDownloadClick}
            disabled={isDownloading}
            className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center
              ${isDownloading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Original
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
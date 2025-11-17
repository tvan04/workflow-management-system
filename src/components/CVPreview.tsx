import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Download, ExternalLink } from 'lucide-react';

interface CVPreviewProps {
  applicationId: string;
  fileName?: string;
  className?: string;
}

const CVPreview: React.FC<CVPreviewProps> = ({ applicationId, fileName, className = '' }) => {
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const determineFileType = () => {
      if (!fileName) return 'unknown';
      
      const extension = fileName.toLowerCase().split('.').pop();
      switch (extension) {
        case 'pdf':
          return 'pdf';
        case 'docx':
        case 'doc':
          return 'docx';
        default:
          return 'unknown';
      }
    };

    const type = determineFileType();
    setFileType(type);
    
    // Create preview URL for inline viewing
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const url = `${apiBaseUrl}/applications/${applicationId}/cv?inline=true`;
    setPreviewUrl(url);
    setLoading(false);
  }, [applicationId, fileName]);

  const handleDownload = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/applications/${applicationId}/cv`);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `CV-${applicationId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download CV. Please try again.');
    }
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
          <span className="text-gray-600">Loading CV preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error loading CV: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header with file info and actions */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-gray-600 mr-2" />
          <span className="text-sm font-medium text-gray-900">
            {fileName || `CV-${applicationId}`}
          </span>
          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            {fileType.toUpperCase()}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={openInNewTab}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            title="Download file"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div className="p-0">
        {fileType === 'pdf' && previewUrl ? (
          <div className="w-full" style={{ height: '600px' }}>
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title="CV Preview"
              style={{ minHeight: '600px' }}
              onLoad={(e) => {
                // Check if iframe loaded successfully
                try {
                  const iframe = e.target as HTMLIFrameElement;
                  if (!iframe.contentDocument && !iframe.contentWindow) {
                    setError('PDF preview blocked by browser. Please use download or open in new tab.');
                  }
                } catch (err) {
                  console.warn('Could not access iframe content:', err);
                }
              }}
              onError={() => setError('Failed to load PDF preview. Please use download or open in new tab.')}
            />
          </div>
        ) : fileType === 'docx' ? (
          <div className="p-6 text-center">
            <div className="mb-4">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Word Document</h4>
              <p className="text-gray-600 mb-4">
                Preview is not available for Word documents. Please download the file or open it in a new tab to view.
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={openInNewTab}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Browser
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="mb-4">
              <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Unknown File Type</h4>
              <p className="text-gray-600 mb-4">
                Unable to preview this file type. Please download the file to view its contents.
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CVPreview;
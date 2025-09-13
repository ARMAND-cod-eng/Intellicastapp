import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { DocumentProcessor } from '../../services/documentProcessor';
import { debugFileInfo } from '../../utils/debugHelper';
import type { DocumentContent, ProcessingStatus } from '../../types/document';
import { useTheme } from '../../contexts/ThemeContext';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  documentContent?: DocumentContent;
  processingStatus?: ProcessingStatus;
}

interface DocumentUploadProps {
  onFilesUploaded: (files: File[]) => void;
  onDocumentsProcessed: (documents: DocumentContent[]) => void;
  onClose: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onFilesUploaded, onDocumentsProcessed, onClose }) => {
  const { theme } = useTheme();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [documentProcessor] = useState(() => new DocumentProcessor());

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files first
    const validFiles = acceptedFiles.filter(file => {
      const validation = DocumentProcessor.validateFile(file);
      if (!validation.valid) {
        console.error(`File ${file.name} is invalid: ${validation.error}`);
        // TODO: Show error message to user
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'uploading',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    onFilesUploaded(validFiles);

    // Process documents
    newFiles.forEach((uploadFile) => {
      processDocument(uploadFile);
    });
  }, [onFilesUploaded]);

  const processDocument = async (uploadFile: UploadedFile) => {
    try {
      const result = await documentProcessor.processDocument(
        uploadFile.file,
        (status: ProcessingStatus) => {
          setUploadedFiles(prev =>
            prev.map(f => f.id === uploadFile.id 
              ? { 
                  ...f, 
                  status: status.stage === 'completed' ? 'completed' : 
                          status.stage === 'error' ? 'error' : 'processing',
                  progress: status.progress,
                  error: status.error,
                  processingStatus: status
                }
              : f
            )
          );
        }
      );

      if (result.success && result.document) {
        setUploadedFiles(prev =>
          prev.map(f => f.id === uploadFile.id 
            ? { ...f, documentContent: result.document }
            : f
          )
        );
      } else if (result.error) {
        setUploadedFiles(prev =>
          prev.map(f => f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: result.error?.message || 'Processing failed',
                progress: 0
              }
            : f
          )
        );
      }
    } catch (error) {
      setUploadedFiles(prev =>
        prev.map(f => f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              progress: 0
            }
          : f
        )
      );
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
      'application/epub+zip': ['.epub'],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDropzoneClassName = () => {
    let baseClasses = "p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 ";
    
    if (isDragAccept) {
      return baseClasses + "border-green-400 bg-green-500/10";
    }
    if (isDragReject) {
      return baseClasses + "border-red-400 bg-red-500/10";
    }
    if (isDragActive) {
      return baseClasses + "border-accent-400 bg-accent-500/10";
    }
    return baseClasses + (theme === 'dark' 
      ? "border-gray-600/50 bg-gray-800/20 hover:border-accent-400 hover:bg-accent-500/10"
      : "border-gray-300 hover:border-blue-400");
  };
  
  const getDropzoneStyle = () => {
    if (theme === 'light') {
      return {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB'
      };
    }
    return {};
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden border" 
           style={{
             backgroundColor: theme === 'dark' ? '#1E1B4B' : '#FFFFFF',
             borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : '#E5E7EB'
           }}>
        {/* Header */}
        <div className="p-6 border-b" style={{borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : '#E5E7EB'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>Upload Your Document</h2>
                <p className="text-sm" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
                  We support PDF, EPUB, DOCX, and TXT formats. Maximum file size is 50MB.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-all duration-200 ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}
              style={{color: theme === 'dark' ? '#9CA3AF' : '#6B7280'}}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Dropzone */}
          <div {...getRootProps()} className={getDropzoneClassName()} style={getDropzoneStyle()}>
            <input {...getInputProps()} />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}`} />
            
            {isDragActive ? (
              <div>
                <p className="text-lg font-medium mb-2" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>
                  Drop your files here
                </p>
                <p className="text-sm" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
                  Release to upload your documents
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-sm mb-4" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
                  Supports PDF, DOCX, TXT, Markdown, HTML, EPUB files up to 10MB
                </p>
                <button className="px-6 py-2 bg-gradient-to-r from-accent-500 to-primary-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  Choose Files
                </button>
              </div>
            )}
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>Uploaded Files</h3>
              <div className="space-y-3">
                {uploadedFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className={`rounded-lg p-4 border ${theme === 'dark' ? 'bg-gray-800/30 border-gray-600/30' : 'bg-white border-gray-200'}`} style={{backgroundColor: theme === 'light' ? '#FFFFFF' : undefined, borderColor: theme === 'light' ? '#E5E7EB' : undefined}}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <File className={`w-5 h-5 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`} />
                        <div>
                          <p className="font-medium" style={{color: theme === 'dark' ? '#FFFFFF' : '#1F2937'}}>{uploadFile.file.name}</p>
                          <p className="text-sm" style={{color: theme === 'dark' ? '#C7D2FE' : '#4B5563'}}>
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {uploadFile.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className={`p-1 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200'}`}
                        >
                          <X className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    {uploadFile.status !== 'completed' && (
                      <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
                        <div
                          className="bg-gradient-to-r from-accent-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {/* Status */}
                    <div className="mt-2">
                      <span className={`text-sm ${
                        uploadFile.status === 'completed' ? 'text-green-400' :
                        uploadFile.status === 'error' ? 'text-red-400' :
                        (theme === 'dark' ? 'text-white/70' : 'text-gray-700')
                      }`}>
                        {uploadFile.processingStatus?.message || 
                         (uploadFile.status === 'uploading' ? 'Uploading...' :
                          uploadFile.status === 'processing' ? 'Processing...' :
                          uploadFile.status === 'completed' ? 'Ready to generate podcast' :
                          uploadFile.status === 'error' ? (uploadFile.error || 'Processing failed') : '')
                        }
                      </span>
                      
                      {/* Show document info for completed files */}
                      {uploadFile.status === 'completed' && uploadFile.documentContent && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-2 text-xs" style={{color: theme === 'dark' ? '#9CA3AF' : '#6B7280'}}>
                            <FileText className="w-3 h-3" />
                            <span>
                              {uploadFile.documentContent.metadata.wordCount?.toLocaleString()} words
                            </span>
                            {uploadFile.documentContent.structure.chapters?.length && (
                              <span>• {uploadFile.documentContent.structure.chapters.length} chapters</span>
                            )}
                          </div>
                          <p className="text-xs line-clamp-2" style={{color: theme === 'dark' ? '#9CA3AF' : '#6B7280'}}>
                            {uploadFile.documentContent.content.substring(0, 150)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {uploadedFiles.some(f => f.status === 'completed') && (
          <div className="p-6 border-t" style={{borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : '#E5E7EB', backgroundColor: theme === 'dark' ? 'rgba(55, 65, 81, 0.2)' : 'rgba(248, 249, 250, 0.5)'}}>
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{color: theme === 'dark' ? '#C7D2FE' : '#1F2937'}}>
                <p>{uploadedFiles.filter(f => f.status === 'completed').length} document(s) processed</p>
                <p className="text-xs mt-1" style={{color: theme === 'dark' ? '#9CA3AF' : '#6B7280'}}>
                  Total: {uploadedFiles
                    .filter(f => f.documentContent)
                    .reduce((sum, f) => sum + (f.documentContent?.metadata.wordCount || 0), 0)
                    .toLocaleString()} words
                </p>
              </div>
              <button 
                onClick={() => {
                  const processedDocuments = uploadedFiles
                    .filter(f => f.status === 'completed' && f.documentContent)
                    .map(f => f.documentContent!);
                  onDocumentsProcessed(processedDocuments);
                }}
                className="px-6 py-2 bg-gradient-to-r from-accent-500 to-primary-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                Generate Podcasts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
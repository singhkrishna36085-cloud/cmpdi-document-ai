"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, File, FileText, Image as ImageIcon, FileArchive, FileSpreadsheet, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { FileItem, DocumentMetadata } from "@/types/upload";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

interface FileItemRowProps {
  item: FileItem;
  onRemove: (id: string) => void;
  onUpdateMetadata: (id: string, metadata: DocumentMetadata) => void;
}

export function FileItemRow({ item, onRemove, onUpdateMetadata }: FileItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="h-6 w-6 text-red-500" />;
      case 'docx': return <FileText className="h-6 w-6 text-blue-500" />;
      case 'xlsx': 
      case 'csv': return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <ImageIcon className="h-6 w-6 text-purple-500" />;
      case 'zip': return <FileArchive className="h-6 w-6 text-yellow-500" />;
      default: return <File className="h-6 w-6 text-gray-400" />;
    }
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onUpdateMetadata(item.id, { ...item.metadata, [name]: value });
  };

  const isInvalid = item.status !== "valid";
  const missingRequired = !item.metadata.name || !item.metadata.type || !item.metadata.source || !item.metadata.category || !item.metadata.date;

  return (
    <div className={`border rounded-lg mb-4 bg-white overflow-hidden transition-colors ${isInvalid ? 'border-red-300' : 'border-gray-200'}`}>
      {/* Header Row */}
      <div 
        className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'border-b border-gray-100 bg-gray-50' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0 mr-4">
          {getFileIcon(item.file.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(item.file.size)}</p>
        </div>
        
        <div className="flex items-center space-x-4 ml-4">
          {/* Validation Status */}
          {item.status === "valid" ? (
            item.uploadState === "ready" ? (
              <StatusBadge status="success" label="Ready to Upload" />
            ) : item.uploadState === "processing" ? (
              <StatusBadge status="pending" label="Uploading..." />
            ) : item.uploadState === "success" ? (
              <StatusBadge status="success" label="Uploaded" />
            ) : missingRequired ? (
               <StatusBadge status="warning" label="Missing Metadata" />
            ) : (
              <StatusBadge status="info" label="Valid" />
            )
          ) : (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              {item.errorMessage}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Document Metadata</h4>
          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`name-${item.id}`} className="block text-sm font-medium text-gray-700">Document Name *</label>
              <input
                type="text"
                name="name"
                id={`name-${item.id}`}
                value={item.metadata.name}
                onChange={handleMetadataChange}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor={`type-${item.id}`} className="block text-sm font-medium text-gray-700">Document Type *</label>
              <select
                name="type"
                id={`type-${item.id}`}
                value={item.metadata.type}
                onChange={handleMetadataChange}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
              >
                <option value="">Select Type</option>
                <option value="Geological Report">Geological Report</option>
                <option value="Mining Plan">Mining Plan</option>
                <option value="Production Log">Production Log</option>
                <option value="Survey Map">Survey Map</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor={`source-${item.id}`} className="block text-sm font-medium text-gray-700">Source / Department *</label>
              <input
                type="text"
                name="source"
                id={`source-${item.id}`}
                value={item.metadata.source}
                onChange={handleMetadataChange}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor={`category-${item.id}`} className="block text-sm font-medium text-gray-700">Category *</label>
              <select
                name="category"
                id={`category-${item.id}`}
                value={item.metadata.category}
                onChange={handleMetadataChange}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
              >
                <option value="">Select Category</option>
                <option value="Exploration">Exploration</option>
                <option value="Planning">Planning</option>
                <option value="Operations">Operations</option>
                <option value="Compliance">Compliance</option>
              </select>
            </div>

            <div>
              <label htmlFor={`date-${item.id}`} className="block text-sm font-medium text-gray-700">Document Date *</label>
              <input
                type="date"
                name="date"
                id={`date-${item.id}`}
                value={item.metadata.date}
                onChange={handleMetadataChange}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={`desc-${item.id}`} className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                name="description"
                id={`desc-${item.id}`}
                rows={2}
                value={item.metadata.description}
                onChange={handleMetadataChange}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

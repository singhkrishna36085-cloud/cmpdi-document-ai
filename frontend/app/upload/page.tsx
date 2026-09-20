import { DocumentUploader } from "@/components/upload/DocumentUploader";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-white -m-6 p-6">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Light-theme page header */}
        <div className="md:flex md:items-center md:justify-between mb-8 pb-4 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Upload Documents
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-3xl">
              Securely upload new documents for processing and OCR extraction.
            </p>
          </div>
        </div>
        <DocumentUploader lightTheme />
      </div>
    </div>
  );
}

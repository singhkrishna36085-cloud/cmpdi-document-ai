import { PageHeader } from "@/components/ui/PageHeader";
import { DocumentUploader } from "@/components/upload/DocumentUploader";

export default function UploadPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader 
        title="Upload Documents" 
        description="Securely upload new documents for processing and OCR extraction."
      />
      <DocumentUploader />
    </div>
  );
}

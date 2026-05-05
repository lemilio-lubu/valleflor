import { useState, useRef } from 'react';
import { Upload, FileDown, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export function BulkUploadCatalog() {
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File, isPreview: boolean) => {
    setError(null);
    if (isPreview) setSummary(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', isPreview.toString());

    try {
      const response = await api.post('/admin/catalog/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummary(response.data);
      
      if (isPreview) {
        setPreviewMode(true);
        setSelectedFile(file);
      } else {
        // Success on real upload
        setPreviewMode(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, true);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      processFile(selectedFile, false);
    }
  };

  const handleCancel = () => {
    setPreviewMode(false);
    setSelectedFile(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const headers = ['FINCA', 'RESPONSABLE', 'PRODUCTO', 'VARIEDAD', 'COLOR'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_catalogo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-carbon-900 mb-1">Carga Masiva</h2>
          <p className="text-sm text-carbon-400">Importa productos, variedades, colores y responsables mediante Excel</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button 
            onClick={handleDownloadTemplate}
            className="btn-secondary flex items-center gap-2"
            disabled={previewMode || isUploading}
          >
            <FileDown className="w-4 h-4" />
            <span>Plantilla CSV</span>
          </button>
          
          {!previewMode ? (
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={isUploading}
              />
              <button className="btn-primary flex items-center gap-2" disabled={isUploading}>
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isUploading ? 'Revisando...' : 'Revisar Excel'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCancel}
                className="btn-ghost"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm}
                className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500 border-none flex items-center gap-2"
                disabled={isUploading}
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>{isUploading ? 'Guardando...' : 'Confirmar y Subir'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 mt-4 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div className="bg-surface-50 border border-surface-border rounded-lg p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-carbon-900 flex items-center gap-2">
              {previewMode ? (
                <>
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                  Previsualización de la carga
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Carga completada con éxito
                </>
              )}
            </h3>
            {previewMode && (
              <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">
                Pendiente de confirmación
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded border border-surface-border text-center">
              <span className="block text-2xl font-bold text-green-600">{summary.insertados}</span>
              <span className="text-xs text-carbon-500 uppercase font-medium">Nuevos Registros</span>
            </div>
            <div className="bg-white p-3 rounded border border-surface-border text-center">
              <span className="block text-2xl font-bold text-blue-600">{summary.actualizados}</span>
              <span className="text-xs text-carbon-500 uppercase font-medium">Actualizados</span>
            </div>
            <div className="bg-white p-3 rounded border border-surface-border text-center">
              <span className="block text-2xl font-bold text-carbon-400">{summary.omitidos}</span>
              <span className="text-xs text-carbon-500 uppercase font-medium">Omitidos (Duplicados)</span>
            </div>
          </div>
          
          {summary.errores && summary.errores.length > 0 && (
            <div className="mt-4 border-t border-surface-border pt-4">
              <h4 className="text-sm font-semibold text-red-600 mb-2">Advertencias ({summary.errores.length})</h4>
              <ul className="text-xs text-carbon-500 space-y-1 max-h-32 overflow-y-auto">
                {summary.errores.map((err: string, i: number) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

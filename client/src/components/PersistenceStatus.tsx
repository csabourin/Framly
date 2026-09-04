import React, { useState, useSyncExternalStore } from 'react';
import { Database, Download, Upload, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from './ui/dialog';
import { persistenceManager } from '../utils/persistence';
import { useTranslation } from 'react-i18next';

const PersistenceStatus: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const saved = useSyncExternalStore(persistenceManager.subscribe, persistenceManager.getSnapshot);
  const label = t(`persistence.${saved.status}`);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      const data = await persistenceManager.exportData();
      
      // Create and download file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design-tool-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isImporting) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      await persistenceManager.importData(text);
      
      alert('Data imported successfully! The page will reload to apply changes.');
      window.location.reload();
    } catch (error) {
      alert('Failed to import data. Please check the file format and try again.');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (isClearing) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to clear all data? This will remove all projects and components permanently.'
    );
    
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await persistenceManager.clearAllData();
      alert('All data cleared successfully!');
      setIsOpen(false);
    } catch (error) {
      alert('Failed to clear data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="framly-rail-control gap-2 text-xs"
          aria-label={t('persistence.statusLabel', { status: label })}
          data-save-state={saved.status}
          data-testid="button-persistence-status"
        >
          <Database size={14} />
          <span role="status" aria-live="polite">{label}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={20} />
            {t('persistence.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 border border-[var(--rule)] text-[var(--ink)] rounded-md space-y-2">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-sm" role={saved.status === 'error' ? 'alert' : undefined}>
              {saved.status === 'error' ? t('persistence.saveError') : t('persistence.local')}
            </p>
            {saved.savedAt && <p className="text-xs">{t('persistence.lastSaved', { time: new Date(saved.savedAt).toLocaleTimeString() })}</p>}
            {saved.status === 'error' && <Button variant="outline" size="sm" data-testid="button-retry-save"
              onClick={() => { void persistenceManager.saveCurrentProject().catch(() => {}); }}>{t('persistence.retry')}</Button>}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Data Management</div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={handleExport}
                disabled={isExporting}
                data-testid="button-export-data"
              >
                <Download size={14} />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              
              <div className="flex-1">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-file"
                  disabled={isImporting}
                />
                <label htmlFor="import-file">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full gap-2"
                    disabled={isImporting}
                    data-testid="button-import-data"
                    asChild
                  >
                    <span>
                      <Upload size={14} />
                      {isImporting ? 'Importing...' : 'Import'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full gap-2"
              onClick={handleClearAll}
              disabled={isClearing}
              data-testid="button-clear-data"
            >
              <Trash2 size={14} />
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <div>• All changes are saved locally in your browser</div>
            <div>• Use export/import to backup or transfer your work</div>
            <div>• Data persists across browser sessions</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersistenceStatus;
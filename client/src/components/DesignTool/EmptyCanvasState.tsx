import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutTemplate } from 'lucide-react';

interface EmptyCanvasStateProps {
  onBrowseTemplates: () => void;
}

/**
 * Shown over the artboard while the design has no elements.
 *
 * The wrapper is pointer-events-none so the canvas underneath stays fully
 * drawable - only the button itself takes clicks. The panel carries its own
 * background so it stays legible whatever the user sets as the body colour.
 */
const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = ({ onBrowseTemplates }) => {
  const { t } = useTranslation();

  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-5 pointer-events-none"
      data-testid="empty-canvas-state"
    >
      <div className="w-full max-w-[300px] rounded-2xl border border-slate-200 bg-white/95 px-6 py-7 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <LayoutTemplate className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </span>

        {/* role="status" so the message is announced if the canvas becomes empty again */}
        <div role="status">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('emptyCanvas.title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t('emptyCanvas.description')}
          </p>
        </div>

        <button
          type="button"
          onClick={onBrowseTemplates}
          className="pointer-events-auto mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 motion-reduce:transition-none hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          data-testid="button-browse-templates"
        >
          {t('emptyCanvas.browseTemplates')}
        </button>
      </div>
    </div>
  );
};

export default EmptyCanvasState;

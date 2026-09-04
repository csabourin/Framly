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
      <div className="w-full max-w-[292px] border border-[#d9dcd7] bg-white px-6 py-6 text-center">
        <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-[#bfc4bd]">
          <LayoutTemplate className="h-5 w-5 text-[#5a605c]" aria-hidden="true" />
        </span>

        {/* role="status" so the message is announced if the canvas becomes empty again */}
        <div role="status">
          <div role="heading" aria-level={2} className="text-base font-semibold text-[#191c1a]">
            {t('emptyCanvas.title')}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#5a605c]">
            {t('emptyCanvas.description')}
          </p>
        </div>

        <button
          type="button"
          onClick={onBrowseTemplates}
          className="pointer-events-auto mt-5 inline-flex min-h-[36px] w-full items-center justify-center rounded-[4px] border border-[#191c1a] bg-[#191c1a] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#5a605c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191c1a]"
          data-testid="button-browse-templates"
        >
          {t('emptyCanvas.browseTemplates')}
        </button>
      </div>
    </div>
  );
};

export default EmptyCanvasState;

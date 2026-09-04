import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  STARTER_TEMPLATES,
  countTemplateElements,
  type PreviewBlock,
  type StarterTemplate,
} from '../../utils/starterTemplates';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: StarterTemplate) => void;
}

const TONE_CLASSES: Record<PreviewBlock['tone'], string> = {
  strong: 'bg-slate-400',
  medium: 'bg-slate-200',
  soft: 'bg-slate-300',
  accent: 'bg-blue-400',
};

/** Decorative wireframe thumbnail. Hidden from assistive tech - the card's
 *  name, description and element count already describe the template. */
const TemplatePreview: React.FC<{ blocks: PreviewBlock[] }> = ({ blocks }) => (
  <span
    className="flex h-[104px] w-full flex-col items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3"
    aria-hidden="true"
  >
    {blocks.map((block, index) => (
      <span
        key={index}
        className={`block rounded-sm ${TONE_CLASSES[block.tone]}`}
        style={{ width: `${block.width}%`, height: `${block.height}px` }}
      />
    ))}
  </span>
);

const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl" data-testid="template-gallery-modal">
        <DialogHeader>
          <DialogTitle>{t('templates.galleryTitle')}</DialogTitle>
          <DialogDescription>{t('templates.galleryDescription')}</DialogDescription>
        </DialogHeader>

        <ul className="mt-2 grid list-none gap-4 p-0 sm:grid-cols-3" data-testid="template-list">
          {STARTER_TEMPLATES.map((template) => {
            const elementCount = countTemplateElements(template);

            return (
              // m-0/p-0 override the global `ul li` rule in index.css
              <li key={template.id} className="m-0 p-0">
                <button
                  type="button"
                  onClick={() => onSelect(template)}
                  className="group flex h-full w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-shadow duration-150 motion-reduce:transition-none hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:border-slate-700 dark:bg-slate-900"
                  data-testid={`template-card-${template.id}`}
                >
                  <TemplatePreview blocks={template.preview} />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t(template.nameKey)}
                    </span>
                    <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {t(template.descriptionKey)}
                    </span>
                    <span className="mt-auto pt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('templates.elementCount', { count: elementCount })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateGalleryModal;

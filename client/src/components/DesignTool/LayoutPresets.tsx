import React from 'react';
import { useTranslation } from 'react-i18next';
import { CanvasElement } from '../../types/canvas';
import { LayoutGrid, Rows, Columns } from 'lucide-react';

interface LayoutPresetsProps {
    element: CanvasElement;
    onApplyPreset: (updates: Partial<CanvasElement>) => void;
}

type LayoutPreset = {
    id: string;
    icon: React.ComponentType<any>;
    label: string;
    description: string;
    styles: {
        display: string;
        flexDirection?: 'row' | 'column';
        justifyContent?: string;
        alignItems?: string;
        gap?: string;
        gridTemplateColumns?: string;
    };
};

/**
 * Layout Presets Component
 * Provides one-click layout patterns for containers
 */
const LayoutPresets: React.FC<LayoutPresetsProps> = ({ element, onApplyPreset }) => {
    const { t } = useTranslation();

    const presets: LayoutPreset[] = [
        {
            id: 'stack',
            icon: Rows,
            label: t('layout.stack'),
            description: 'Vertical stack with gap',
            styles: {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                alignItems: 'stretch'
            }
        },
        {
            id: 'row',
            icon: Columns,
            label: t('layout.rowLayout'),
            description: 'Horizontal row with gap',
            styles: {
                display: 'flex',
                flexDirection: 'row',
                gap: '16px',
                alignItems: 'center'
            }
        },
        {
            id: 'grid-2',
            icon: LayoutGrid,
            label: t('layout.gridTwoCol'),
            description: '2-column grid',
            styles: {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
            }
        },
        {
            id: 'grid-3',
            icon: LayoutGrid,
            label: t('layout.gridThreeCol'),
            description: '3-column grid',
            styles: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
            }
        },
        {
            id: 'grid-4',
            icon: LayoutGrid,
            label: t('layout.gridFourCol'),
            description: '4-column grid',
            styles: {
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px'
            }
        }
    ];

    const handleApplyPreset = (preset: LayoutPreset) => {
        const updates: Partial<CanvasElement> = {
            styles: {
                ...element.styles,
                ...preset.styles
            }
        };

        // Update element-level properties for flex
        if (preset.styles.flexDirection) {
            updates.flexDirection = preset.styles.flexDirection;
        }
        if (preset.styles.justifyContent) {
            updates.justifyContent = preset.styles.justifyContent as any;
        }
        if (preset.styles.alignItems) {
            updates.alignItems = preset.styles.alignItems as any;
        }

        onApplyPreset(updates);
    };

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                {t('layout.presets')}
            </label>

            <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                    const IconComponent = preset.icon;
                    const isActive =
                        (preset.styles.display === 'flex' && element.styles?.display === 'flex' && element.styles?.flexDirection === preset.styles.flexDirection) ||
                        (preset.styles.display === 'grid' && element.styles?.display === 'grid' && element.styles?.gridTemplateColumns === preset.styles.gridTemplateColumns);

                    return (
                        <button
                            key={preset.id}
                            onClick={() => handleApplyPreset(preset)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${isActive
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                                }`}
                            title={preset.description}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <IconComponent className={`w-4 h-4 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                                    }`} />
                                <span className={`text-xs font-medium ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                    {preset.label}
                                </span>
                            </div>
                            {isActive && (
                                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">✓ Active</div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                💡 Click a preset to quickly apply a common layout pattern
            </div>
        </div>
    );
};

export default LayoutPresets;

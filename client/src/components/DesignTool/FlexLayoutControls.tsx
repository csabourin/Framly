import React from 'react';
import { useTranslation } from 'react-i18next';
import { CanvasElement } from '../../types/canvas';
import { ArrowRight, ArrowDown } from 'lucide-react';
import LayoutPresets from './LayoutPresets';

interface FlexLayoutControlsProps {
    element: CanvasElement;
    onUpdate: (updates: Partial<CanvasElement>) => void;
}

type FlexDirection = 'row' | 'column';
type JustifyContent = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
type AlignItems = 'flex-start' | 'center' | 'flex-end' | 'stretch';

/**
 * Visual Flexbox Layout Controls
 * Provides intuitive UI for flexbox properties without requiring CSS knowledge
 */
const FlexLayoutControls: React.FC<FlexLayoutControlsProps> = ({ element, onUpdate }) => {
    const { t } = useTranslation();

    const direction = (element.styles?.flexDirection as FlexDirection) || element.flexDirection || 'column';
    const justifyContent = (element.styles?.justifyContent as JustifyContent) || element.justifyContent || 'flex-start';
    const alignItems = (element.styles?.alignItems as AlignItems) || element.alignItems || 'stretch';
    const gap = element.styles?.gap || '0px';

    const handleDirectionChange = (newDirection: FlexDirection) => {
        onUpdate({
            flexDirection: newDirection,
            styles: {
                ...element.styles,
                flexDirection: newDirection,
                display: 'flex'
            }
        });
    };

    const handleAlignmentChange = (justify: JustifyContent, align: AlignItems) => {
        onUpdate({
            justifyContent: justify,
            alignItems: align,
            styles: {
                ...element.styles,
                justifyContent: justify,
                alignItems: align,
                display: 'flex'
            }
        });
    };

    const handleGapChange = (newGap: string) => {
        onUpdate({
            styles: {
                ...element.styles,
                gap: newGap
            }
        });
    };

    // 3x3 alignment grid mapping
    const alignmentGrid: Array<{ justify: JustifyContent; align: AlignItems; label: string }> = [
        { justify: 'flex-start', align: 'flex-start', label: t('layout.topLeft') },
        { justify: 'center', align: 'flex-start', label: t('layout.topCenter') },
        { justify: 'flex-end', align: 'flex-start', label: t('layout.topRight') },
        { justify: 'flex-start', align: 'center', label: t('layout.middleLeft') },
        { justify: 'center', align: 'center', label: t('layout.center') },
        { justify: 'flex-end', align: 'center', label: t('layout.middleRight') },
        { justify: 'flex-start', align: 'flex-end', label: t('layout.bottomLeft') },
        { justify: 'center', align: 'flex-end', label: t('layout.bottomCenter') },
        { justify: 'flex-end', align: 'flex-end', label: t('layout.bottomRight') },
    ];

    // Additional justify options
    const spaceOptions: Array<{ justify: JustifyContent; label: string }> = [
        { justify: 'space-between', label: t('layout.spaceBetween') },
        { justify: 'space-around', label: t('layout.spaceAround') },
    ];

    const isActive = (justify: JustifyContent, align: AlignItems) => {
        return justifyContent === justify && alignItems === align;
    };

    return (
        <div className="space-y-4">
            {/* Direction Picker */}
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('layout.direction')}
                </label>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleDirectionChange('row')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${direction === 'row'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        title={t('layout.horizontal')}
                    >
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('layout.row')}</span>
                    </button>
                    <button
                        onClick={() => handleDirectionChange('column')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${direction === 'column'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        title={t('layout.vertical')}
                    >
                        <ArrowDown className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('layout.column')}</span>
                    </button>
                </div>
            </div>

            {/* Alignment Grid */}
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('layout.alignment')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {alignmentGrid.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAlignmentChange(option.justify, option.align)}
                            className={`aspect-square rounded-lg border-2 transition-all relative ${isActive(option.justify, option.align)
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            title={option.label}
                        >
                            {/* Visual representation of alignment */}
                            <div className="absolute inset-2 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
                                <div className={`w-2 h-2 rounded-full ${isActive(option.justify, option.align) ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} style={{
                                        position: 'absolute',
                                        ...(option.align === 'flex-start' && { top: '4px' }),
                                        ...(option.align === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
                                        ...(option.align === 'flex-end' && { bottom: '4px' }),
                                        ...(option.justify === 'flex-start' && { left: '4px' }),
                                        ...(option.justify === 'center' && { left: '50%', transform: option.align === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)' }),
                                        ...(option.justify === 'flex-end' && { right: '4px' }),
                                    }} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Space Between/Around */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {spaceOptions.map((option) => (
                        <button
                            key={option.justify}
                            onClick={() => handleAlignmentChange(option.justify, alignItems)}
                            className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${justifyContent === option.justify
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gap Slider */}
            <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('layout.gap')}
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max="64"
                        step="4"
                        value={parseInt(gap) || 0}
                        onChange={(e) => handleGapChange(`${e.target.value}px`)}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        value={parseInt(gap) || 0}
                        onChange={(e) => handleGapChange(`${e.target.value}px`)}
                        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">px</span>
                </div>
            </div>

            {/* Stretch Option */}
            {alignItems === 'stretch' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {t('layout.stretchInfo')}
                </div>
            )}

            {/* Layout Presets */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <LayoutPresets
                    element={element}
                    onApplyPreset={onUpdate}
                />
            </div>
        </div>
    );
};

export default FlexLayoutControls;

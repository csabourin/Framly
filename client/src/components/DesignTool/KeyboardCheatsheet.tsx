import React, { useState, useMemo } from 'react';
import { X, Search, Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

interface KeyboardCheatsheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
  isMac: boolean;
}

const formatModifierKey = (modifier: string, isMac: boolean): string => {
  switch (modifier) {
    case 'ctrl':
    case 'meta':
      return isMac ? '⌘' : 'Ctrl';
    case 'shift':
      return isMac ? '⇧' : 'Shift';
    case 'alt':
      return isMac ? '⌥' : 'Alt';
    default:
      return modifier;
  }
};

const formatKey = (key: string): string => {
  switch (key.toLowerCase()) {
    case 'arrowup':
      return '↑';
    case 'arrowdown':
      return '↓';
    case 'arrowleft':
      return '←';
    case 'arrowright':
      return '→';
    case 'backspace':
      return 'Backspace';
    case 'delete':
      return 'Delete';
    case '=':
      return '+';
    case '-':
      return '-';
    case '0':
      return '0';
    case '?':
      return '?';
    default:
      return key.toUpperCase();
  }
};

const ShortcutBadge: React.FC<{ 
  shortcut: KeyboardShortcut; 
  isMac: boolean;
}> = ({ shortcut, isMac }) => {
  const modifierKeys: string[] = [];
  
  if (shortcut.modifiers.ctrl || shortcut.modifiers.meta) {
    modifierKeys.push(formatModifierKey('ctrl', isMac));
  }
  if (shortcut.modifiers.shift) {
    modifierKeys.push(formatModifierKey('shift', isMac));
  }
  if (shortcut.modifiers.alt) {
    modifierKeys.push(formatModifierKey('alt', isMac));
  }
  
  const allKeys = [...modifierKeys, formatKey(shortcut.key)];
  
  return (
    <div className="flex items-center gap-1">
      {allKeys.map((key, index) => (
        <React.Fragment key={index}>
          <Badge 
            variant="outline" 
            className="px-2 py-1 text-xs font-mono bg-muted/50 border-border/60"
          >
            {key}
          </Badge>
          {index < allKeys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const KeyboardCheatsheet: React.FC<KeyboardCheatsheetProps> = ({
  open,
  onOpenChange,
  shortcuts,
  isMac
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Group shortcuts by category and filter by search
  const groupedShortcuts = useMemo(() => {
    const filtered = shortcuts.filter(shortcut => 
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    return grouped;
  }, [shortcuts, searchQuery]);

  const categoryOrder = ['Tools', 'Edit', 'Arrange', 'Position', 'View', 'Help'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
            <Badge variant="secondary" className="ml-2">
              {isMac ? 'macOS' : 'Windows/Linux'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Shortcuts */}
          <div className="overflow-y-auto max-h-[50vh] space-y-6">
            {categoryOrder.map(category => {
              const categoryShortcuts = groupedShortcuts[category];
              if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div 
                        key={`${category}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm text-foreground">
                          {shortcut.description}
                        </span>
                        <ShortcutBadge shortcut={shortcut} isMac={isMac} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* No results */}
          {Object.keys(groupedShortcuts).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Keyboard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No shortcuts found for "{searchQuery}"</p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-border text-xs text-muted-foreground">
            <p>
              Shortcuts work when no text field is focused. Press <Badge variant="outline" className="px-1 py-0.5 text-xs">?</Badge> to open this cheatsheet.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
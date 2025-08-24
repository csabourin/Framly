#!/bin/bash
# Remove excessive console.log statements while keeping error logging

# Remove console.log from frequently called Canvas methods (mouse events, etc)
sed -i 's/console\.log.*Mouse move.*//g' client/src/components/DesignTool/Canvas.tsx
sed -i 's/console\.log.*DOM detection.*//g' client/src/components/DesignTool/Canvas.tsx
sed -i 's/console\.log.*Hover zone.*//g' client/src/components/DesignTool/Canvas.tsx
sed -i 's/console\.log.*Element.*border styles.*//g' client/src/components/DesignTool/*.tsx
sed -i 's/console\.log.*Falling back to root.*//g' client/src/components/DesignTool/*.tsx
sed -i 's/console\.log.*Expanding.*//g' client/src/hooks/useExpandedElements.ts
sed -i 's/console\.log.*Template element.*//g' client/src/hooks/useExpandedElements.ts

# Keep console.error for actual errors
echo "Removed excessive console.log statements while keeping error logging"

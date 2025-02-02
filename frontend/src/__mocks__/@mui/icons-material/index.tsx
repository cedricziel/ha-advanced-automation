import React from 'react';

const createIconComponent = (name: string) => {
  const Component = () => React.createElement('span', { 'data-testid': name });
  Component.displayName = name;
  return Component;
};

export const Edit = createIconComponent('EditIcon');
export const Delete = createIconComponent('DeleteIcon');
export const Add = createIconComponent('AddIcon');
export const ExpandMore = createIconComponent('ExpandMoreIcon');
export const ClearAll = createIconComponent('ClearAllIcon');
export const ContentCopy = createIconComponent('ContentCopyIcon');

import React from 'react';

const createMuiComponent = <P extends object>(name: string) => {
  return React.forwardRef<HTMLElement, P>((props, ref) => {
    return React.createElement(name, { ...props, ref });
  });
};

export const Box = createMuiComponent('div');
export const Typography = createMuiComponent('div');
export const Button = createMuiComponent('button');
export const IconButton = createMuiComponent('button');
export const TextField = createMuiComponent('input');
export const Switch = createMuiComponent('input');
export const Card = createMuiComponent('div');
export const CardContent = createMuiComponent('div');
export const CardActions = createMuiComponent('div');
export const Grid = createMuiComponent('div');
export const Dialog = createMuiComponent('div');
export const DialogTitle = createMuiComponent('div');
export const DialogContent = createMuiComponent('div');
export const DialogActions = createMuiComponent('div');
export const Alert = createMuiComponent('div');
export const Snackbar = createMuiComponent('div');
export const CircularProgress = createMuiComponent('div');
export const Accordion = createMuiComponent('div');
export const AccordionSummary = createMuiComponent('div');
export const AccordionDetails = createMuiComponent('div');
export const Tooltip = createMuiComponent('div');
export const Badge = createMuiComponent('div');
export const Tabs = createMuiComponent('div');
export const Tab = createMuiComponent('div');

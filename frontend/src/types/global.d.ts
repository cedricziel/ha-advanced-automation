/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '@blockly/continuous-toolbox';
declare module '@blockly/field-multilineinput';

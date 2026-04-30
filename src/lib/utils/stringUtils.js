/**
 * Converte uma string em PascalCase ou camelCase para kebab-case.
 * Ex: ProcessDetail -> process-detail
 * 
 * @param {string} str - A string para converter.
 * @returns {string} - A string formatada em kebab-case.
 */
export const toKebabCase = (str) => {
  if (!str) return '';
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

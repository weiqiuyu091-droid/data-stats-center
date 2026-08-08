import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Global ignores (must be standalone object in flat config)
  {
    ignores: ['node_modules/', 'shuju/', '_*.js', '*.bak', 'node-v*/', '*.txt', '*.ps1', 'lottery_data.js'],
  },

  // Base: recommended + prettier for all JS files
  js.configs.recommended,
  prettierConfig,

  // Project-wide globals and rules
  {
    languageOptions: {
      globals: {
        // Browser globals (fsaf.html)
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        WebSocket: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        alert: 'readonly',
        // SheetJS CDN
        XLSX: 'readonly',
        // Lottery data file
        LOTTERY_DATA: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'warn',
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Server-side files
  {
    files: ['server.js', 'parser.js', 'ai_brain.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        RegExp: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'script',
    },
  },
];

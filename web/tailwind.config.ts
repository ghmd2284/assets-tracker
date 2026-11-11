import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F8F7F4',
          dark: '#161514',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dim: '#ECE7E0',
          dark: '#201E1C',
          'dark-dim': '#11100F',
        },
        brand: {
          primary: '#2C2623',
          'primary-dark': '#EDE8E3',
          subdued: '#5C554E',
          'subdued-dark': '#A59B91',
          border: '#EAE6DF',
          'border-dark': '#2E2B27',
          divider: '#F1EDE7',
          'divider-dark': '#3D3833',
          accent: '#D6C7B2',
          'accent-light': '#E8DFD1',
        },
        semantic: {
          gain: '#2E6A34',
          'gain-bg': '#EBF4EC',
          'gain-dark': '#78C27E',
          'gain-dark-bg': '#142E18',
          loss: '#A83832',
          'loss-bg': '#FAEDEC',
          'loss-dark': '#E5736E',
          'loss-dark-bg': '#381A19',
        },
        chain: {
          ton: '#3B728C',
          evm: '#9E7B56',
          solana: '#5F8569',
          other: '#857F78',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        bento: '1.25rem',
        tile: '1rem',
        button: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;

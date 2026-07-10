import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // AAS brand colours
        aas: {
          blue: '#1B4F8A',
          'blue-dark': '#0F3160',
          'blue-mid': '#2563AA',
          'blue-light': '#3B82C4',
          'blue-pale': '#EBF3FC',
          'blue-50': '#F0F6FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

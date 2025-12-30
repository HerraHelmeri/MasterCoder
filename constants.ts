import { FileSystemItem, FileType } from './types';

export const INITIAL_FILE_SYSTEM: FileSystemItem[] = [
  {
    id: 'root',
    name: 'VSCODE-CLONE',
    type: FileType.FOLDER,
    depth: 0,
    children: [
      {
        id: 'src',
        name: 'src',
        type: FileType.FOLDER,
        parentId: 'root',
        depth: 1,
        children: [
          {
            id: 'components',
            name: 'components',
            type: FileType.FOLDER,
            parentId: 'src',
            depth: 2,
            children: [
              {
                id: 'Header.tsx',
                name: 'Header.tsx',
                type: FileType.FILE,
                parentId: 'components',
                depth: 3,
                language: 'typescript',
                content: `import React from 'react';\n\nexport const Header = () => {\n  return (\n    <header className="p-4 bg-gray-800 text-white">\n      <h1>Welcome to VS Code Web</h1>\n    </header>\n  );\n};`
              },
              {
                id: 'Button.tsx',
                name: 'Button.tsx',
                type: FileType.FILE,
                parentId: 'components',
                depth: 3,
                language: 'typescript',
                content: `import React from 'react';\n\ninterface ButtonProps {\n  onClick: () => void;\n  children: React.ReactNode;\n}\n\nexport const Button: React.FC<ButtonProps> = ({ onClick, children }) => (\n  <button onClick={onClick} className="px-4 py-2 bg-blue-600 rounded">\n    {children}\n  </button>\n);`
              }
            ]
          },
          {
            id: 'utils',
            name: 'utils',
            type: FileType.FOLDER,
            parentId: 'src',
            depth: 2,
            children: [
              {
                id: 'helpers.ts',
                name: 'helpers.ts',
                type: FileType.FILE,
                parentId: 'utils',
                depth: 3,
                language: 'typescript',
                content: `export const formatDate = (date: Date): string => {\n  return new Intl.DateTimeFormat('en-US').format(date);\n};\n\nexport const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);`
              }
            ]
          },
          {
            id: 'App.tsx',
            name: 'App.tsx',
            type: FileType.FILE,
            parentId: 'src',
            depth: 2,
            language: 'typescript',
            content: `import React from 'react';\nimport { Header } from './components/Header';\n\nexport default function App() {\n  return (\n    <div className="app">\n      <Header />\n      <main>\n        <p>Start editing to see some magic happen!</p>\n      </main>\n    </div>\n  );\n}`
          },
          {
            id: 'index.css',
            name: 'index.css',
            type: FileType.FILE,
            parentId: 'src',
            depth: 2,
            language: 'css',
            content: `body {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n  background: #1e1e1e;\n  color: #fff;\n}\n\n.app {\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n}`
          }
        ]
      },
      {
        id: 'package.json',
        name: 'package.json',
        type: FileType.FILE,
        parentId: 'root',
        depth: 1,
        language: 'json',
        content: `{\n  "name": "vscode-clone",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "lucide-react": "^0.263.1"\n  }\n}`
      },
      {
        id: 'tsconfig.json',
        name: 'tsconfig.json',
        type: FileType.FILE,
        parentId: 'root',
        depth: 1,
        language: 'json',
        content: `{\n  "compilerOptions": {\n    "target": "es5",\n    "lib": ["dom", "dom.iterable", "esnext"],\n    "allowJs": true,\n    "skipLibCheck": true,\n    "esModuleInterop": true,\n    "allowSyntheticDefaultImports": true,\n    "strict": true,\n    "forceConsistentCasingInFileNames": true,\n    "noFallthroughCasesInSwitch": true,\n    "module": "esnext",\n    "moduleResolution": "node",\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "noEmit": true,\n    "jsx": "react-jsx"\n  },\n  "include": ["src"]\n}`
      },
      {
        id: 'README.md',
        name: 'README.md',
        type: FileType.FILE,
        parentId: 'root',
        depth: 1,
        language: 'markdown',
        content: `# VS Code Web Clone\n\nThis is a demo project showcasing a Visual Studio Code clone built with React, Tailwind CSS, and Monaco Editor.\n\n## Features\n- File Explorer\n- Tab System\n- Syntax Highlighting\n- Intellisense (Basic)`
      }
    ]
  }
];

export const MOCK_TERMINAL_CONTENT = [
  { type: 'info', content: 'Welcome to VS Code Web Terminal' },
  { type: 'success', content: '✓ Project initialized successfully' },
  { type: 'info', content: 'Wait... installing dependencies...' },
  { type: 'info', content: 'Done in 1.45s' },
  { type: 'input', content: 'npm start' },
  { type: 'info', content: '> vscode-clone@1.0.0 start' },
  { type: 'info', content: '> react-scripts start' },
  { type: 'success', content: 'Starting the development server...' },
];
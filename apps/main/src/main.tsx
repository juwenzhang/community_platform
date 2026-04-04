import { theme as antdTheme, ConfigProvider } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useThemeStore } from './stores/useThemeStore';
import './styles/index.less';

function Root() {
  const theme = useThemeStore((s) => s.theme);
  const algorithm = theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1e80ff',
          borderRadius: 4,
        },
        algorithm,
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

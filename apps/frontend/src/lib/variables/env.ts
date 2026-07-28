export const env = {
  VITE_APP_NAME: window?.__ENV__?.VITE_APP_NAME || 'Knitto Agent Automation',
  VITE_BASE_API_URL: window?.__ENV__?.VITE_BASE_API_URL || 'http://localhost:3080',
  VITE_API_DATA_BASE_URL:
    window?.__ENV__?.VITE_API_DATA_BASE_URL || 'http://localhost:8009',
  VITE_ENVIRONTMENT: window?.__ENV__?.VITE_ENVIRONTMENT || 'DEVELOPMENT',
  VITE_DOCUMENTATION_URL: window?.__ENV__?.VITE_DOCUMENTATION_URL || '',
  VITE_USE_MOCK_API: window?.__ENV__?.VITE_USE_MOCK_API || 'false',
  VITE_WS_HOST: window?.__ENV__?.VITE_WS_HOST || 'localhost',
  VITE_WS_PORT: window?.__ENV__?.VITE_WS_PORT || '3080',
  VITE_DEFAULT_CHANNEL:
    window?.__ENV__?.VITE_DEFAULT_CHANNEL || 'automation-default',
  VITE_DEV_PORT: window?.__ENV__?.VITE_DEV_PORT || '3000',
  VITE_FEATURE_QA_GEN: window?.__ENV__?.VITE_FEATURE_QA_GEN || 'false',
};

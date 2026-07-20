#!/bin/sh

cat <<EOF >/usr/share/nginx/html/generated-env.js
window.__ENV__ = {
  VITE_APP_NAME:"${VITE_APP_NAME}",
  VITE_BASE_API_URL:"${VITE_BASE_API_URL}",
  VITE_ENVIRONTMENT:"${VITE_ENVIRONTMENT}",
  VITE_DOCUMENTATION_URL:"${VITE_DOCUMENTATION_URL}",
};
EOF

exec "$@"

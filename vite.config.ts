import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Automatically determine the correct base URL for GitHub Pages or local environments.
 * - When deployed on GitHub Actions: GITHUB_REPOSITORY is "owner/repo-name" -> base is "/repo-name/"
 * - If BASE_PATH is explicitly passed (e.g. from configure-pages): uses BASE_PATH
 * - For user/org root pages ("owner.github.io"): base is "/"
 * - For local development / preview: base is "./" or "/"
 */
function getBasePath(): string {
  // 1. Explicit environment variable
  const envBase = process.env.BASE_PATH;
  if (envBase && envBase.trim() !== '') {
    const trimmed = envBase.trim();
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  // 2. Standard GitHub Actions CI environment variable
  const ghRepo = process.env.GITHUB_REPOSITORY;
  if (ghRepo) {
    const parts = ghRepo.split('/');
    const owner = parts[0];
    const repo = parts[1];
    if (repo && owner && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
      return '/';
    }
    if (repo) {
      return `/${repo}/`;
    }
  }

  // 3. Fallback relative for local builds
  return './';
}

export default defineConfig({
  base: getBasePath(),
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});

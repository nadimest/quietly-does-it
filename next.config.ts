import type { NextConfig } from 'next';

const repositoryName = 'quietly-does-it';
const publishingToGitHub = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  assetPrefix: publishingToGitHub
    ? `https://nadimest.github.io/${repositoryName}`
    : '',
};

export default nextConfig;

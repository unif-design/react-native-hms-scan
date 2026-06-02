import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: '快速开始',
      collapsed: false,
      items: ['getting-started/installation', 'getting-started/quick-start'],
    },
    {
      type: 'category',
      label: '指南',
      collapsed: false,
      items: [
        'guides/scanner',
        'guides/headless',
        'guides/decode-image',
        'guides/permissions',
      ],
    },
    'platform-differences',
    {
      type: 'category',
      label: 'API 参考',
      collapsed: false,
      items: [
        'api/scanner',
        'api/hms-scan-view',
        'api/functions',
        'api/types',
      ],
    },
    'testing',
    'troubleshooting',
  ],
};

export default sidebars;

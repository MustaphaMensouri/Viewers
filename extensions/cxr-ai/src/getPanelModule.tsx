import React from 'react';
import CxrAiPanel from './components/CxrAiPanel';

function getPanelModule({ commandsManager, extensionManager, servicesManager }) {
  return [
    {
      name: 'cxr-ai',
      iconName: 'tab-cxr-ai',
      iconLabel: 'CXR AI',
      label: 'CXR AI',
      component: props => (
        <CxrAiPanel
          {...props}
          commandsManager={commandsManager}
          extensionManager={extensionManager}
          servicesManager={servicesManager}
        />
      ),
    },
  ];
}

export default getPanelModule;

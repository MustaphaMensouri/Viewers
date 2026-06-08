import getPanelModule from './getPanelModule';
import id from './id';

import { addIcon } from '@ohif/extension-default/src/utils';
import AiBrainIcon from './icons/AiBrainIcon';

export default {
  id,
  getPanelModule,
   preRegistration() {
    addIcon('tab-cxr-ai', AiBrainIcon);
  },
};

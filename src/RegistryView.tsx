import React from 'react';
import { NonIdealState } from '@blueprintjs/core';
import { RegistryViewProps } from './types/views';


export const RegistryView: React.FC<RegistryViewProps> = function ({ itemClassConfiguration }) {
  return <NonIdealState
    icon="time"
    title="Check back in a bit!"
    description="Registry view is coming soon" />;
};

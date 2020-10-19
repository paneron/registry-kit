import React from 'react';
import { ItemClassConfiguration, RelatedItemClassConfiguration } from "../types";


export const _getRelatedClass = (classes: Record<string, ItemClassConfiguration<any>>) => {
  return (clsID: string): RelatedItemClassConfiguration => {
    const cfg = classes[clsID] as ItemClassConfiguration<any> | undefined;
    if (cfg) {
      return {
        title: cfg.meta.title,
        itemView: cfg.views.listItemView,
      };
    } else {
      return {
        title: clsID,
        itemView: () => <span>item view is not provided</span>
      }
    }
  };
};

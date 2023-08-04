/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx } from '@emotion/react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { ExportFormatConfiguration } from '../../../types';
import { BrowserCtx } from '../../BrowserCtx';


export const ExportSidebarBlock: React.FC<Record<never, never>> = function () {
  const { writeFileToFilesystem, getObjectData, getBlob } = useContext(DatasetContext);
  const { selectedRegisterItem, registerMetadata } = useContext(BrowserCtx);

  const proposedNamePrefix = selectedRegisterItem?.item.id && registerMetadata?.name
    ? `${registerMetadata.name ?? 'unnamed-register'} item-${selectedRegisterItem.item.id}`
    : '';

  async function handleExport(bufferData: Uint8Array, filenameExtension: string) {
    if (!writeFileToFilesystem) {
      throw new Error("Unable to export: filesystem write function unavailable");
    }

    const separator = proposedNamePrefix && !filenameExtension.startsWith('.')
      ? ' '
      : '';

    const defaultPath = `${proposedNamePrefix}${separator}${filenameExtension}`;

    await writeFileToFilesystem({
      dialogOpts: {
        prompt: "Choose location to export to",
        defaultPath,
        filters: [{ name: 'All files', extensions: ['*'] }],
      },
      bufferData,
    });
  }

  async function getExportedData(formatConfig?: ExportFormatConfiguration<any>): Promise<Uint8Array> {
    if (!selectedRegisterItem) {
      throw new Error("Unable to export item: current item data not available");
    }
    if (!getBlob) {
      throw new Error("Unable to export item: no blob helper");
    }
    if (formatConfig) {
      return await formatConfig.exportItem(selectedRegisterItem.item, { getObjectData, getBlob });
    } else {
      return await getBlob(JSON.stringify(selectedRegisterItem.item));
    }
  }

  if (!selectedRegisterItem) {
    return <></>;
  } else {
    return (
     <ButtonGroup vertical fill>
       {(selectedRegisterItem?.itemClass?.exportFormats ?? []).map((exportFormat, idx) =>
         <Button
             fill
             key={idx}
             alignText="left"
             onClick={async () => await handleExport(
              await getExportedData(exportFormat),
              exportFormat.filenameExtension,
            )}>
           {exportFormat.label}
         </Button>
       )}
       <Button
           fill
           alignText="left"
           onClick={async () => await handleExport(
            await getExportedData(),
            '.json',
          )}>
         JSON
       </Button>
     </ButtonGroup>
    );
  }
}

export default ExportSidebarBlock;

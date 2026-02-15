/**
 * Page Tools - Page operations
 */

import { PenpotClient } from '../penpot-client.js';
import { v4 as uuidv4 } from 'uuid';

function getPagesIndex(data: any): Record<string, any> {
  return data?.pagesIndex || data?.['pages-index'] || {};
}

function getComponentsIndex(data: any): Record<string, any> {
  return data?.components || {};
}

function getComponentMainInstancePage(component: any): string | undefined {
  return component?.mainInstancePage || component?.['main-instance-page'];
}

function getPageOrder(data: any, pagesIndex: Record<string, any>): string[] {
  const pageOrder = Array.isArray(data?.pages)
    ? data.pages.filter((id: unknown) => typeof id === 'string')
    : [];

  if (pageOrder.length > 0) {
    return pageOrder;
  }

  return Object.keys(pagesIndex);
}

function getPageName(page: any, pageId: string): string {
  const name = page?.name;
  if (typeof name === 'string' && name.trim().length > 0) {
    return name;
  }
  return `Page ${pageId}`;
}

function parseRequiredName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('name must be a non-empty string');
  }
  return trimmed;
}

function buildDeterministicDuplicatePageName(
  sourceName: string,
  existingNames: Set<string>
): string {
  const baseName = `${sourceName} (Copy)`;
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingNames.has(`${sourceName} (Copy ${suffix})`)) {
    suffix += 1;
  }
  return `${sourceName} (Copy ${suffix})`;
}

function remapValueIds(value: any, idMap: Record<string, string>): any {
  if (typeof value === 'string') {
    return idMap[value] || value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => remapValueIds(item, idMap));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce(
      (acc, [key, nestedValue]) => {
        const remappedKey = idMap[key] || key;
        acc[remappedKey] = remapValueIds(nestedValue, idMap);
        return acc;
      },
      {} as Record<string, any>
    );
  }

  return value;
}

function createDuplicatedPagePayload(params: {
  sourcePage: any;
  sourcePageId: string;
  newPageId: string;
}): any {
  const sourceObjects = params.sourcePage?.objects || {};
  const idMap: Record<string, string> = {
    [params.sourcePageId]: params.newPageId,
  };

  for (const objectId of Object.keys(sourceObjects)) {
    idMap[objectId] = uuidv4();
  }

  const remappedPage = remapValueIds(params.sourcePage, idMap);
  remappedPage.id = params.newPageId;
  return remappedPage;
}

export function createPageTools(penpotClient: PenpotClient) {
  return {
    list_pages: {
      description: 'List all pages in a file',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'File ID',
          },
        },
        required: ['fileId'],
      },
      handler: async (args: { fileId: string }) => {
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = getPagesIndex(data);
        const pageOrder = getPageOrder(data, pagesIndex);
        const pageIndex = new Map(pageOrder.map((id, index) => [id, index]));

        const pageList = Object.entries(pagesIndex).map(([id, page]: [string, any]) => ({
          id,
          name: page.name,
          index: pageIndex.get(id) ?? null,
        }));

        pageList.sort((a, b) => {
          if (a.index === null && b.index === null) {
            return a.name.localeCompare(b.name);
          }
          if (a.index === null) {
            return 1;
          }
          if (b.index === null) {
            return -1;
          }
          return a.index - b.index;
        });

        return {
          content: [
            {
              type: 'text',
              text: `Found ${pageList.length} pages`,
            },
            {
              type: 'text',
              text: JSON.stringify(pageList, null, 2),
            },
          ],
        };
      },
    },

    add_page: {
      description: 'Add a new page to a file',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'File ID',
          },
          name: {
            type: 'string',
            description: 'Page name',
            default: 'New Page',
          },
        },
        required: ['fileId'],
      },
      handler: async (args: { fileId: string; name?: string }) => {
        const pageId = uuidv4();
        const pageName = parseRequiredName(args.name || 'New Page');

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'add-page',
            id: pageId,
            name: pageName,
          },
        ] as any);

        return {
          content: [
            {
              type: 'text',
              text: `Added page: ${pageName} (ID: ${pageId})`,
            },
          ],
        };
      },
    },

    rename_page: {
      description: 'Rename a page',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'File ID',
          },
          pageId: {
            type: 'string',
            description: 'Page ID',
          },
          name: {
            type: 'string',
            description: 'New page name',
          },
        },
        required: ['fileId', 'pageId', 'name'],
      },
      handler: async (args: { fileId: string; pageId: string; name: string }) => {
        const nextName = parseRequiredName(args.name);
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = getPagesIndex(data);
        const page = pagesIndex[args.pageId];

        if (!page) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        const currentName = getPageName(page, args.pageId);
        if (currentName === nextName) {
          return {
            content: [
              {
                type: 'text',
                text: `Page already has name "${nextName}" (ID: ${args.pageId})`,
              },
            ],
          };
        }

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'mod-page',
            id: args.pageId,
            name: nextName,
          },
        ] as any);

        return {
          content: [
            {
              type: 'text',
              text: `Renamed page: "${currentName}" -> "${nextName}" (ID: ${args.pageId})`,
            },
          ],
        };
      },
    },

    delete_page: {
      description: 'Delete a page from a file',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'File ID',
          },
          pageId: {
            type: 'string',
            description: 'Page ID',
          },
        },
        required: ['fileId', 'pageId'],
      },
      handler: async (args: { fileId: string; pageId: string }) => {
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = getPagesIndex(data);
        const page = pagesIndex[args.pageId];

        if (!page) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        const pageOrder = getPageOrder(data, pagesIndex);
        if (pageOrder.length <= 1) {
          throw new Error(
            `Cannot delete page ${args.pageId}: file must retain at least one page (protected page).`
          );
        }

        const components = getComponentsIndex(data);
        const blockingComponentIds = Object.entries(components)
          .filter(([_componentId, component]: [string, any]) => {
            return getComponentMainInstancePage(component) === args.pageId;
          })
          .map(([componentId]) => componentId);

        if (blockingComponentIds.length > 0) {
          throw new Error(
            `Cannot delete page ${args.pageId}: protected page with ${blockingComponentIds.length} component main instance(s). Component IDs: ${blockingComponentIds.join(', ')}`
          );
        }

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'del-page',
            id: args.pageId,
          },
        ] as any);

        return {
          content: [
            {
              type: 'text',
              text: `Deleted page: ${getPageName(page, args.pageId)} (ID: ${args.pageId})`,
            },
          ],
        };
      },
    },

    duplicate_page: {
      description: 'Duplicate a page with deterministic naming behavior',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'File ID',
          },
          pageId: {
            type: 'string',
            description: 'Source page ID',
          },
          name: {
            type: 'string',
            description:
              'Optional explicit name for duplicated page. Defaults to deterministic copy naming.',
          },
        },
        required: ['fileId', 'pageId'],
      },
      handler: async (args: { fileId: string; pageId: string; name?: string }) => {
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = getPagesIndex(data);
        const sourcePage = pagesIndex[args.pageId];

        if (!sourcePage) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        const sourceName = getPageName(sourcePage, args.pageId);
        const existingNames = new Set(
          Object.entries(pagesIndex).map(([pageId, page]: [string, any]) =>
            getPageName(page, pageId)
          )
        );

        const duplicatedPageName = args.name
          ? parseRequiredName(args.name)
          : buildDeterministicDuplicatePageName(sourceName, existingNames);

        const duplicatedPageId = uuidv4();
        const duplicatedPagePayload = createDuplicatedPagePayload({
          sourcePage,
          sourcePageId: args.pageId,
          newPageId: duplicatedPageId,
        });
        duplicatedPagePayload.name = duplicatedPageName;

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'add-page',
            id: duplicatedPageId,
            name: duplicatedPageName,
            page: duplicatedPagePayload,
          },
        ] as any);

        return {
          content: [
            {
              type: 'text',
              text: `Duplicated page: ${sourceName} (ID: ${args.pageId}) -> ${duplicatedPageName} (ID: ${duplicatedPageId})`,
            },
          ],
        };
      },
    },
  };
}

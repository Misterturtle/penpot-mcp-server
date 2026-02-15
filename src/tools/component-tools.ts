/**
 * Component Tools - Component operations
 */

import { PenpotClient } from '../penpot-client.js';
import { v4 as uuidv4 } from 'uuid';

function getPagesIndex(data: any): Record<string, any> {
  return data?.pagesIndex || data?.['pages-index'] || {};
}

function getComponentsIndex(data: any): Record<string, any> {
  return data?.components || {};
}

function getShapeParentId(shape: any): string | undefined {
  return shape?.parentId || shape?.['parent-id'];
}

function getShapeFrameId(shape: any): string | undefined {
  return shape?.frameId || shape?.['frame-id'];
}

function getShapeChildrenIds(objects: Record<string, any>, shapeId: string): string[] {
  const shape = objects[shapeId];
  if (!shape) {
    return [];
  }

  const fromShapes = Array.isArray(shape.shapes)
    ? shape.shapes.filter((id: unknown) => typeof id === 'string')
    : [];

  const fromParentRefs = Object.entries(objects)
    .filter(([_id, obj]: [string, any]) => getShapeParentId(obj) === shapeId)
    .map(([id]) => id);

  return [...new Set([...fromShapes, ...fromParentRefs])];
}

function normalizeRootShapeIds(objects: Record<string, any>, shapeIds: string[]): string[] {
  const selected = new Set(shapeIds);
  return shapeIds.filter((shapeId) => {
    let parentId = getShapeParentId(objects[shapeId]);
    const visitedParentIds = new Set<string>();

    while (parentId && !visitedParentIds.has(parentId)) {
      visitedParentIds.add(parentId);
      if (selected.has(parentId)) {
        return false;
      }
      const parentShape = objects[parentId];
      if (!parentShape) {
        break;
      }
      const nextParentId = getShapeParentId(parentShape);
      if (!nextParentId || nextParentId === parentId) {
        break;
      }
      parentId = nextParentId;
    }

    return true;
  });
}

function collectSubtreeShapeIds(
  objects: Record<string, any>,
  rootShapeIds: string[]
): { orderedIds: string[]; idSet: Set<string> } {
  const orderedIds: string[] = [];
  const idSet = new Set<string>();

  const visit = (shapeId: string) => {
    if (idSet.has(shapeId)) {
      return;
    }
    if (!objects[shapeId]) {
      return;
    }

    idSet.add(shapeId);
    orderedIds.push(shapeId);

    const childIds = getShapeChildrenIds(objects, shapeId);
    for (const childId of childIds) {
      visit(childId);
    }
  };

  for (const rootShapeId of rootShapeIds) {
    visit(rootShapeId);
  }

  return { orderedIds, idSet };
}

function countDescendantsByParentRef(objects: Record<string, any>, rootId: string): number {
  let count = 0;
  const queue = [rootId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const [id, obj] of Object.entries(objects)) {
      if (getShapeParentId(obj) === parentId) {
        count += 1;
        queue.push(id);
      }
    }
  }

  return count;
}

function classifyComponentRootIntegrity(shape: any, descendantsByParentRef: number) {
  const isContainerRoot = shape?.type === 'group' || shape?.type === 'frame';
  const rootShapesLength = Array.isArray(shape?.shapes) ? shape.shapes.length : 0;
  const isShellContainer =
    isContainerRoot && rootShapesLength === 0 && descendantsByParentRef === 0;
  const integrityStatus = isShellContainer
    ? 'shell_container'
    : isContainerRoot
      ? 'container_with_children'
      : 'primitive_root';

  return {
    isContainerRoot,
    rootShapesLength,
    descendantsByParentRef,
    isShellContainer,
    integrityStatus,
  };
}

async function resolveComponentRootContext(args: {
  penpotClient: PenpotClient;
  fileId: string;
  componentId: string;
  pageId?: string;
}) {
  const file = await args.penpotClient.getFile(args.fileId);
  const data = file.data as any;
  const components = getComponentsIndex(data);
  const component = components[args.componentId];

  if (!component) {
    throw new Error(`Component not found: ${args.componentId}`);
  }

  const mainInstanceId = component.mainInstanceId || component['main-instance-id'];
  const componentMainPageId = component.mainInstancePage || component['main-instance-page'];
  const resolvedPageId = args.pageId || componentMainPageId;

  if (!mainInstanceId) {
    throw new Error(`Component ${args.componentId} has no main instance id`);
  }
  if (!resolvedPageId) {
    throw new Error(`Component ${args.componentId} has no main instance page`);
  }

  const pagesIndex = getPagesIndex(data);
  const page = pagesIndex[resolvedPageId];
  if (!page) {
    throw new Error(`Page not found for component root: ${resolvedPageId}`);
  }

  const objects = page.objects || {};
  const rootShape = objects[mainInstanceId];
  if (!rootShape) {
    throw new Error(
      `Main instance shape not found in page objects: ${mainInstanceId} (page ${resolvedPageId})`
    );
  }

  const descendantsByParentRef = countDescendantsByParentRef(objects, mainInstanceId);
  const integrity = classifyComponentRootIntegrity(rootShape, descendantsByParentRef);

  return {
    file,
    data,
    component,
    componentMainPageId,
    resolvedPageId,
    mainInstanceId,
    rootShape,
    objects,
    integrity,
  };
}

export function createComponentTools(penpotClient: PenpotClient) {
  return {
    inspect_component_structure: {
      description:
        'Inspect a component root structure to detect shell containers (container roots with no nested children)',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID where the component is defined' },
          componentId: { type: 'string', description: 'Component ID to inspect' },
          pageId: {
            type: 'string',
            description:
              'Optional page ID override for main instance lookup (defaults to component main instance page)',
          },
        },
        required: ['fileId', 'componentId'],
      },
      handler: async (args: { fileId: string; componentId: string; pageId?: string }) => {
        const ctx = await resolveComponentRootContext({
          penpotClient,
          fileId: args.fileId,
          componentId: args.componentId,
          pageId: args.pageId,
        });

        const inspection = {
          fileId: args.fileId,
          componentId: args.componentId,
          componentName: ctx.component.name,
          componentPath: ctx.component.path,
          componentMainPageId: ctx.componentMainPageId,
          resolvedPageId: ctx.resolvedPageId,
          mainInstanceId: ctx.mainInstanceId,
          rootShape: {
            id: ctx.rootShape.id,
            name: ctx.rootShape.name,
            type: ctx.rootShape.type,
            parentId: getShapeParentId(ctx.rootShape) || null,
            frameId: getShapeFrameId(ctx.rootShape) || null,
            shapes: Array.isArray(ctx.rootShape.shapes) ? ctx.rootShape.shapes : [],
          },
          integrity: ctx.integrity,
        };

        return {
          content: [
            {
              type: 'text',
              text: `Component ${args.componentId} integrity: ${ctx.integrity.integrityStatus}`,
            },
            {
              type: 'text',
              text: JSON.stringify(inspection, null, 2),
            },
          ],
        };
      },
    },

    repair_component_structure: {
      description:
        'Repair a shell component by explicitly attaching child shape roots under the component main instance root',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID where the component is defined' },
          pageId: {
            type: 'string',
            description: 'Page ID containing the component main instance root',
          },
          componentId: { type: 'string', description: 'Component ID to repair' },
          childShapeIds: {
            type: 'array',
            description: 'Explicit child shape IDs to attach under the component root',
            items: { type: 'string' },
          },
          allowOverwrite: {
            type: 'boolean',
            description:
              'Allow repair when root already has descendants (default false for safety)',
            default: false,
          },
        },
        required: ['fileId', 'pageId', 'componentId', 'childShapeIds'],
      },
      handler: async (args: {
        fileId: string;
        pageId: string;
        componentId: string;
        childShapeIds: string[];
        allowOverwrite?: boolean;
      }) => {
        const uniqueChildShapeIds = [...new Set(args.childShapeIds || [])];
        if (uniqueChildShapeIds.length === 0) {
          throw new Error('childShapeIds must contain at least one shape ID');
        }

        const ctx = await resolveComponentRootContext({
          penpotClient,
          fileId: args.fileId,
          componentId: args.componentId,
          pageId: args.pageId,
        });

        if (ctx.resolvedPageId !== args.pageId) {
          throw new Error(
            `Component main instance is on page ${ctx.resolvedPageId}, but pageId ${args.pageId} was provided`
          );
        }
        if (!ctx.integrity.isContainerRoot) {
          throw new Error(
            `Component root type ${ctx.rootShape.type} is not a container. Repair only applies to group/frame roots.`
          );
        }
        if (ctx.integrity.descendantsByParentRef > 0 && !args.allowOverwrite) {
          throw new Error(
            'Component root already has descendants. Refusing to repair without allowOverwrite=true.'
          );
        }

        const missingShapeIds = uniqueChildShapeIds.filter((shapeId) => !ctx.objects[shapeId]);
        if (missingShapeIds.length > 0) {
          throw new Error(`Child shape(s) not found on page: ${missingShapeIds.join(', ')}`);
        }
        if (uniqueChildShapeIds.includes(ctx.mainInstanceId)) {
          throw new Error('childShapeIds cannot include the component root shape id');
        }

        const rootChildIds = normalizeRootShapeIds(ctx.objects, uniqueChildShapeIds);
        if (rootChildIds.length === 0) {
          throw new Error('No root child shapes resolved from childShapeIds');
        }

        const currentRootSubtree = collectSubtreeShapeIds(ctx.objects, [ctx.mainInstanceId]);
        currentRootSubtree.idSet.delete(ctx.mainInstanceId);

        const childMoveSubtree = collectSubtreeShapeIds(ctx.objects, rootChildIds);
        if (childMoveSubtree.idSet.has(ctx.mainInstanceId)) {
          throw new Error('childShapeIds cannot include ancestors of the component root');
        }

        const rootParentId = getShapeParentId(ctx.rootShape);
        const rootFrameId = getShapeFrameId(ctx.rootShape);
        if (!rootParentId || !rootFrameId) {
          throw new Error(
            'Component root is missing parentId/frameId and cannot be safely repaired'
          );
        }

        const childTargetFrameId =
          ctx.rootShape.type === 'frame' ? ctx.mainInstanceId : rootFrameId;

        const addChanges: any[] = [];
        const addedIds = new Set<string>();
        const addShape = (shapeId: string, nextParentId: string, nextFrameId: string) => {
          if (addedIds.has(shapeId)) {
            return;
          }
          const shape = ctx.objects[shapeId];
          if (!shape) {
            return;
          }

          const childIds = getShapeChildrenIds(ctx.objects, shapeId).filter((childId) =>
            childMoveSubtree.idSet.has(childId)
          );

          const clonedShape = JSON.parse(JSON.stringify(shape));
          delete clonedShape['parent-id'];
          delete clonedShape['frame-id'];
          clonedShape.parentId = nextParentId;
          clonedShape.frameId = nextFrameId;

          if (
            Array.isArray(clonedShape.shapes) ||
            clonedShape.type === 'group' ||
            clonedShape.type === 'frame'
          ) {
            clonedShape.shapes = childIds;
          }

          addChanges.push({
            type: 'add-obj',
            id: shapeId,
            pageId: args.pageId,
            frameId: nextFrameId,
            parentId: nextParentId,
            obj: clonedShape,
          });
          addedIds.add(shapeId);

          for (const childId of childIds) {
            const childFrameId = clonedShape.type === 'frame' ? shapeId : nextFrameId;
            addShape(childId, shapeId, childFrameId);
          }
        };

        for (const rootChildId of rootChildIds) {
          addShape(rootChildId, ctx.mainInstanceId, childTargetFrameId);
        }

        const rootClone = JSON.parse(JSON.stringify(ctx.rootShape));
        delete rootClone['parent-id'];
        delete rootClone['frame-id'];
        rootClone.parentId = rootParentId;
        rootClone.frameId = rootFrameId;
        rootClone.shapes = rootChildIds;

        const rootChildrenOutsideCurrentSubtree = rootChildIds.filter(
          (shapeId) => !currentRootSubtree.idSet.has(shapeId)
        );

        if (rootChildrenOutsideCurrentSubtree.length > 0) {
          await penpotClient.applyChanges(
            args.fileId,
            rootChildrenOutsideCurrentSubtree.map((shapeId) => ({
              type: 'del-obj',
              id: shapeId,
              pageId: args.pageId,
            })) as any
          );
        }

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'del-obj',
            id: ctx.mainInstanceId,
            pageId: args.pageId,
          },
        ] as any);

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'add-obj',
            id: ctx.mainInstanceId,
            pageId: args.pageId,
            frameId: rootFrameId,
            parentId: rootParentId,
            obj: rootClone,
          },
        ] as any);

        if (addChanges.length > 0) {
          await penpotClient.applyChanges(args.fileId, addChanges as any);
        }

        const afterCtx = await resolveComponentRootContext({
          penpotClient,
          fileId: args.fileId,
          componentId: args.componentId,
          pageId: args.pageId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Repaired component ${args.componentId}: attached ${rootChildIds.length} root child shape(s)`,
            },
            {
              type: 'text',
              text: JSON.stringify(
                {
                  componentId: args.componentId,
                  mainInstanceId: ctx.mainInstanceId,
                  rootChildIds,
                  integrityBefore: ctx.integrity,
                  integrityAfter: afterCtx.integrity,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    instantiate_component: {
      description:
        'Create a component instance from a component (including linked library components) and place it on a target page',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'Target file ID' },
          pageId: { type: 'string', description: 'Target page ID' },
          componentId: { type: 'string', description: 'Component ID to instantiate' },
          componentFile: { type: 'string', description: 'File ID where the component is defined' },
          x: { type: 'number', description: 'X position', default: 0 },
          y: { type: 'number', description: 'Y position', default: 0 },
          parentId: {
            type: 'string',
            description: 'Optional parent shape ID where the instance should be inserted',
          },
          index: {
            type: 'number',
            description: 'Optional insertion index in the parent children list',
          },
          sessionId: {
            type: 'string',
            description: 'Optional session ID for server-side operation tracking',
          },
          skipValidate: {
            type: 'boolean',
            description: 'Skip server-side validation checks',
          },
        },
        required: ['fileId', 'pageId', 'componentId', 'componentFile'],
      },
      handler: async (args: {
        fileId: string;
        pageId: string;
        componentId: string;
        componentFile: string;
        x?: number;
        y?: number;
        parentId?: string;
        index?: number;
        sessionId?: string;
        skipValidate?: boolean;
      }) => {
        const sourceCtx = await resolveComponentRootContext({
          penpotClient,
          fileId: args.componentFile,
          componentId: args.componentId,
        });

        if (sourceCtx.integrity.isShellContainer) {
          throw new Error(
            `Component ${args.componentId} is a shell ${sourceCtx.rootShape.type} with no nested children. Repair source structure before instantiating cross-file.`
          );
        }

        const response = await penpotClient.client.post({
          url: '/command/instantiate-component',
          body: {
            fileId: args.fileId,
            pageId: args.pageId,
            componentId: args.componentId,
            componentFile: args.componentFile,
            position: {
              x: args.x ?? 0,
              y: args.y ?? 0,
            },
            ...(args.parentId && { parentId: args.parentId }),
            ...(args.index !== undefined && { index: args.index }),
            ...(args.sessionId && { sessionId: args.sessionId }),
            ...(args.skipValidate !== undefined && { skipValidate: args.skipValidate }),
          } as any,
        });

        if (response.error) {
          throw new Error(`Failed to instantiate component: ${JSON.stringify(response.error)}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Instantiated component ${args.componentId} from file ${args.componentFile}`,
            },
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      },
    },

    create_component: {
      description: 'Create a component from a shape',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeId: { type: 'string', description: 'Shape ID to convert to component' },
          name: { type: 'string', description: 'Component name' },
          allowEmptyContainer: {
            type: 'boolean',
            description: 'Allow creating a component from an empty container root (default false)',
            default: false,
          },
        },
        required: ['fileId', 'pageId', 'shapeId'],
      },
      handler: async (args: {
        fileId: string;
        pageId: string;
        shapeId: string;
        name?: string;
        allowEmptyContainer?: boolean;
      }) => {
        // Get file to get current revision
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = data?.pagesIndex || data?.['pages-index'] || {};
        const page = pagesIndex[args.pageId];

        if (!page) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        // Check if shape exists
        const objects = page.objects || {};
        const shape = objects[args.shapeId];
        if (!shape) {
          throw new Error(`Shape not found: ${args.shapeId}`);
        }

        const isContainerRoot = shape.type === 'group' || shape.type === 'frame';
        if (isContainerRoot && args.allowEmptyContainer !== true) {
          const descendantsByParentRef = countDescendantsByParentRef(objects, args.shapeId);
          const rootShapesLength = Array.isArray(shape.shapes) ? shape.shapes.length : 0;
          if (descendantsByParentRef === 0 && rootShapesLength === 0) {
            throw new Error(
              `Refusing to create component from empty ${shape.type} root ${args.shapeId}. Add/move children first, or set allowEmptyContainer=true.`
            );
          }
        }

        // Generate component ID
        const componentId = uuidv4();
        const componentName = args.name || shape.name || 'Component';

        // Create add-component change
        const changes = [
          {
            type: 'add-component',
            id: componentId,
            name: componentName,
            path: componentName, // Use name as path by default
            mainInstanceId: args.shapeId,
            mainInstancePage: args.pageId,
          },
        ];

        // Apply changes
        await penpotClient.applyChanges(args.fileId, changes as any);

        return {
          content: [
            {
              type: 'text',
              text: `Created component: ${componentName} (ID: ${componentId})`,
            },
          ],
        };
      },
    },

    list_components: {
      description: 'List all components in a file',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
        },
        required: ['fileId'],
      },
      handler: async (args: { fileId: string }) => {
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;

        // Components are stored in the file data
        const components = data?.components || {};
        const componentList = Object.entries(components).map(([id, comp]: [string, any]) => ({
          id,
          name: comp.name,
          path: comp.path,
        }));

        return {
          content: [
            {
              type: 'text',
              text: `Found ${componentList.length} components`,
            },
            {
              type: 'text',
              text: JSON.stringify(componentList, null, 2),
            },
          ],
        };
      },
    },
  };
}

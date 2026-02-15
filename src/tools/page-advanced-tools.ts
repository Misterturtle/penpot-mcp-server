/**
 * PageAdvanced Tools - Advanced page operations
 */

import { PenpotClient } from '../penpot-client.js';
import { v4 as uuidv4 } from 'uuid';

async function getPageContext(penpotClient: PenpotClient, fileId: string, pageId: string) {
  const file = await penpotClient.getFile(fileId);
  const data = file.data as any;
  const pagesIndex = data?.pagesIndex || data?.['pages-index'] || {};
  const page = pagesIndex[pageId];

  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }

  return {
    page,
    objects: page.objects || {},
  };
}

function getRootFrameIdFromPage(page: any, fallbackPageId: string): string {
  const objects = page?.objects || {};
  for (const [id, obj] of Object.entries(objects) as any) {
    if (obj.type === 'frame' && !obj.parentId && !obj['parent-id']) {
      return id;
    }
  }
  return fallbackPageId;
}

function getShapeBounds(shape: any) {
  const selrect = shape.selrect;
  if (selrect) {
    const x1 = selrect.x1 ?? selrect.x ?? 0;
    const y1 = selrect.y1 ?? selrect.y ?? 0;
    const x2 = selrect.x2 ?? x1 + (selrect.width ?? 0);
    const y2 = selrect.y2 ?? y1 + (selrect.height ?? 0);
    return { x1, y1, x2, y2 };
  }

  const x1 = shape.x ?? 0;
  const y1 = shape.y ?? 0;
  const x2 = x1 + (shape.width ?? 0);
  const y2 = y1 + (shape.height ?? 0);
  return { x1, y1, x2, y2 };
}

function createGeometryFromBounds(x: number, y: number, width: number, height: number) {
  return {
    selrect: {
      x,
      y,
      width,
      height,
      x1: x,
      y1: y,
      x2: x + width,
      y2: y + height,
    },
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    transformInverse: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  };
}

function cloneShapeContent(content: any) {
  return content ? JSON.parse(JSON.stringify(content)) : null;
}

function getTextParagraphs(content: any): any[] | null {
  const paragraphs = content?.children?.[0]?.children;
  return Array.isArray(paragraphs) ? paragraphs : null;
}

function setTextContentOnParagraphs(paragraphs: any[], text: string) {
  if (paragraphs.length === 0) {
    throw new Error('Text shape has no paragraph structure to update');
  }

  const lines = `${text}`.split(/\r?\n/);

  let templateNode: any = null;
  for (const paragraph of paragraphs) {
    if (Array.isArray(paragraph.children) && paragraph.children.length > 0) {
      templateNode = paragraph.children[0];
      break;
    }
  }

  if (!templateNode) {
    throw new Error('Text shape has no text nodes to update');
  }

  const createTextNode = () => {
    const node = JSON.parse(JSON.stringify(templateNode));
    node.text = '';
    return node;
  };

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    const paragraph = paragraphs[paragraphIndex];
    if (!Array.isArray(paragraph.children) || paragraph.children.length === 0) {
      paragraph.children = [createTextNode()];
    }

    const paragraphText = paragraphIndex < lines.length ? lines[paragraphIndex] : '';
    paragraph.children[0].text = paragraphText;

    for (let nodeIndex = 1; nodeIndex < paragraph.children.length; nodeIndex++) {
      paragraph.children[nodeIndex].text = '';
    }
  }

  if (lines.length > paragraphs.length) {
    const overflow = lines.slice(paragraphs.length).join('\n');
    const lastParagraph = paragraphs[paragraphs.length - 1];
    if (!Array.isArray(lastParagraph.children) || lastParagraph.children.length === 0) {
      lastParagraph.children = [createTextNode()];
    }
    const currentText = lastParagraph.children[0].text || '';
    lastParagraph.children[0].text = currentText ? `${currentText}\n${overflow}` : overflow;
  }
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

function buildReparentChanges(params: {
  objects: Record<string, any>;
  pageId: string;
  shapeIds: string[];
  targetParentId: string;
  targetFrameId: string;
}) {
  const { objects, pageId, shapeIds, targetParentId, targetFrameId } = params;

  const rootShapeIds = normalizeRootShapeIds(objects, shapeIds);
  const { idSet: subtreeIdSet } = collectSubtreeShapeIds(objects, rootShapeIds);

  const addChanges: any[] = [];
  const addedIds = new Set<string>();
  const rootShapeIdSet = new Set(rootShapeIds);

  const addShape = (shapeId: string, nextParentId: string, nextFrameId: string) => {
    if (addedIds.has(shapeId)) {
      return;
    }
    const shape = objects[shapeId];
    if (!shape) {
      return;
    }

    const childIds = getShapeChildrenIds(objects, shapeId).filter((childId) =>
      subtreeIdSet.has(childId)
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
      pageId,
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

  for (const rootShapeId of rootShapeIds) {
    addShape(rootShapeId, targetParentId, targetFrameId);
  }

  const deleteChanges = rootShapeIds.map((shapeId) => ({
    type: 'del-obj',
    id: shapeId,
    pageId,
  }));

  return {
    rootShapeIds,
    subtreeIdSet,
    changes: [...deleteChanges, ...addChanges],
  };
}

interface ShapeTokenBindingArgs {
  fileId: string;
  pageId: string;
  shapeId: string;
  appliedTokens?: Record<string, string>;
  mergeAppliedTokens?: boolean;
  fillIndex?: number;
  fillColorRefId?: string;
  fillColorRefFile?: string;
  clearFillColorRef?: boolean;
  strokeIndex?: number;
  strokeColorRefId?: string;
  strokeColorRefFile?: string;
  clearStrokeColorRef?: boolean;
  paragraphIndex?: number;
  typographyRefId?: string;
  typographyRefFile?: string;
  clearTypographyRef?: boolean;
}

function buildShapeTokenBindingChange(shape: any, args: ShapeTokenBindingArgs) {
  const change: any = {
    type: 'mod-obj',
    id: args.shapeId,
    pageId: args.pageId,
    operations: [],
  };
  const updatedParts: string[] = [];

  if (args.appliedTokens !== undefined) {
    if (
      typeof args.appliedTokens !== 'object' ||
      args.appliedTokens === null ||
      Array.isArray(args.appliedTokens)
    ) {
      throw new Error('appliedTokens must be an object map');
    }

    const existingAppliedTokens = shape.appliedTokens || shape['applied-tokens'] || {};
    const nextAppliedTokens =
      args.mergeAppliedTokens === false
        ? args.appliedTokens
        : {
            ...existingAppliedTokens,
            ...args.appliedTokens,
          };

    change.operations.push({ type: 'set', attr: 'appliedTokens', val: nextAppliedTokens });
    updatedParts.push('appliedTokens');
  }

  const updateFillRef =
    args.fillColorRefId !== undefined ||
    args.fillColorRefFile !== undefined ||
    args.clearFillColorRef === true;
  if (updateFillRef) {
    const fillIndex = args.fillIndex ?? 0;
    if (fillIndex < 0) {
      throw new Error('fillIndex must be 0 or greater');
    }

    const fills = Array.isArray(shape.fills) ? JSON.parse(JSON.stringify(shape.fills)) : [];
    while (fills.length <= fillIndex) {
      fills.push({});
    }

    if (args.clearFillColorRef) {
      delete fills[fillIndex].fillColorRefId;
      delete fills[fillIndex].fillColorRefFile;
    }
    if (args.fillColorRefId !== undefined) {
      fills[fillIndex].fillColorRefId = args.fillColorRefId;
    }
    if (args.fillColorRefFile !== undefined) {
      fills[fillIndex].fillColorRefFile = args.fillColorRefFile;
    }

    change.operations.push({ type: 'set', attr: 'fills', val: fills });
    updatedParts.push('fill refs');
  }

  const updateStrokeRef =
    args.strokeColorRefId !== undefined ||
    args.strokeColorRefFile !== undefined ||
    args.clearStrokeColorRef === true;
  if (updateStrokeRef) {
    const strokeIndex = args.strokeIndex ?? 0;
    if (strokeIndex < 0) {
      throw new Error('strokeIndex must be 0 or greater');
    }

    const strokes = Array.isArray(shape.strokes) ? JSON.parse(JSON.stringify(shape.strokes)) : [];
    while (strokes.length <= strokeIndex) {
      strokes.push({});
    }

    if (args.clearStrokeColorRef) {
      delete strokes[strokeIndex].strokeColorRefId;
      delete strokes[strokeIndex].strokeColorRefFile;
    }
    if (args.strokeColorRefId !== undefined) {
      strokes[strokeIndex].strokeColorRefId = args.strokeColorRefId;
    }
    if (args.strokeColorRefFile !== undefined) {
      strokes[strokeIndex].strokeColorRefFile = args.strokeColorRefFile;
    }

    change.operations.push({ type: 'set', attr: 'strokes', val: strokes });
    updatedParts.push('stroke refs');
  }

  const updateTypographyRef =
    args.typographyRefId !== undefined ||
    args.typographyRefFile !== undefined ||
    args.clearTypographyRef === true;
  if (updateTypographyRef) {
    if (shape.type !== 'text') {
      throw new Error('Typography refs can only be updated for text shapes');
    }

    const content = shape.content ? JSON.parse(JSON.stringify(shape.content)) : null;
    const paragraphs = content?.children?.[0]?.children;
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      throw new Error('Text shape has no paragraph structure to update');
    }

    const paragraphIndexes =
      args.paragraphIndex !== undefined
        ? [args.paragraphIndex]
        : paragraphs.map((_p: any, index: number) => index);

    for (const paragraphIndex of paragraphIndexes) {
      if (paragraphIndex < 0 || paragraphIndex >= paragraphs.length) {
        throw new Error(`paragraphIndex out of range: ${paragraphIndex}`);
      }
      const paragraph = paragraphs[paragraphIndex];
      if (args.clearTypographyRef) {
        delete paragraph.typographyRefId;
        delete paragraph.typographyRefFile;
      }
      if (args.typographyRefId !== undefined) {
        paragraph.typographyRefId = args.typographyRefId;
      }
      if (args.typographyRefFile !== undefined) {
        paragraph.typographyRefFile = args.typographyRefFile;
      }
    }

    change.operations.push({ type: 'set', attr: 'content', val: content });
    updatedParts.push('typography refs');
  }

  if (change.operations.length === 0) {
    throw new Error(
      'No token binding updates provided. Set appliedTokens and/or fill/stroke/typography ref fields.'
    );
  }

  return { change, updatedParts };
}

function applySetOperationsLocally(shape: any, operations: any[]): any {
  const nextShape = JSON.parse(JSON.stringify(shape));

  for (const operation of operations) {
    if (operation?.type === 'set' && typeof operation?.attr === 'string') {
      nextShape[operation.attr] = operation.val;
    }
  }

  return nextShape;
}

export function createPageAdvancedTools(penpotClient: PenpotClient) {
  return {
    get_page_shapes: {
      description: 'Get all shapes on a specific page',
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
        const pagesIndex = data?.pagesIndex || data?.['pages-index'] || {};
        const page = pagesIndex[args.pageId];

        if (!page) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        const objects = page.objects || {};
        const shapes = Object.entries(objects)
          .map(([id, obj]: [string, any]) => ({
            id,
            name: obj.name,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
          }))
          .filter((s: any) => s.type !== 'frame' || s.name !== 'Root');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${shapes.length} shapes on page`,
            },
            {
              type: 'text',
              text: JSON.stringify(shapes, null, 2),
            },
          ],
        };
      },
    },

    query_shapes: {
      description:
        'Query and filter shapes with multiple criteria (like grep for shapes). Useful for bulk operations like changing color themes, alignment, or filtering by area/type. Returns only the requested fields.',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          // Filter criteria
          types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by shape types (e.g., ["text", "rectangle", "circle"])',
          },
          namePattern: { type: 'string', description: 'Filter by name pattern (regex)' },
          minX: { type: 'number', description: 'Minimum X position (area filter)' },
          maxX: { type: 'number', description: 'Maximum X position (area filter)' },
          minY: { type: 'number', description: 'Minimum Y position (area filter)' },
          maxY: { type: 'number', description: 'Maximum Y position (area filter)' },
          fillColor: { type: 'string', description: 'Filter by fill color (HEX, e.g., "#FF0000")' },
          strokeColor: { type: 'string', description: 'Filter by stroke color (HEX)' },
          fontFamily: { type: 'string', description: 'Filter by font family (for text shapes)' },
          textContent: {
            type: 'string',
            description: 'Filter by text content (case-insensitive substring match)',
          },
          // Fields to return
          fields: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Fields to return: "position" (x,y,width,height), "colors" (fill,stroke), "text" (font props), "effects" (shadow,blur), "all". Default: ["position"]',
            default: ['position'],
          },
        },
        required: ['fileId', 'pageId'],
      },
      handler: async (args: {
        fileId: string;
        pageId: string;
        types?: string[];
        namePattern?: string;
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
        fillColor?: string;
        strokeColor?: string;
        fontFamily?: string;
        textContent?: string;
        fields?: string[];
      }) => {
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = data?.pagesIndex || data?.['pages-index'] || {};
        const page = pagesIndex[args.pageId];

        if (!page) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        const objects = page.objects || {};
        const fields = args.fields || ['position'];
        const includeAll = fields.includes('all');

        // Filter shapes
        const shapes = Object.entries(objects)
          .map(([id, obj]: [string, any]) => ({ id, ...obj }))
          .filter((shape: any) => {
            // Exclude root frame
            if (shape.type === 'frame' && shape.name === 'Root') {
              return false;
            }

            // Filter by type
            if (args.types && args.types.length > 0) {
              if (!args.types.includes(shape.type)) {
                return false;
              }
            }

            // Filter by name pattern
            if (args.namePattern) {
              try {
                const regex = new RegExp(args.namePattern, 'i');
                if (!regex.test(shape.name)) {
                  return false;
                }
              } catch (e) {
                // Invalid regex, skip this filter
              }
            }

            // Filter by area
            if (args.minX !== undefined && shape.x < args.minX) {
              return false;
            }
            if (args.maxX !== undefined && shape.x > args.maxX) {
              return false;
            }
            if (args.minY !== undefined && shape.y < args.minY) {
              return false;
            }
            if (args.maxY !== undefined && shape.y > args.maxY) {
              return false;
            }

            // Filter by fill color
            if (args.fillColor) {
              const fillColor = shape.fills?.[0]?.fillColor?.toLowerCase();
              if (!fillColor || fillColor !== args.fillColor.toLowerCase()) {
                return false;
              }
            }

            // Filter by stroke color
            if (args.strokeColor) {
              const strokeColor = shape.strokes?.[0]?.strokeColor?.toLowerCase();
              if (!strokeColor || strokeColor !== args.strokeColor.toLowerCase()) {
                return false;
              }
            }

            // Filter by font family
            if (args.fontFamily) {
              if (shape.type !== 'text' || !shape.fontFamily) {
                return false;
              }
              if (shape.fontFamily.toLowerCase() !== args.fontFamily.toLowerCase()) {
                return false;
              }
            }

            // Filter by text content
            if (args.textContent) {
              if (shape.type !== 'text' || !shape.content) {
                return false;
              }

              // Extract text content from content structure
              let textContent = '';
              if (shape.content?.children?.[0]?.children) {
                shape.content.children[0].children.forEach((paragraph: any) => {
                  if (paragraph.children) {
                    paragraph.children.forEach((textNode: any) => {
                      if (textNode.text) {
                        textContent += textNode.text;
                      }
                    });
                  }
                });
              }

              // Case-insensitive substring match
              if (!textContent.toLowerCase().includes(args.textContent.toLowerCase())) {
                return false;
              }
            }

            return true;
          });

        // Extract requested fields
        const results = shapes.map((shape: any) => {
          const result: any = {
            id: shape.id,
            name: shape.name,
            type: shape.type,
          };

          // Position fields
          if (includeAll || fields.includes('position')) {
            result.x = shape.x;
            result.y = shape.y;
            result.width = shape.width;
            result.height = shape.height;
            if (shape.rotation !== undefined) {
              result.rotation = shape.rotation;
            }
          }

          // Color fields
          if (includeAll || fields.includes('colors')) {
            if (shape.fills && shape.fills.length > 0) {
              const fill = shape.fills[0];
              result.fillColor = fill.fillColor;
              result.fillOpacity = fill.fillOpacity;
              if (fill.fillColorGradient) {
                result.gradient = fill.fillColorGradient;
              }
            }
            if (shape.strokes && shape.strokes.length > 0) {
              const stroke = shape.strokes[0];
              result.strokeColor = stroke.strokeColor;
              result.strokeWidth = stroke.strokeWidth;
              result.strokeOpacity = stroke.strokeOpacity;
            }
          }

          // Text fields
          if (includeAll || fields.includes('text')) {
            if (shape.type === 'text') {
              result.text = {
                fontSize: shape.fontSize,
                fontFamily: shape.fontFamily,
                fontWeight: shape.fontWeight,
                fontStyle: shape.fontStyle,
                verticalAlign: shape.verticalAlign,
                textDecoration: shape.textDecoration,
                letterSpacing: shape.letterSpacing,
                lineHeight: shape.lineHeight,
              };

              // Extract text content and alignment
              if (shape.content?.children?.[0]?.children) {
                const textContent: string[] = [];
                const textAlignments: string[] = [];
                shape.content.children[0].children.forEach((paragraph: any) => {
                  if (paragraph.textAlign) {
                    textAlignments.push(paragraph.textAlign);
                  }
                  if (paragraph.children) {
                    paragraph.children.forEach((textNode: any) => {
                      if (textNode.text) {
                        textContent.push(textNode.text);
                      }
                    });
                  }
                });
                result.text.content = textContent.join('');
                if (textAlignments.length > 0) {
                  result.text.textAlign = textAlignments[0];
                }
              }
            }
          }

          // Effects fields
          if (includeAll || fields.includes('effects')) {
            if (shape.opacity !== undefined) {
              result.opacity = shape.opacity;
            }
            if (shape.blendMode) {
              result.blendMode = shape.blendMode;
            }

            if (shape.shadow && shape.shadow.length > 0) {
              result.shadows = shape.shadow.map((s: any) => ({
                style: s.style,
                offsetX: s.offsetX,
                offsetY: s.offsetY,
                blur: s.blur,
                spread: s.spread,
                color: s.color?.color,
                opacity: s.color?.opacity,
              }));
            }

            if (shape.blur) {
              result.blur = {
                type: shape.blur.type,
                value: shape.blur.value,
              };
            }
          }

          return result;
        });

        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} shapes matching criteria`,
            },
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      },
    },

    update_shape: {
      description:
        'Update shape properties including position, size, colors, gradients, images, borders, shadows, blur, blend modes, text content/alignment, and visual effects',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeId: { type: 'string', description: 'Shape ID' },
          x: { type: 'number', description: 'X position' },
          y: { type: 'number', description: 'Y position' },
          width: { type: 'number', description: 'Width' },
          height: { type: 'number', description: 'Height' },
          name: { type: 'string', description: 'Shape name' },
          fillColor: { type: 'string', description: 'Fill color (HEX)' },
          fillOpacity: { type: 'number', description: 'Fill opacity (0-1)' },
          gradientType: { type: 'string', description: 'Gradient type: "linear" or "radial"' },
          gradientStartX: { type: 'number', description: 'Gradient start X (0-1 normalized)' },
          gradientStartY: { type: 'number', description: 'Gradient start Y (0-1 normalized)' },
          gradientEndX: { type: 'number', description: 'Gradient end X (0-1 normalized)' },
          gradientEndY: { type: 'number', description: 'Gradient end Y (0-1 normalized)' },
          gradientStops: { type: 'string', description: 'Gradient stops as JSON array' },
          fillImageId: { type: 'string', description: 'Image media ID' },
          fillImageName: { type: 'string', description: 'Image name' },
          fillImageWidth: { type: 'number', description: 'Image width' },
          fillImageHeight: { type: 'number', description: 'Image height' },
          fillImageMtype: { type: 'string', description: 'Image MIME type' },
          fillImageKeepAspectRatio: { type: 'boolean', description: 'Keep image aspect ratio' },
          strokeColor: { type: 'string', description: 'Stroke color (HEX)' },
          strokeWidth: { type: 'number', description: 'Stroke width' },
          strokeOpacity: { type: 'number', description: 'Stroke opacity (0-1)' },
          r1: { type: 'number', description: 'Top-left corner radius' },
          r2: { type: 'number', description: 'Top-right corner radius' },
          r3: { type: 'number', description: 'Bottom-right corner radius' },
          r4: { type: 'number', description: 'Bottom-left corner radius' },
          borderRadius: { type: 'number', description: 'All corners radius (shorthand)' },
          opacity: { type: 'number', description: 'Overall opacity (0-1)' },
          shadowColor: { type: 'string', description: 'Shadow color (HEX)' },
          shadowOffsetX: { type: 'number', description: 'Shadow X offset in pixels' },
          shadowOffsetY: { type: 'number', description: 'Shadow Y offset in pixels' },
          shadowBlur: { type: 'number', description: 'Shadow blur radius in pixels' },
          shadowSpread: { type: 'number', description: 'Shadow spread in pixels' },
          shadowOpacity: { type: 'number', description: 'Shadow opacity (0-1)' },
          shadowStyle: {
            type: 'string',
            description: 'Shadow style: "drop-shadow" or "inner-shadow"',
          },
          blurValue: { type: 'number', description: 'Blur intensity in pixels' },
          blendMode: {
            type: 'string',
            description: 'Blend mode: "normal", "multiply", "screen", "overlay", etc.',
          },
          fontSize: { type: 'number', description: 'Font size for text shapes' },
          text: { type: 'string', description: 'Text content for text shapes' },
          textAlign: {
            type: 'string',
            description: 'Text alignment for text shapes: "left", "center", "right", "justify"',
          },
          verticalAlign: {
            type: 'string',
            description: 'Vertical alignment for text shapes: "top", "center", "bottom"',
          },
          fontFamily: { type: 'string', description: 'Font family for text shapes' },
          fontWeight: {
            type: 'string',
            description: 'Font weight for text shapes: "normal", "bold", "100"-"900"',
          },
          fontStyle: {
            type: 'string',
            description: 'Font style for text shapes: "normal", "italic"',
          },
          textDecoration: {
            type: 'string',
            description: 'Text decoration for text shapes: "none", "underline", "line-through"',
          },
          letterSpacing: {
            type: 'number',
            description: 'Letter spacing in pixels for text shapes',
          },
          lineHeight: { type: 'number', description: 'Line height multiplier for text shapes' },
        },
        required: ['fileId', 'pageId', 'shapeId'],
      },
      handler: async (args: any) => {
        // Get the current shape to check its type
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = data?.pagesIndex || data?.['pages-index'] || {};
        const page = pagesIndex[args.pageId];
        const currentShape = page?.objects?.[args.shapeId];

        if (!currentShape) {
          throw new Error(`Shape not found: ${args.shapeId}`);
        }

        const changes: any = {
          type: 'mod-obj',
          id: args.shapeId,
          pageId: args.pageId,
          operations: [],
        };

        // Basic properties
        if (args.x !== undefined) {
          changes.operations.push({ type: 'set', attr: 'x', val: args.x });
        }
        if (args.y !== undefined) {
          changes.operations.push({ type: 'set', attr: 'y', val: args.y });
        }
        if (args.width !== undefined) {
          changes.operations.push({ type: 'set', attr: 'width', val: args.width });
        }
        if (args.height !== undefined) {
          changes.operations.push({ type: 'set', attr: 'height', val: args.height });
        }
        if (args.name !== undefined) {
          changes.operations.push({ type: 'set', attr: 'name', val: args.name });
        }

        let solidTextFill: any = null;

        // Fill properties - priority: gradient > image > solid color
        if (args.gradientType && args.gradientStops) {
          // Gradient fill
          const stops = JSON.parse(args.gradientStops);
          const fills = [
            {
              fillColorGradient: {
                type: args.gradientType,
                startX: args.gradientStartX !== undefined ? args.gradientStartX : 0,
                startY: args.gradientStartY !== undefined ? args.gradientStartY : 0,
                endX: args.gradientEndX !== undefined ? args.gradientEndX : 1,
                endY: args.gradientEndY !== undefined ? args.gradientEndY : 1,
                width: 1,
                stops,
              },
            },
          ];
          changes.operations.push({ type: 'set', attr: 'fills', val: fills });
        } else if (args.fillImageId) {
          // Image fill
          const fills = [
            {
              fillImage: {
                width: args.fillImageWidth,
                height: args.fillImageHeight,
                mtype: args.fillImageMtype || 'image/png',
                id: args.fillImageId,
                name: args.fillImageName || 'image',
                keepAspectRatio:
                  args.fillImageKeepAspectRatio !== undefined
                    ? args.fillImageKeepAspectRatio
                    : true,
              },
            },
          ];
          changes.operations.push({ type: 'set', attr: 'fills', val: fills });
        } else if (args.fillColor !== undefined || args.fillOpacity !== undefined) {
          // Solid color fill
          const existingFill = currentShape.fills?.[0] || {};
          const fills = [
            {
              fillColor: args.fillColor !== undefined ? args.fillColor : existingFill.fillColor,
              fillOpacity:
                args.fillOpacity !== undefined ? args.fillOpacity : (existingFill.fillOpacity ?? 1),
            },
          ];
          changes.operations.push({ type: 'set', attr: 'fills', val: fills });
          solidTextFill = fills[0];
        }

        // Text properties for text shapes
        const hasTextContentUpdate = args.text !== undefined;
        const hasTextStyleUpdate =
          args.fontSize !== undefined ||
          args.textAlign !== undefined ||
          args.fontFamily !== undefined ||
          args.fontWeight !== undefined ||
          args.fontStyle !== undefined ||
          args.textDecoration !== undefined ||
          args.letterSpacing !== undefined ||
          args.lineHeight !== undefined;

        if (currentShape.type === 'text') {
          // Font size
          if (args.fontSize !== undefined) {
            const fontSizeStr = `${args.fontSize}`;
            changes.operations.push({ type: 'set', attr: 'fontSize', val: fontSizeStr });
          }

          // Vertical alignment
          if (args.verticalAlign !== undefined) {
            changes.operations.push({
              type: 'set',
              attr: 'verticalAlign',
              val: args.verticalAlign,
            });
          }

          // Font family
          if (args.fontFamily !== undefined) {
            changes.operations.push({ type: 'set', attr: 'fontFamily', val: args.fontFamily });
          }

          // Font weight
          if (args.fontWeight !== undefined) {
            changes.operations.push({ type: 'set', attr: 'fontWeight', val: args.fontWeight });
          }

          // Font style
          if (args.fontStyle !== undefined) {
            changes.operations.push({ type: 'set', attr: 'fontStyle', val: args.fontStyle });
          }

          // Update content structure (text content, text styling, and text node fills)
          if (solidTextFill || hasTextStyleUpdate || hasTextContentUpdate) {
            const updatedContent = cloneShapeContent(currentShape.content);
            const paragraphs = getTextParagraphs(updatedContent);
            if (!paragraphs) {
              throw new Error('Text shape has no content structure to update');
            }

            if (hasTextContentUpdate) {
              setTextContentOnParagraphs(paragraphs, args.text);
            }

            for (const paragraph of paragraphs) {
              if (args.textAlign !== undefined) {
                paragraph.textAlign = args.textAlign;
              }

              if (!Array.isArray(paragraph.children)) {
                continue;
              }

              for (const textNode of paragraph.children) {
                if (solidTextFill) {
                  const existingFill = textNode.fills?.[0] || {};
                  textNode.fills = [
                    {
                      ...existingFill,
                      fillColor:
                        solidTextFill.fillColor !== undefined
                          ? solidTextFill.fillColor
                          : existingFill.fillColor,
                      fillOpacity:
                        solidTextFill.fillOpacity !== undefined
                          ? solidTextFill.fillOpacity
                          : existingFill.fillOpacity,
                    },
                  ];
                }

                if (args.fontSize !== undefined) {
                  textNode.fontSize = `${args.fontSize}`;
                }
                if (args.fontFamily !== undefined) {
                  textNode.fontFamily = args.fontFamily;
                }
                if (args.fontWeight !== undefined) {
                  textNode.fontWeight = args.fontWeight;
                }
                if (args.fontStyle !== undefined) {
                  textNode.fontStyle = args.fontStyle;
                }
                if (args.textDecoration !== undefined) {
                  textNode.textDecoration = args.textDecoration;
                }
                if (args.letterSpacing !== undefined) {
                  textNode.letterSpacing = `${args.letterSpacing}`;
                }
                if (args.lineHeight !== undefined) {
                  textNode.lineHeight = args.lineHeight;
                }
              }
            }

            changes.operations.push({ type: 'set', attr: 'content', val: updatedContent });
          }
        } else if (hasTextContentUpdate) {
          throw new Error('text can only be updated for text shapes');
        }

        // Stroke (border) properties
        if (
          args.strokeColor !== undefined ||
          args.strokeWidth !== undefined ||
          args.strokeOpacity !== undefined
        ) {
          const strokes = [
            {
              strokeColor: args.strokeColor,
              strokeWidth: args.strokeWidth !== undefined ? args.strokeWidth : 1,
              strokeOpacity: args.strokeOpacity !== undefined ? args.strokeOpacity : 1,
              strokeStyle: 'solid' as const,
              strokeAlignment: 'center' as const,
            },
          ];
          changes.operations.push({ type: 'set', attr: 'strokes', val: strokes });
        }

        // Border radius
        if (args.borderRadius !== undefined) {
          // Shorthand: set all corners to same value
          changes.operations.push({ type: 'set', attr: 'r1', val: args.borderRadius });
          changes.operations.push({ type: 'set', attr: 'r2', val: args.borderRadius });
          changes.operations.push({ type: 'set', attr: 'r3', val: args.borderRadius });
          changes.operations.push({ type: 'set', attr: 'r4', val: args.borderRadius });
        } else {
          // Individual corners
          if (args.r1 !== undefined) {
            changes.operations.push({ type: 'set', attr: 'r1', val: args.r1 });
          }
          if (args.r2 !== undefined) {
            changes.operations.push({ type: 'set', attr: 'r2', val: args.r2 });
          }
          if (args.r3 !== undefined) {
            changes.operations.push({ type: 'set', attr: 'r3', val: args.r3 });
          }
          if (args.r4 !== undefined) {
            changes.operations.push({ type: 'set', attr: 'r4', val: args.r4 });
          }
        }

        // Overall opacity
        if (args.opacity !== undefined) {
          changes.operations.push({ type: 'set', attr: 'opacity', val: args.opacity });
        }

        // Shadow properties
        if (
          args.shadowOffsetX !== undefined ||
          args.shadowOffsetY !== undefined ||
          args.shadowBlur !== undefined ||
          args.shadowSpread !== undefined ||
          args.shadowColor !== undefined ||
          args.shadowOpacity !== undefined ||
          args.shadowStyle !== undefined
        ) {
          const shadow = [
            {
              id: uuidv4(),
              style: args.shadowStyle || 'drop-shadow',
              offsetX: args.shadowOffsetX !== undefined ? args.shadowOffsetX : 0,
              offsetY: args.shadowOffsetY !== undefined ? args.shadowOffsetY : 4,
              blur: args.shadowBlur !== undefined ? args.shadowBlur : 10,
              spread: args.shadowSpread !== undefined ? args.shadowSpread : 0,
              hidden: false,
              color: {
                color: args.shadowColor || '#000000',
                opacity: args.shadowOpacity !== undefined ? args.shadowOpacity : 0.25,
              },
            },
          ];
          changes.operations.push({ type: 'set', attr: 'shadow', val: shadow });
        }

        // Blur properties
        if (args.blurValue !== undefined) {
          const blur = {
            id: uuidv4(),
            type: 'layer-blur',
            value: args.blurValue,
            hidden: false,
          };
          changes.operations.push({ type: 'set', attr: 'blur', val: blur });
        }

        // Blend mode
        if (args.blendMode !== undefined) {
          changes.operations.push({ type: 'set', attr: 'blendMode', val: args.blendMode });
        }

        await penpotClient.applyChanges(args.fileId, [changes]);

        return {
          content: [
            {
              type: 'text',
              text: `Updated shape: ${args.shapeId}`,
            },
          ],
        };
      },
    },

    get_shape_properties: {
      description:
        'Get detailed properties of a specific shape including colors, text properties, fonts, dimensions, effects, and all other attributes',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeId: { type: 'string', description: 'Shape ID' },
        },
        required: ['fileId', 'pageId', 'shapeId'],
      },
      handler: async (args: { fileId: string; pageId: string; shapeId: string }) => {
        const file = await penpotClient.getFile(args.fileId);
        const data = file.data as any;
        const pagesIndex = data?.pagesIndex || data?.['pages-index'] || {};
        const page = pagesIndex[args.pageId];

        if (!page) {
          throw new Error(`Page not found: ${args.pageId}`);
        }

        const objects = page.objects || {};
        const shape = objects[args.shapeId];

        if (!shape) {
          throw new Error(`Shape not found: ${args.shapeId}`);
        }

        // Extract relevant properties based on shape type
        const properties: any = {
          id: args.shapeId,
          name: shape.name,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        };

        // Position and transform
        if (shape.rotation !== undefined) {
          properties.rotation = shape.rotation;
        }
        if (shape.flipX !== undefined) {
          properties.flipX = shape.flipX;
        }
        if (shape.flipY !== undefined) {
          properties.flipY = shape.flipY;
        }

        // Fill properties
        if (shape.fills && shape.fills.length > 0) {
          const fill = shape.fills[0];
          properties.fillColor = fill.fillColor;
          properties.fillOpacity = fill.fillOpacity;

          // Gradient
          if (fill.fillColorGradient) {
            properties.gradient = {
              type: fill.fillColorGradient.type,
              startX: fill.fillColorGradient.startX,
              startY: fill.fillColorGradient.startY,
              endX: fill.fillColorGradient.endX,
              endY: fill.fillColorGradient.endY,
              width: fill.fillColorGradient.width,
              stops: fill.fillColorGradient.stops,
            };
          }

          // Fill image
          if (fill.fillImage) {
            properties.fillImage = {
              id: fill.fillImage.id,
              name: fill.fillImage.name,
              width: fill.fillImage.width,
              height: fill.fillImage.height,
              mtype: fill.fillImage.mtype,
              keepAspectRatio: fill.fillImage.keepAspectRatio,
            };
          }
        }

        // Stroke properties
        if (shape.strokes && shape.strokes.length > 0) {
          const stroke = shape.strokes[0];
          properties.stroke = {
            color: stroke.strokeColor,
            width: stroke.strokeWidth,
            opacity: stroke.strokeOpacity,
            style: stroke.strokeStyle,
            alignment: stroke.strokeAlignment,
          };
        }

        // Border radius
        if (shape.r1 !== undefined) {
          properties.r1 = shape.r1;
        }
        if (shape.r2 !== undefined) {
          properties.r2 = shape.r2;
        }
        if (shape.r3 !== undefined) {
          properties.r3 = shape.r3;
        }
        if (shape.r4 !== undefined) {
          properties.r4 = shape.r4;
        }

        // Opacity
        if (shape.opacity !== undefined) {
          properties.opacity = shape.opacity;
        }

        // Shadow
        if (shape.shadow && shape.shadow.length > 0) {
          properties.shadows = shape.shadow.map((s: any) => ({
            style: s.style,
            offsetX: s.offsetX,
            offsetY: s.offsetY,
            blur: s.blur,
            spread: s.spread,
            color: s.color?.color,
            opacity: s.color?.opacity,
            hidden: s.hidden,
          }));
        }

        // Blur
        if (shape.blur) {
          properties.blur = {
            type: shape.blur.type,
            value: shape.blur.value,
            hidden: shape.blur.hidden,
          };
        }

        // Blend mode
        if (shape.blendMode !== undefined) {
          properties.blendMode = shape.blendMode;
        }

        // Text-specific properties
        if (shape.type === 'text') {
          properties.text = {
            fontSize: shape.fontSize,
            fontFamily: shape.fontFamily,
            fontWeight: shape.fontWeight,
            fontStyle: shape.fontStyle,
            verticalAlign: shape.verticalAlign,
            textDecoration: shape.textDecoration,
            letterSpacing: shape.letterSpacing,
            lineHeight: shape.lineHeight,
          };

          // Extract text content and alignment from content structure
          if (shape.content) {
            const textContent: string[] = [];
            const textAlignments: string[] = [];

            if (shape.content.children?.[0]?.children) {
              shape.content.children[0].children.forEach((paragraph: any) => {
                if (paragraph.textAlign) {
                  textAlignments.push(paragraph.textAlign);
                }
                if (paragraph.children) {
                  paragraph.children.forEach((textNode: any) => {
                    if (textNode.text) {
                      textContent.push(textNode.text);
                    }
                  });
                }
              });
            }

            properties.text.content = textContent.join('');
            if (textAlignments.length > 0) {
              properties.text.textAlign = textAlignments[0]; // First paragraph alignment
            }
          }
        }

        // Path-specific properties
        if (shape.type === 'path' && shape.content) {
          properties.pathContent = shape.content;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Shape properties for: ${shape.name} (${shape.type})`,
            },
            {
              type: 'text',
              text: JSON.stringify(properties, null, 2),
            },
          ],
        };
      },
    },

    move_shapes: {
      description: 'Move shapes to different parent/frame or reorder',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          parentId: {
            type: 'string',
            description: 'Target parent shape ID (frame/group) where shapes will be moved',
          },
          shapeIds: {
            type: 'array',
            description: 'Shape IDs to move',
            items: { type: 'string' },
          },
          index: {
            type: 'number',
            description: 'Optional insertion index in target parent children list',
          },
          afterShape: {
            type: 'string',
            description: 'Optional shape ID to place moved shapes after',
          },
          allowAlteringCopies: {
            type: 'boolean',
            description: 'Allow altering copies while moving',
          },
          ignoreTouched: {
            type: 'boolean',
            description: 'Ignore touched metadata updates',
          },
        },
        required: ['fileId', 'pageId', 'parentId', 'shapeIds'],
      },
      handler: async (args: {
        fileId: string;
        pageId: string;
        parentId: string;
        shapeIds: string[];
        index?: number;
        afterShape?: string;
        allowAlteringCopies?: boolean;
        ignoreTouched?: boolean;
      }) => {
        const uniqueShapeIds = [...new Set(args.shapeIds || [])];
        if (uniqueShapeIds.length === 0) {
          throw new Error('shapeIds must contain at least one shape ID');
        }

        const { page, objects } = await getPageContext(penpotClient, args.fileId, args.pageId);
        let targetParentId = args.parentId;
        if (targetParentId === args.pageId) {
          targetParentId = getRootFrameIdFromPage(page, args.pageId);
        }

        if (!objects[targetParentId]) {
          throw new Error(`Parent shape not found: ${targetParentId}`);
        }

        const missingShapeIds = uniqueShapeIds.filter((id) => !objects[id]);
        if (missingShapeIds.length > 0) {
          throw new Error(`Shape(s) not found: ${missingShapeIds.join(', ')}`);
        }

        if (uniqueShapeIds.includes(targetParentId)) {
          throw new Error('parentId cannot be one of the shapeIds being moved');
        }

        const targetParent = objects[targetParentId];
        const targetFrameId =
          targetParent?.type === 'frame'
            ? targetParentId
            : getShapeFrameId(targetParent) || getRootFrameIdFromPage(page, args.pageId);

        const plan = buildReparentChanges({
          objects,
          pageId: args.pageId,
          shapeIds: uniqueShapeIds,
          targetParentId,
          targetFrameId,
        });

        if (plan.rootShapeIds.length === 0) {
          throw new Error('No movable root shapes resolved from shapeIds');
        }
        if (plan.subtreeIdSet.has(targetParentId)) {
          throw new Error('parentId cannot be inside the moved shape subtree');
        }

        const deleteRootChanges = plan.changes.slice(0, plan.rootShapeIds.length);
        const addMovedSubtreeChanges = plan.changes.slice(plan.rootShapeIds.length);

        if (deleteRootChanges.length > 0) {
          await penpotClient.applyChanges(args.fileId, deleteRootChanges as any);
        }
        if (addMovedSubtreeChanges.length > 0) {
          await penpotClient.applyChanges(args.fileId, addMovedSubtreeChanges as any);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Moved ${plan.rootShapeIds.length} root shape(s) (${plan.subtreeIdSet.size} shape(s) including descendants) to parent ${targetParentId}`,
            },
            ...(args.index !== undefined || args.afterShape !== undefined
              ? [
                  {
                    type: 'text',
                    text: 'Note: explicit index/afterShape ordering is best-effort in current move implementation.',
                  },
                ]
              : []),
          ],
        };
      },
    },

    group_shapes: {
      description: 'Group multiple shapes under a new group shape',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeIds: {
            type: 'array',
            description: 'Shape IDs to group (at least 2)',
            items: { type: 'string' },
          },
          name: { type: 'string', description: 'Group name' },
          parentId: {
            type: 'string',
            description: 'Optional explicit parent shape ID for the new group',
          },
          index: {
            type: 'number',
            description: 'Optional insertion index for the new group in parent children',
          },
        },
        required: ['fileId', 'pageId', 'shapeIds'],
      },
      handler: async (args: {
        fileId: string;
        pageId: string;
        shapeIds: string[];
        name?: string;
        parentId?: string;
        index?: number;
      }) => {
        const uniqueShapeIds = [...new Set(args.shapeIds || [])];
        if (uniqueShapeIds.length < 2) {
          throw new Error('shapeIds must contain at least 2 shape IDs to create a group');
        }

        const { page, objects } = await getPageContext(penpotClient, args.fileId, args.pageId);
        const missingShapeIds = uniqueShapeIds.filter((id) => !objects[id]);
        if (missingShapeIds.length > 0) {
          throw new Error(`Shape(s) not found: ${missingShapeIds.join(', ')}`);
        }

        const selectedShapes = uniqueShapeIds.map((id) => objects[id]);
        const selectedFrameIds = [
          ...new Set(
            selectedShapes.map((shape: any) => shape.frameId || shape['frame-id']).filter(Boolean)
          ),
        ];

        if (selectedFrameIds.length > 1) {
          throw new Error('All shapes must belong to the same frame to be grouped');
        }

        let targetParentId = args.parentId;
        if (!targetParentId) {
          const parentIds = [
            ...new Set(
              selectedShapes
                .map((shape: any) => shape.parentId || shape['parent-id'])
                .filter(Boolean)
            ),
          ];
          targetParentId =
            parentIds.length === 1
              ? (parentIds[0] as string)
              : getRootFrameIdFromPage(page, args.pageId);
        }

        if (targetParentId === args.pageId) {
          targetParentId = getRootFrameIdFromPage(page, args.pageId);
        }

        if (!objects[targetParentId]) {
          throw new Error(`Parent shape not found: ${targetParentId}`);
        }

        if (uniqueShapeIds.includes(targetParentId)) {
          throw new Error('parentId cannot be one of the shapeIds being grouped');
        }

        const parentShape = objects[targetParentId];
        const targetFrameId =
          selectedFrameIds[0] ||
          parentShape?.frameId ||
          parentShape?.['frame-id'] ||
          (parentShape?.type === 'frame' ? targetParentId : undefined) ||
          getRootFrameIdFromPage(page, args.pageId);

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const shape of selectedShapes) {
          const { x1, y1, x2, y2 } = getShapeBounds(shape);
          minX = Math.min(minX, x1);
          minY = Math.min(minY, y1);
          maxX = Math.max(maxX, x2);
          maxY = Math.max(maxY, y2);
        }

        if (
          !Number.isFinite(minX) ||
          !Number.isFinite(minY) ||
          !Number.isFinite(maxX) ||
          !Number.isFinite(maxY)
        ) {
          throw new Error('Failed to compute shape bounds for grouping');
        }

        const width = Math.max(0, maxX - minX);
        const height = Math.max(0, maxY - minY);
        const groupId = uuidv4();
        const geometry = createGeometryFromBounds(minX, minY, width, height);

        const movePlan = buildReparentChanges({
          objects,
          pageId: args.pageId,
          shapeIds: uniqueShapeIds,
          targetParentId: groupId,
          targetFrameId,
        });

        if (movePlan.rootShapeIds.length === 0) {
          throw new Error('No groupable root shapes resolved from shapeIds');
        }
        if (movePlan.subtreeIdSet.has(targetParentId)) {
          throw new Error('parentId cannot be inside the grouped shape subtree');
        }

        const deleteRootChanges = movePlan.changes.slice(0, movePlan.rootShapeIds.length);
        const addMovedSubtreeChanges = movePlan.changes.slice(movePlan.rootShapeIds.length);

        if (deleteRootChanges.length > 0) {
          await penpotClient.applyChanges(args.fileId, deleteRootChanges as any);
        }

        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'add-obj',
            id: groupId,
            pageId: args.pageId,
            frameId: targetFrameId,
            parentId: targetParentId,
            ...(args.index !== undefined && { index: args.index }),
            obj: {
              id: groupId,
              type: 'group',
              name: args.name || 'Group',
              x: minX,
              y: minY,
              width,
              height,
              parentId: targetParentId,
              frameId: targetFrameId,
              shapes: movePlan.rootShapeIds,
              ...geometry,
            },
          },
        ] as any);

        if (addMovedSubtreeChanges.length > 0) {
          await penpotClient.applyChanges(args.fileId, addMovedSubtreeChanges as any);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Grouped ${movePlan.rootShapeIds.length} root shape(s) (${movePlan.subtreeIdSet.size} shape(s) including descendants) into ${args.name || 'Group'} (ID: ${groupId})`,
            },
            {
              type: 'text',
              text: JSON.stringify(
                {
                  groupId,
                  parentId: targetParentId,
                  frameId: targetFrameId,
                  shapeIds: movePlan.rootShapeIds,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    get_shape_token_bindings: {
      description:
        'Inspect token bindings for a shape, including applied tokens and style token references (fill/stroke/typography)',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeId: { type: 'string', description: 'Shape ID' },
        },
        required: ['fileId', 'pageId', 'shapeId'],
      },
      handler: async (args: { fileId: string; pageId: string; shapeId: string }) => {
        const { objects } = await getPageContext(penpotClient, args.fileId, args.pageId);
        const shape = objects[args.shapeId];

        if (!shape) {
          throw new Error(`Shape not found: ${args.shapeId}`);
        }

        const bindings: any = {
          shapeId: args.shapeId,
          name: shape.name,
          type: shape.type,
          appliedTokens: shape.appliedTokens || shape['applied-tokens'] || null,
          fills: Array.isArray(shape.fills)
            ? shape.fills.map((fill: any, index: number) => ({
                index,
                fillColorRefId: fill.fillColorRefId || fill['fill-color-ref-id'] || null,
                fillColorRefFile: fill.fillColorRefFile || fill['fill-color-ref-file'] || null,
              }))
            : [],
          strokes: Array.isArray(shape.strokes)
            ? shape.strokes.map((stroke: any, index: number) => ({
                index,
                strokeColorRefId: stroke.strokeColorRefId || stroke['stroke-color-ref-id'] || null,
                strokeColorRefFile:
                  stroke.strokeColorRefFile || stroke['stroke-color-ref-file'] || null,
              }))
            : [],
        };

        if (shape.type === 'text' && shape.content?.children?.[0]?.children) {
          const paragraphs = shape.content.children[0].children;
          bindings.typographyRefs = paragraphs.map((paragraph: any, index: number) => ({
            index,
            typographyRefId: paragraph.typographyRefId || paragraph['typography-ref-id'] || null,
            typographyRefFile:
              paragraph.typographyRefFile || paragraph['typography-ref-file'] || null,
          }));
        } else {
          bindings.typographyRefs = [];
        }

        const hasBindings =
          Boolean(bindings.appliedTokens && Object.keys(bindings.appliedTokens).length > 0) ||
          bindings.fills.some((fill: any) => fill.fillColorRefId || fill.fillColorRefFile) ||
          bindings.strokes.some(
            (stroke: any) => stroke.strokeColorRefId || stroke.strokeColorRefFile
          ) ||
          bindings.typographyRefs.some((ref: any) => ref.typographyRefId || ref.typographyRefFile);

        return {
          content: [
            {
              type: 'text',
              text: hasBindings
                ? `Found token bindings for shape ${args.shapeId}`
                : `No token bindings found for shape ${args.shapeId}`,
            },
            {
              type: 'text',
              text: JSON.stringify(bindings, null, 2),
            },
          ],
        };
      },
    },

    set_shape_token_bindings: {
      description:
        'Set token bindings for a shape (applied tokens and style token references for fill/stroke/typography)',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeId: { type: 'string', description: 'Shape ID' },
          appliedTokens: {
            type: 'object',
            description:
              'Token refs map to assign to shape.appliedTokens (e.g., {"r1":"radius.sm","fill":"color.primary"})',
            additionalProperties: { type: 'string' },
          },
          mergeAppliedTokens: {
            type: 'boolean',
            description: 'Merge with existing appliedTokens (default true)',
            default: true,
          },
          fillIndex: { type: 'number', description: 'Fill index to update (default 0)' },
          fillColorRefId: { type: 'string', description: 'Fill token/color style reference ID' },
          fillColorRefFile: { type: 'string', description: 'File ID for fillColorRefId' },
          clearFillColorRef: { type: 'boolean', description: 'Clear fill color reference fields' },
          strokeIndex: { type: 'number', description: 'Stroke index to update (default 0)' },
          strokeColorRefId: {
            type: 'string',
            description: 'Stroke token/color style reference ID',
          },
          strokeColorRefFile: { type: 'string', description: 'File ID for strokeColorRefId' },
          clearStrokeColorRef: {
            type: 'boolean',
            description: 'Clear stroke color reference fields',
          },
          paragraphIndex: {
            type: 'number',
            description: 'Text paragraph index for typography refs (default: all paragraphs)',
          },
          typographyRefId: {
            type: 'string',
            description: 'Typography reference ID for text paragraphs',
          },
          typographyRefFile: { type: 'string', description: 'File ID for typographyRefId' },
          clearTypographyRef: { type: 'boolean', description: 'Clear typography reference fields' },
        },
        required: ['fileId', 'pageId', 'shapeId'],
      },
      handler: async (args: ShapeTokenBindingArgs) => {
        const { objects } = await getPageContext(penpotClient, args.fileId, args.pageId);
        const shape = objects[args.shapeId];

        if (!shape) {
          throw new Error(`Shape not found: ${args.shapeId}`);
        }

        const { change, updatedParts } = buildShapeTokenBindingChange(shape, args);
        await penpotClient.applyChanges(args.fileId, [change]);

        return {
          content: [
            {
              type: 'text',
              text: `Updated token bindings for shape ${args.shapeId}: ${updatedParts.join(', ')}`,
            },
          ],
        };
      },
    },

    batch_set_shape_token_bindings: {
      description:
        'Set token bindings for multiple shapes in one request with per-item success/failure reporting',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of shape token binding updates',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                fileId: { type: 'string', description: 'File ID' },
                pageId: { type: 'string', description: 'Page ID' },
                shapeId: { type: 'string', description: 'Shape ID' },
                appliedTokens: {
                  type: 'object',
                  description:
                    'Token refs map to assign to shape.appliedTokens (e.g., {"r1":"radius.sm","fill":"color.primary"})',
                  additionalProperties: { type: 'string' },
                },
                mergeAppliedTokens: {
                  type: 'boolean',
                  description: 'Merge with existing appliedTokens (default true)',
                  default: true,
                },
                fillIndex: { type: 'number', description: 'Fill index to update (default 0)' },
                fillColorRefId: {
                  type: 'string',
                  description: 'Fill token/color style reference ID',
                },
                fillColorRefFile: { type: 'string', description: 'File ID for fillColorRefId' },
                clearFillColorRef: {
                  type: 'boolean',
                  description: 'Clear fill color reference fields',
                },
                strokeIndex: { type: 'number', description: 'Stroke index to update (default 0)' },
                strokeColorRefId: {
                  type: 'string',
                  description: 'Stroke token/color style reference ID',
                },
                strokeColorRefFile: {
                  type: 'string',
                  description: 'File ID for strokeColorRefId',
                },
                clearStrokeColorRef: {
                  type: 'boolean',
                  description: 'Clear stroke color reference fields',
                },
                paragraphIndex: {
                  type: 'number',
                  description: 'Text paragraph index for typography refs (default: all paragraphs)',
                },
                typographyRefId: {
                  type: 'string',
                  description: 'Typography reference ID for text paragraphs',
                },
                typographyRefFile: { type: 'string', description: 'File ID for typographyRefId' },
                clearTypographyRef: {
                  type: 'boolean',
                  description: 'Clear typography reference fields',
                },
              },
              required: ['fileId', 'pageId', 'shapeId'],
            },
          },
          continueOnError: {
            type: 'boolean',
            description: 'Continue processing after item failures (default true)',
            default: true,
          },
        },
        required: ['items'],
      },
      handler: async (args: { items: ShapeTokenBindingArgs[]; continueOnError?: boolean }) => {
        if (!Array.isArray(args.items) || args.items.length === 0) {
          throw new Error('items must be a non-empty array');
        }

        const continueOnError = args.continueOnError !== false;
        const pageObjectsCache = new Map<string, Record<string, any>>();
        const results: Array<Record<string, any>> = [];
        let successCount = 0;
        let failureCount = 0;
        let abortRemaining = false;

        for (let index = 0; index < args.items.length; index += 1) {
          const item = args.items[index];

          if (abortRemaining) {
            results.push({
              index,
              status: 'skipped',
              fileId: item?.fileId || null,
              pageId: item?.pageId || null,
              shapeId: item?.shapeId || null,
              error: 'Skipped because continueOnError=false and a previous item failed',
            });
            continue;
          }

          try {
            if (!item?.fileId || !item?.pageId || !item?.shapeId) {
              throw new Error('Each item must include fileId, pageId, and shapeId');
            }

            const pageCacheKey = `${item.fileId}:${item.pageId}`;
            if (!pageObjectsCache.has(pageCacheKey)) {
              const { objects } = await getPageContext(penpotClient, item.fileId, item.pageId);
              pageObjectsCache.set(pageCacheKey, objects);
            }

            const objects = pageObjectsCache.get(pageCacheKey)!;
            const shape = objects[item.shapeId];
            if (!shape) {
              throw new Error(`Shape not found: ${item.shapeId}`);
            }

            const { change, updatedParts } = buildShapeTokenBindingChange(shape, item);
            await penpotClient.applyChanges(item.fileId, [change]);
            objects[item.shapeId] = applySetOperationsLocally(shape, change.operations || []);

            results.push({
              index,
              status: 'success',
              fileId: item.fileId,
              pageId: item.pageId,
              shapeId: item.shapeId,
              updatedParts,
            });
            successCount += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({
              index,
              status: 'error',
              fileId: item?.fileId || null,
              pageId: item?.pageId || null,
              shapeId: item?.shapeId || null,
              error: message,
            });
            failureCount += 1;

            if (!continueOnError) {
              abortRemaining = true;
            }
          }
        }

        const skippedCount = results.filter((result) => result.status === 'skipped').length;

        return {
          content: [
            {
              type: 'text',
              text: `Batch set_shape_token_bindings completed: ${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped (${args.items.length} total)`,
            },
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: args.items.length,
                  successCount,
                  failureCount,
                  skippedCount,
                  continueOnError,
                  results,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },

    delete_shape: {
      description: 'Delete a shape from the page',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'File ID' },
          pageId: { type: 'string', description: 'Page ID' },
          shapeId: { type: 'string', description: 'Shape ID' },
        },
        required: ['fileId', 'pageId', 'shapeId'],
      },
      handler: async (args: { fileId: string; pageId: string; shapeId: string }) => {
        await penpotClient.applyChanges(args.fileId, [
          {
            type: 'del-obj',
            id: args.shapeId,
            pageId: args.pageId,
          },
        ] as any);

        return {
          content: [
            {
              type: 'text',
              text: `Deleted shape: ${args.shapeId}`,
            },
          ],
        };
      },
    },

    batch_delete_shape: {
      description: 'Delete multiple shapes with per-item success/failure reporting',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of shape deletion operations',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                fileId: { type: 'string', description: 'File ID' },
                pageId: { type: 'string', description: 'Page ID' },
                shapeId: { type: 'string', description: 'Shape ID' },
              },
              required: ['fileId', 'pageId', 'shapeId'],
            },
          },
          continueOnError: {
            type: 'boolean',
            description: 'Continue processing after item failures (default true)',
            default: true,
          },
        },
        required: ['items'],
      },
      handler: async (args: {
        items: Array<{ fileId: string; pageId: string; shapeId: string }>;
        continueOnError?: boolean;
      }) => {
        if (!Array.isArray(args.items) || args.items.length === 0) {
          throw new Error('items must be a non-empty array');
        }

        const continueOnError = args.continueOnError !== false;
        const pageObjectsCache = new Map<string, Record<string, any>>();
        const results: Array<Record<string, any>> = [];
        let successCount = 0;
        let failureCount = 0;
        let abortRemaining = false;

        for (let index = 0; index < args.items.length; index += 1) {
          const item = args.items[index];

          if (abortRemaining) {
            results.push({
              index,
              status: 'skipped',
              fileId: item?.fileId || null,
              pageId: item?.pageId || null,
              shapeId: item?.shapeId || null,
              error: 'Skipped because continueOnError=false and a previous item failed',
            });
            continue;
          }

          try {
            if (!item?.fileId || !item?.pageId || !item?.shapeId) {
              throw new Error('Each item must include fileId, pageId, and shapeId');
            }

            const pageCacheKey = `${item.fileId}:${item.pageId}`;
            if (!pageObjectsCache.has(pageCacheKey)) {
              const { objects } = await getPageContext(penpotClient, item.fileId, item.pageId);
              pageObjectsCache.set(pageCacheKey, objects);
            }

            const objects = pageObjectsCache.get(pageCacheKey)!;
            if (!objects[item.shapeId]) {
              throw new Error(`Shape not found: ${item.shapeId}`);
            }

            await penpotClient.applyChanges(item.fileId, [
              {
                type: 'del-obj',
                id: item.shapeId,
                pageId: item.pageId,
              },
            ] as any);

            delete objects[item.shapeId];

            results.push({
              index,
              status: 'success',
              fileId: item.fileId,
              pageId: item.pageId,
              shapeId: item.shapeId,
            });
            successCount += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({
              index,
              status: 'error',
              fileId: item?.fileId || null,
              pageId: item?.pageId || null,
              shapeId: item?.shapeId || null,
              error: message,
            });
            failureCount += 1;

            if (!continueOnError) {
              abortRemaining = true;
            }
          }
        }

        const skippedCount = results.filter((result) => result.status === 'skipped').length;

        return {
          content: [
            {
              type: 'text',
              text: `Batch delete_shape completed: ${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped (${args.items.length} total)`,
            },
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: args.items.length,
                  successCount,
                  failureCount,
                  skippedCount,
                  continueOnError,
                  results,
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },
  };
}

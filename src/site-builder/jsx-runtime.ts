export namespace JSX {
  export type Element = string;
  export interface IntrinsicElements {
    [el: string]: any
  }
}

type AttributeValue = number | string | Date | boolean;

export interface Children {
  children?: string | string[];
}

export interface CustomElementHandler {
  (attributes: Attributes & Children, contents: string[]): string;
}

export interface Attributes {
  [key: string]: AttributeValue;
}

const capitalACharCode = 'A'.charCodeAt(0);
const capitalZCharCode = 'Z'.charCodeAt(0);

function isUpper(input: string, index: number) {
  const charCode = input.charCodeAt(index);
  return capitalACharCode <= charCode && capitalZCharCode >= charCode;
};

function toKebabCase(camelCased: string) {
  let kebabCased = '';
  for (let i = 0; i < camelCased.length; i++) {
    const prevUpperCased = i > 0 ? isUpper(camelCased, i - 1) : true;
    const currentUpperCased = isUpper(camelCased, i);
    const nextUpperCased = i < camelCased.length - 1 ? isUpper(camelCased, i + 1) : true;
    if (!prevUpperCased && currentUpperCased || currentUpperCased && !nextUpperCased) {
      kebabCased += '-';
      kebabCased += camelCased[i].toLowerCase();
    } else {
      kebabCased += camelCased[i];
    }
  }
  return kebabCased;
};

function escapeAttrNodeValue(value: string) {
  return (
    value.replace(/(&)|(")|(\u00A0)/g, (_, amp, quote) => {
      if (amp) { return '&amp;'; }
      else if (quote) { return '&quot;'; }
      else { return '&nbsp;'; }
    })
  );
};

function getAttributeStringifier(attributes: Attributes) {
  return function attributeToString(name: string): string {
    const value = attributes[name];
    const formattedName = toKebabCase(name);
    const makeAttribute = (value: string) => `${formattedName}="${value}"`;

    if (value instanceof Date) {
      return makeAttribute(value.toISOString());
    } else switch (typeof value) {
      case 'boolean':
        if (value) {
          return formattedName;
        } else {
          return '';
        }
      default:
        return makeAttribute(escapeAttrNodeValue(value.toString()));
    }
  }
};

function attributesToString(attributes: Attributes) {
  const spaceSeparated = Object.keys(attributes).
    filter(attribute => attribute !== 'children').
    map(getAttributeStringifier(attributes)).
    filter(attribute => attribute.length).
    join(' ');
  if (spaceSeparated.trim()) {
    return ` ${spaceSeparated}`;
  } else {
    return '';
  }
};

function contentsToString(contents: string[]) {
  return contents.
    map(elements => Array.isArray(elements) ? elements.join('\n') : elements).
    join('\n') ?? ''
};

function createElement(
  name: string | CustomElementHandler,
  attributes: Attributes & Children | undefined,
  ...contents: string[]
): string {
  if (typeof name === 'function') {
    return name(attributes ?? {}, contents);
  } else {
    const tagName = toKebabCase(name);
    const inner1 = contentsToString(contents);
    const inner2 = attributes?.children
      ? contentsToString(
          Array.isArray(attributes.children)
            ? attributes.children
            : [attributes.children]
        )
      : '';
    const inner = inner1 && inner2
      ? `${inner1}\n${inner2}`
      : inner1 || inner2;
    return `<${tagName}${attributes ? attributesToString(attributes) : ''}>${inner}</${tagName}>`;
  }
}

export { createElement as jsxs, createElement as jsx }

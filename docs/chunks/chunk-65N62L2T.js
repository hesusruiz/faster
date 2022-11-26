// front/node_modules/@webreflection/mapset/esm/index.js
var MapSet = class extends Map {
  set(key, value) {
    super.set(key, value);
    return value;
  }
};
var WeakMapSet = class extends WeakMap {
  set(key, value) {
    super.set(key, value);
    return value;
  }
};

// front/node_modules/@webreflection/uparser/esm/index.js
var empty = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
var elements = /<([a-z]+[a-z0-9:._-]*)([^>]*?)(\/?)>/g;
var attributes = /([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g;
var holes = /[\x01\x02]/g;
var esm_default = (template, prefix2, svg2) => {
  let i = 0;
  return template.join("").trim().replace(
    elements,
    (_, name, attrs, selfClosing) => {
      let ml = name + attrs.replace(attributes, "=$2$1").trimEnd();
      if (selfClosing.length)
        ml += svg2 || empty.test(name) ? " /" : "></" + name;
      return "<" + ml + ">";
    }
  ).replace(
    holes,
    (hole) => hole === "" ? "<!--" + prefix2 + i++ + "-->" : prefix2 + i++
  );
};

// front/node_modules/@webreflection/uwire/esm/index.js
var ELEMENT_NODE = 1;
var nodeType = 111;
var remove = ({ firstChild, lastChild }) => {
  const range = document.createRange();
  range.setStartAfter(firstChild);
  range.setEndAfter(lastChild);
  range.deleteContents();
  return firstChild;
};
var diffable = (node, operation) => node.nodeType === nodeType ? 1 / operation < 0 ? operation ? remove(node) : node.lastChild : operation ? node.valueOf() : node.firstChild : node;
var persistent = (fragment) => {
  const { firstChild, lastChild } = fragment;
  if (firstChild === lastChild)
    return lastChild || fragment;
  const { childNodes } = fragment;
  const nodes = [...childNodes];
  return {
    ELEMENT_NODE,
    nodeType,
    firstChild,
    lastChild,
    valueOf() {
      if (childNodes.length !== nodes.length)
        fragment.append(...nodes);
      return fragment;
    }
  };
};

// front/node_modules/uarray/esm/index.js
var { isArray } = Array;
var { indexOf, slice } = [];

// front/node_modules/uhandlers/esm/index.js
var useForeign = false;
var Foreign = class {
  constructor(handler, value) {
    useForeign = true;
    this._ = (...args) => handler(...args, value);
  }
};
var aria = (node) => (values) => {
  for (const key in values) {
    const name = key === "role" ? key : `aria-${key}`;
    const value = values[key];
    if (value == null)
      node.removeAttribute(name);
    else
      node.setAttribute(name, value);
  }
};
var attribute = (node, name) => {
  let oldValue, orphan = true;
  const attributeNode = document.createAttributeNS(null, name);
  return (newValue) => {
    if (oldValue !== newValue) {
      oldValue = newValue;
      if (oldValue == null) {
        if (!orphan) {
          node.removeAttributeNode(attributeNode);
          orphan = true;
        }
      } else {
        const value = useForeign && newValue instanceof Foreign ? newValue._(node, name) : newValue;
        if (value == null) {
          if (!orphan)
            node.removeAttributeNode(attributeNode);
          orphan = true;
        } else {
          attributeNode.value = value;
          if (orphan) {
            node.setAttributeNodeNS(attributeNode);
            orphan = false;
          }
        }
      }
    }
  };
};
var boolean = (node, key, oldValue) => (newValue) => {
  if (oldValue !== !!newValue) {
    if (oldValue = !!newValue)
      node.setAttribute(key, "");
    else
      node.removeAttribute(key);
  }
};
var data = ({ dataset }) => (values) => {
  for (const key in values) {
    const value = values[key];
    if (value == null)
      delete dataset[key];
    else
      dataset[key] = value;
  }
};
var event = (node, name) => {
  let oldValue, lower, type = name.slice(2);
  if (!(name in node) && (lower = name.toLowerCase()) in node)
    type = lower.slice(2);
  return (newValue) => {
    const info = isArray(newValue) ? newValue : [newValue, false];
    if (oldValue !== info[0]) {
      if (oldValue)
        node.removeEventListener(type, oldValue, info[1]);
      if (oldValue = info[0])
        node.addEventListener(type, oldValue, info[1]);
    }
  };
};
var ref = (node) => {
  let oldValue;
  return (value) => {
    if (oldValue !== value) {
      oldValue = value;
      if (typeof value === "function")
        value(node);
      else
        value.current = node;
    }
  };
};
var setter = (node, key) => key === "dataset" ? data(node) : (value) => {
  node[key] = value;
};
var text = (node) => {
  let oldValue;
  return (newValue) => {
    if (oldValue != newValue) {
      oldValue = newValue;
      node.textContent = newValue == null ? "" : newValue;
    }
  };
};

// front/node_modules/udomdiff/esm/index.js
var esm_default2 = (parentNode, a, b, get, before) => {
  const bLength = b.length;
  let aEnd = a.length;
  let bEnd = bLength;
  let aStart = 0;
  let bStart = 0;
  let map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? get(b[bStart - 1], -0).nextSibling : get(b[bEnd - bStart], 0) : before;
      while (bStart < bEnd)
        parentNode.insertBefore(get(b[bStart++], 1), node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart]))
          parentNode.removeChild(get(a[aStart], -1));
        aStart++;
      }
    } else if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
    } else if (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = get(a[--aEnd], -1).nextSibling;
      parentNode.insertBefore(
        get(b[bStart++], 1),
        get(a[aStart++], -1).nextSibling
      );
      parentNode.insertBefore(get(b[--bEnd], 1), node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = /* @__PURE__ */ new Map();
        let i = bStart;
        while (i < bEnd)
          map.set(b[i], i++);
      }
      if (map.has(a[aStart])) {
        const index = map.get(a[aStart]);
        if (bStart < index && index < bEnd) {
          let i = aStart;
          let sequence = 1;
          while (++i < aEnd && i < bEnd && map.get(a[i]) === index + sequence)
            sequence++;
          if (sequence > index - bStart) {
            const node = get(a[aStart], 0);
            while (bStart < index)
              parentNode.insertBefore(get(b[bStart++], 1), node);
          } else {
            parentNode.replaceChild(
              get(b[bStart++], 1),
              get(a[aStart++], -1)
            );
          }
        } else
          aStart++;
      } else
        parentNode.removeChild(get(a[aStart++], -1));
    }
  }
  return b;
};

// front/node_modules/uhtml/esm/utils.js
var { isArray: isArray2, prototype } = Array;
var { indexOf: indexOf2 } = prototype;
var {
  createDocumentFragment,
  createElement,
  createElementNS,
  createTextNode,
  createTreeWalker,
  importNode
} = new Proxy(document, {
  get: (target, method) => target[method].bind(target)
});
var createHTML = (html2) => {
  const template = createElement("template");
  template.innerHTML = html2;
  return template.content;
};
var xml;
var createSVG = (svg2) => {
  if (!xml)
    xml = createElementNS("http://www.w3.org/2000/svg", "svg");
  xml.innerHTML = svg2;
  const content = createDocumentFragment();
  content.append(...xml.childNodes);
  return content;
};
var createContent = (text2, svg2) => svg2 ? createSVG(text2) : createHTML(text2);

// front/node_modules/uhtml/esm/handlers.js
var reducePath = ({ childNodes }, i) => childNodes[i];
var diff = (comment, oldNodes, newNodes) => esm_default2(
  comment.parentNode,
  oldNodes,
  newNodes,
  diffable,
  comment
);
var handleAnything = (comment) => {
  let oldValue, text2, nodes = [];
  const anyContent = (newValue) => {
    switch (typeof newValue) {
      case "string":
      case "number":
      case "boolean":
        if (oldValue !== newValue) {
          oldValue = newValue;
          if (!text2)
            text2 = createTextNode("");
          text2.data = newValue;
          nodes = diff(comment, nodes, [text2]);
        }
        break;
      case "object":
      case "undefined":
        if (newValue == null) {
          if (oldValue != newValue) {
            oldValue = newValue;
            nodes = diff(comment, nodes, []);
          }
          break;
        }
        if (isArray2(newValue)) {
          oldValue = newValue;
          if (newValue.length === 0)
            nodes = diff(comment, nodes, []);
          else if (typeof newValue[0] === "object")
            nodes = diff(comment, nodes, newValue);
          else
            anyContent(String(newValue));
          break;
        }
        if (oldValue !== newValue && "ELEMENT_NODE" in newValue) {
          oldValue = newValue;
          nodes = diff(
            comment,
            nodes,
            newValue.nodeType === 11 ? [...newValue.childNodes] : [newValue]
          );
        }
        break;
      case "function":
        anyContent(newValue(comment));
        break;
    }
  };
  return anyContent;
};
var handleAttribute = (node, name) => {
  switch (name[0]) {
    case "?":
      return boolean(node, name.slice(1), false);
    case ".":
      return setter(node, name.slice(1));
    case "@":
      return event(node, "on" + name.slice(1));
    case "o":
      if (name[1] === "n")
        return event(node, name);
  }
  switch (name) {
    case "ref":
      return ref(node);
    case "aria":
      return aria(node);
  }
  return attribute(node, name);
};
function handlers(options) {
  const { type, path } = options;
  const node = path.reduceRight(reducePath, this);
  return type === "node" ? handleAnything(node) : type === "attr" ? handleAttribute(node, options.name) : text(node);
}

// front/node_modules/uhtml/esm/rabbit.js
var createPath = (node) => {
  const path = [];
  let { parentNode } = node;
  while (parentNode) {
    path.push(indexOf2.call(parentNode.childNodes, node));
    node = parentNode;
    ({ parentNode } = node);
  }
  return path;
};
var prefix = "isµ";
var cache = new WeakMapSet();
var textOnly = /^(?:textarea|script|style|title|plaintext|xmp)$/;
var createCache = () => ({
  stack: [],
  entry: null,
  wire: null
});
var createEntry = (type, template) => {
  const { content, updates } = mapUpdates(type, template);
  return { type, template, content, updates, wire: null };
};
var mapTemplate = (type, template) => {
  const svg2 = type === "svg";
  const text2 = esm_default(template, prefix, svg2);
  const content = createContent(text2, svg2);
  const tw = createTreeWalker(content, 1 | 128);
  const nodes = [];
  const length = template.length - 1;
  let i = 0;
  let search = `${prefix}${i}`;
  while (i < length) {
    const node = tw.nextNode();
    if (!node)
      throw `bad template: ${text2}`;
    if (node.nodeType === 8) {
      if (node.data === search) {
        nodes.push({ type: "node", path: createPath(node) });
        search = `${prefix}${++i}`;
      }
    } else {
      while (node.hasAttribute(search)) {
        nodes.push({
          type: "attr",
          path: createPath(node),
          name: node.getAttribute(search)
        });
        node.removeAttribute(search);
        search = `${prefix}${++i}`;
      }
      if (textOnly.test(node.localName) && node.textContent.trim() === `<!--${search}-->`) {
        node.textContent = "";
        nodes.push({ type: "text", path: createPath(node) });
        search = `${prefix}${++i}`;
      }
    }
  }
  return { content, nodes };
};
var mapUpdates = (type, template) => {
  const { content, nodes } = cache.get(template) || cache.set(template, mapTemplate(type, template));
  const fragment = importNode(content, true);
  const updates = nodes.map(handlers, fragment);
  return { content: fragment, updates };
};
var unroll = (info, { type, template, values }) => {
  const length = unrollValues(info, values);
  let { entry } = info;
  if (!entry || (entry.template !== template || entry.type !== type))
    info.entry = entry = createEntry(type, template);
  const { content, updates, wire } = entry;
  for (let i = 0; i < length; i++)
    updates[i](values[i]);
  return wire || (entry.wire = persistent(content));
};
var unrollValues = ({ stack }, values) => {
  const { length } = values;
  for (let i = 0; i < length; i++) {
    const hole = values[i];
    if (hole instanceof Hole)
      values[i] = unroll(
        stack[i] || (stack[i] = createCache()),
        hole
      );
    else if (isArray2(hole))
      unrollValues(stack[i] || (stack[i] = createCache()), hole);
    else
      stack[i] = null;
  }
  if (length < stack.length)
    stack.splice(length);
  return length;
};
var Hole = class {
  constructor(type, template, values) {
    this.type = type;
    this.template = template;
    this.values = values;
  }
};

// front/node_modules/uhtml/esm/index.js
var tag = (type) => {
  const keyed = new WeakMapSet();
  const fixed = (cache3) => (template, ...values) => unroll(
    cache3,
    { type, template, values }
  );
  return Object.assign(
    (template, ...values) => new Hole(type, template, values),
    {
      for(ref2, id) {
        const memo = keyed.get(ref2) || keyed.set(ref2, new MapSet());
        return memo.get(id) || memo.set(id, fixed(createCache()));
      },
      node: (template, ...values) => unroll(createCache(), new Hole(type, template, values)).valueOf()
    }
  );
};
var cache2 = new WeakMapSet();
var render = (where, what) => {
  const hole = typeof what === "function" ? what() : what;
  const info = cache2.get(where) || cache2.set(where, createCache());
  const wire = hole instanceof Hole ? unroll(info, hole) : hole;
  if (wire !== info.wire) {
    info.wire = wire;
    where.replaceChildren(wire.valueOf());
  }
  return where;
};
var html = tag("html");
var svg = tag("svg");

export {
  render,
  html
};
/*! (c) Andrea Giammarchi - ISC */

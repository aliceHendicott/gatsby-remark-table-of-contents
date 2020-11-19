const util = require("mdast-util-toc");
const yaml = require("js-yaml");

// convert "in-string" to "inString"
const strToCamel = str => {
  return str.replace(/-(.)/g, (match, chr) => chr.toUpperCase());
};

// convert "{'in-key': val}" to "{'inKey': val}"
const keysToCamel = obj => {
  if (obj) {
    const newObj = {};
    Object.keys(obj).forEach(k => {
      newObj[strToCamel(k)] = obj[k];
    });
    return newObj;
  }
  return obj;
};

const transformer = (markdownAST, pluginOptions) => {
  // find position of TOC
  const index = markdownAST.children.findIndex(
    node => node.type === "code" && node.lang === "toc"
  );

  // we have no TOC
  if (index === -1) {
    return;
  }

  let prefs = {
    tight: false,
    fromHeading: 2,
    toHeading: 6,
    className: "toc",
    ordered: false,
    ...keysToCamel(pluginOptions)
  };

  try {
    let parsePrefs = yaml.safeLoad(markdownAST.children[index].value);
    prefs = { ...prefs, ...keysToCamel(parsePrefs) };
  } catch (e) {
    console.log("Can't parse TOC-Configuration", e);
  }
  
  // For XSS safety, we only allow basic css names
  if (!prefs.className.match(/^[ a-zA-Z0-9_-]*$/)) {
    prefs.className = "toc";
  }

  // this ist the ast we nned consider
  let tocMarkdownAST = {
    ...markdownAST,
    children: []
  };

  let depth;

  // add all headings
  markdownAST.children.forEach(node => {
    if (node.type === "heading" && node.depth > prefs.fromHeading - 1) {
      tocMarkdownAST.children.push(node);
    }
  });

  // calculate TOC
  const result = util(tocMarkdownAST, {
    maxDepth: prefs.toHeading,
    tight: prefs.tight,
    ordered: prefs.ordered,
    skip: Array.isArray(prefs.exclude) ? prefs.exclude.join("|") : prefs.exclude
  });

  // insert the TOC≤
  markdownAST.children = [].concat(
    markdownAST.children.slice(0, index),
    {
      type: "html",
      value: '<div class="' + prefs.className + '">'
    },
    result.map,
    {
      type: "html",
      value: "</div>"
    },
    markdownAST.children.slice(index + 1)
  );
};

module.exports = ({ markdownAST }, pluginOptions) => {
  return transformer(markdownAST, pluginOptions);
};

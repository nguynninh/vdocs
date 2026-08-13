import { visit } from "unist-util-visit";

export function remarkMarkmap() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "markmap" || !parent) return;

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Markmap",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "children",
            value: node.value,
          },
        ],
        children: [],
      };
    });
  };
}

import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import * as CodeblockComponents from "@/components/codeblock";

export function getMDXComponents(
  components?: MDXComponents,
): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...CodeblockComponents,
    pre: (props) => (
      <CodeblockComponents.CodeBlock {...props}>
        <CodeblockComponents.Pre>{props.children}</CodeblockComponents.Pre>
      </CodeblockComponents.CodeBlock>
    ),
    ...components,
  };
}

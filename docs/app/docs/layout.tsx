import { source } from "@/lib/source";
import { DocsLayout } from "@/components/layout/notebook";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/docs">) {
  const { nav, ...base } = baseOptions();

  return (
    <DocsLayout
      tabMode="navbar"
      nav={{ ...nav, mode: "top" }}
      tree={source.getPageTree()}
      {...base}
    >
      {children}
    </DocsLayout>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CodeBlock, Pre } from "@/components/codeblock";
import { cn } from "@/lib/cn";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-3xl space-y-6 z-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Run, Chain, and Loop AI prompts using{" "}
          <span className="text-amber-500">markdown</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-fd-muted-foreground sm:text-xl">
          A CLI for passing prompts from Markdown to your AI agents
        </p>
        <div className="relative flex w-fit h-fit overflow-hidden rounded-xl p-[1px] mx-auto">
          <CodeBlock
            allowCopy
            className="text-left px-4 my-0 mx-auto w-100 z-10"
          >
            <Pre>
              <code>npm install -g promptmd-cli</code>
            </Pre>
          </CodeBlock>
          <span className="absolute -z-20 opacity-80 inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#ffe5cb_0%,#eaa315_50%,#fcf9f5_100%)]" />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/docs"
            className={buttonVariants({
              color: "primary",
              size: "sm",
              className: "px-8 py-2.5",
            })}
          >
            Learn More
          </Link>
          <Link
            href="https://github.com/FreshlyBrewedCode/promptmd"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "px-8 py-2.5",
            })}
          >
            GitHub
          </Link>
        </div>
      </div>
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:20px_20px]",
          "[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]",
          "dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]",
        )}
      />
      {/* Radial gradient for the container to give a faded look */}
      {/* <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black"></div> */}
    </main>
  );
}

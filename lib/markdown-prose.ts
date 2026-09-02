import { cn } from "@/lib/utils"

export const markdownProseClass = cn(
  "max-w-none text-[15px] leading-7 text-foreground",
  "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1:first-child]:mt-0",
  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2:first-child]:mt-0",
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3:first-child]:mt-0",
  "[&_p]:my-2 [&_p]:leading-relaxed",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_li]:leading-relaxed",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
  "[&_img]:my-4 [&_img]:max-h-96 [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-border/80 [&_img]:object-cover",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_em]:italic"
)

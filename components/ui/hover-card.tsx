"use client";

import { Popover } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

function HoverCard({ ...props }: Popover.Root.Props) {
  return <Popover.Root {...props} />;
}

function HoverCardTrigger(props: Popover.Trigger.Props) {
  return <Popover.Trigger {...props} />;
}

function HoverCardContent({ className, ...props }: Popover.Popup.Props) {
  return (
    <Popover.Portal>
      <Popover.Positioner side="top" align="center" sideOffset={8}>
        <Popover.Popup
          className={cn(
            "z-50 w-auto rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
          {...props}
        />
      </Popover.Positioner>
    </Popover.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };

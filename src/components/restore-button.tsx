"use client";

import { Undo2 } from "lucide-react";
import { useTransition } from "react";
import { restoreCompletion } from "@/app/actions";
import { Button } from "./ui";

export function RestoreButton({ itemId, tagId }: { itemId: string; tagId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(() => restoreCompletion(itemId, tagId))}
    >
      <Undo2 size={14} /> Restore
    </Button>
  );
}

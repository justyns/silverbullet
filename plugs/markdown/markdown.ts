import { clientStore, editor } from "$sb/syscalls.ts";
import { updateMarkdownPreview } from "./preview.ts";

export async function togglePreview() {
  const currentValue = !!(await clientStore.get("enableMarkdownPreview"));
  await clientStore.set("enableMarkdownPreview", !currentValue);
  if (!currentValue) {
    await updateMarkdownPreview();
  } else {
    await hideMarkdownPreview();
  }
}

async function hideMarkdownPreview() {
  await editor.hidePanel("rhs");
}

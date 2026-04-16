import { onMounted, onUnmounted, type Ref, ref } from 'vue';

export interface TextSelectionResult {
  text: string;
  isInContainer: boolean;
}

/**
 * 只读选区感知 Composable
 */
export function useTextSelection(containerRef: Ref<HTMLElement | null>): Ref<TextSelectionResult> {
  const selection = ref<TextSelectionResult>({ text: '', isInContainer: false });

  const handleSelectionChange = () => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) {
      selection.value = { text: '', isInContainer: false };
      return;
    }
    const text = sel.toString().trim();
    const container = containerRef.value;
    const isInContainer = !!(container && sel.anchorNode && container.contains(sel.anchorNode));
    selection.value = { text, isInContainer };
  };

  onMounted(() => document.addEventListener('selectionchange', handleSelectionChange));
  onUnmounted(() => document.removeEventListener('selectionchange', handleSelectionChange));

  return selection;
}

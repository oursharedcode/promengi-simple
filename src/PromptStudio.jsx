import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import pkg from "../package.json";

const APP_VERSION = pkg.version;

// ─── Data ────────────────────────────────────────────────────────────────────

const BLOCKS = [
  {
    id: "role",
    emoji: "🎭",
    label: "Role",
    color: "#7C3AED",
    glow: "#7C3AED44",
    text: "You are an expert [DOMAIN] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].",
    why: "🎭 Persona Priming\n• Activates domain-specific knowledge in the model\n• Improves accuracy and tone consistency\n• Sets the voice for the entire response",
  },
  {
    id: "context",
    emoji: "🗂️",
    label: "Context",
    color: "#0EA5E9",
    glow: "#0EA5E944",
    text: "Context: [BACKGROUND]. The user is working on [PROJECT]. Key constraints: [CONSTRAINTS].",
    why: "🗂️ Contextual Grounding\n• Anchors the model to your specific situation\n• Reduces generic, one-size-fits-all answers\n• Prevents wrong assumptions about your problem",
  },
  {
    id: "task",
    emoji: "🎯",
    label: "Task",
    color: "#10B981",
    glow: "#10B98144",
    text: "Your task is to [SPECIFIC_ACTION]. Focus on [SCOPE]. Do NOT [EXCLUSIONS].",
    why: "🎯 Task Clarity\n• Defines exact output boundary with action verbs\n• Prevents scope creep and off-topic answers\n• DO NOT exclusions sharpen focus instantly",
  },
  {
    id: "constraints",
    emoji: "🚧",
    label: "Constraints",
    color: "#F59E0B",
    glow: "#F59E0B44",
    text: "Constraints:\n- Only use information provided\n- If unsure, say \"I don't know\"\n- Limit response to [N] words",
    why: "🚧 Guardrails Technique\n• Hard limits reduce hallucination risk\n• Keeps output within verifiable scope\n• Length cap prevents rambling responses",
  },
  {
    id: "cot",
    emoji: "🧠",
    label: "Think Step-by-Step",
    color: "#EC4899",
    glow: "#EC489944",
    text: "Think step by step:\n1. Identify what is being asked\n2. List your assumptions\n3. Reason through the evidence\n4. State your conclusion",
    why: "🧠 Chain-of-Thought (CoT)\n• Forces explicit reasoning before the answer\n• Dramatically improves accuracy on hard tasks\n• Exposes flawed logic before it reaches output",
  },
  {
    id: "format",
    emoji: "📐",
    label: "Output Format",
    color: "#8B5CF6",
    glow: "#8B5CF644",
    text: "Respond using this format:\n[FORMAT_TYPE]\nStructure: [SECTIONS]\nMax length: [N] words",
    why: "📐 Output Schema Control\n• Shifts effort from formatting to content\n• Produces consistent, parseable responses\n• Makes output directly usable without editing",
  },
  {
    id: "examples",
    emoji: "💡",
    label: "Few-Shot Examples",
    color: "#14B8A6",
    glow: "#14B8A644",
    text: "Examples:\n\nInput: [EXAMPLE_INPUT_1]\nOutput: [EXAMPLE_OUTPUT_1]\n\nInput: [EXAMPLE_INPUT_2]\nOutput: [EXAMPLE_OUTPUT_2]",
    why: "💡 Few-Shot Learning\n• Concrete examples beat lengthy instructions\n• Teaches exact pattern, tone, and format\n• Essential for niche or non-standard outputs",
  },
  {
    id: "verify",
    emoji: "✅",
    label: "Self-Verify",
    color: "#F97316",
    glow: "#F9731644",
    text: "Before responding:\n1. Verify each claim against context\n2. Flag uncertainty with [?]\n3. Check your reasoning is sound",
    why: "✅ Self-Consistency Check\n• Model reviews its output before finalising\n• Catches logical errors and unsupported claims\n• Built-in quality gate at zero extra cost",
  },
  {
    id: "tone",
    emoji: "🎨",
    label: "Tone & Style",
    color: "#6366F1",
    glow: "#6366F144",
    text: "Tone: [TONE]\nAudience: [AUDIENCE]\nAvoid: [AVOID_LIST]",
    why: "🎨 Audience Alignment\n• Steers vocabulary and register precisely\n• Forbidden words list prevents unwanted phrasing\n• Output lands right without manual post-editing",
  },
  {
    id: "grounding",
    emoji: "⚓",
    label: "Grounding",
    color: "#84CC16",
    glow: "#84CC1644",
    text: "Use ONLY the information provided below. Do not use outside knowledge.\nSource: [SOURCE_MATERIAL]",
    why: "⚓ Retrieval Grounding\n• Restricts model to your supplied sources only\n• Prevents hallucinated facts entirely\n• Makes responses auditable and compliance-safe",
  },
  {
    id: "uncertainty",
    emoji: "🤔",
    label: "Uncertainty",
    color: "#F43F5E",
    glow: "#F43F5E44",
    text: "If you are uncertain about any part of your answer, explicitly state your confidence level and say \"I don't know\" rather than guessing.",
    why: "🤔 Calibrated Confidence\n• Permits 'I don't know' — overrides confabulation\n• Surfaces real knowledge gaps honestly\n• Stops plausible-sounding but wrong answers",
  },
  {
    id: "separator",
    emoji: "─",
    label: "Separator",
    color: "#64748B",
    glow: "#64748B33",
    text: "\n---\n",
  },
];


// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCaretIndex(el, clientX, clientY) {
  // Use caretPositionFromPoint or caretRangeFromPoint to find insert position
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    return pos ? pos.offset : el.value.length;
  }
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(clientX, clientY);
    return range ? range.startOffset : el.value.length;
  }
  return el.value.length;
}

function getTextareaInsertIndex(textarea, clientX, clientY) {
  // Clone textarea as a div to measure character positions
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  mirror.style.cssText = `
    position: fixed; visibility: hidden; pointer-events: none;
    top: ${textarea.getBoundingClientRect().top}px;
    left: ${textarea.getBoundingClientRect().left}px;
    width: ${textarea.clientWidth}px;
    height: ${textarea.clientHeight}px;
    padding: ${style.padding};
    font: ${style.font};
    font-size: ${style.fontSize};
    font-family: ${style.fontFamily};
    line-height: ${style.lineHeight};
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: scroll;
    box-sizing: border-box;
  `;

  const text = textarea.value;
  let bestIndex = text.length;
  let bestDist = Infinity;

  // We'll use a simpler approach: use range/caret APIs on a hidden contenteditable
  const div = document.createElement("div");
  div.setAttribute("contenteditable", "true");
  div.style.cssText = mirror.style.cssText + `
    background: transparent; color: transparent; z-index: -9999;
    overflow: hidden;
  `;
  // Escape HTML
  div.innerText = text;
  document.body.appendChild(div);

  try {
    const range = document.caretRangeFromPoint
      ? document.caretRangeFromPoint(clientX, clientY)
      : null;

    if (range && div.contains(range.startContainer)) {
      // Walk the text nodes to compute offset
      let offset = 0;
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node === range.startContainer) {
          bestIndex = offset + range.startOffset;
          break;
        }
        offset += node.textContent.length;
      }
    } else {
      // Fallback: nearest line heuristic
      const rect = textarea.getBoundingClientRect();
      const relY = clientY - rect.top + textarea.scrollTop;
      const relX = clientX - rect.left;
      const lineH = parseInt(style.lineHeight) || 20;
      const lineIndex = Math.floor(relY / lineH);
      const lines = text.split("\n");
      let charOffset = 0;
      for (let i = 0; i < Math.min(lineIndex, lines.length - 1); i++) {
        charOffset += lines[i].length + 1;
      }
      const lineText = lines[Math.min(lineIndex, lines.length - 1)] || "";
      const charsPerPx = lineText.length / (textarea.clientWidth - 32) || 0.1;
      const charInLine = Math.round(relX * charsPerPx);
      bestIndex = charOffset + Math.min(charInLine, lineText.length);
    }
  } finally {
    document.body.removeChild(div);
  }

  return Math.max(0, Math.min(bestIndex, text.length));
}

// ─── Block Card Component ─────────────────────────────────────────────────────

function BlockCard({ block, onDragStart }) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("blockId", block.id);
        e.dataTransfer.effectAllowed = "copy";
        // Custom drag image
        const ghost = document.createElement("div");
        ghost.textContent = `${block.emoji} ${block.label}`;
        ghost.style.cssText = `
          position:fixed; top:-200px; left:-200px;
          background:${block.color}; color:#fff; padding:8px 14px;
          border-radius:8px; font:700 13px/1 'IBM Plex Mono',monospace;
          white-space:nowrap; box-shadow:0 4px 20px ${block.glow};
          pointer-events:none;
        `;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 60, 20);
        setTimeout(() => document.body.removeChild(ghost), 0);
        onDragStart(block.id);
        setIsPressed(true);
      }}
      onDragEnd={() => setIsPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 13px",
        marginBottom: 0,
        borderRadius: 10,
        border: `1.5px solid ${block.color}55`,
        background: isPressed
          ? block.color + "33"
          : `linear-gradient(135deg, ${block.color}18, ${block.color}08)`,
        cursor: "grab",
        userSelect: "none",
        transition: "all 0.15s ease",
        transform: isPressed ? "scale(0.97)" : "scale(1)",
        boxShadow: isPressed ? `0 0 0 2px ${block.color}66` : "none",
      }}
      onMouseEnter={(e) => {
        if (!isPressed) {
          e.currentTarget.style.background = `linear-gradient(135deg, ${block.color}30, ${block.color}15)`;
          e.currentTarget.style.borderColor = block.color + "99";
          e.currentTarget.style.transform = "translateX(3px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isPressed) {
          e.currentTarget.style.background = `linear-gradient(135deg, ${block.color}18, ${block.color}08)`;
          e.currentTarget.style.borderColor = block.color + "55";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{block.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: block.color, letterSpacing: 0.3 }}>
          {block.label}
        </div>
      </div>
      {/* "Why?" icon — only on built-in blocks that have a why explanation */}
      {block.why && (
        <span
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
          draggable={false}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 15, height: 15, borderRadius: "50%",
            border: `1px solid ${block.color}88`, color: block.color,
            fontSize: 8, fontWeight: 700, cursor: "default",
            userSelect: "none", flexShrink: 0, letterSpacing: 0,
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const tip = document.getElementById("why-block-tooltip");
            if (tip) {
              tip.style.top  = (rect.bottom + 6) + "px";
              tip.style.left = Math.max(8, rect.right - 280) + "px";
              tip.style.borderColor = block.color + "99";
              tip.innerText = block.why;
              tip.style.display = "block";
            }
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            const tip = document.getElementById("why-block-tooltip");
            if (tip) tip.style.display = "none";
          }}
        >
          ?
        </span>
      )}
    </div>
  );
}

// ─── Block Model Helpers ──────────────────────────────────────────────────────

let _blkSeq = 0;
const makeBlockId = () => `blk-${Date.now()}-${++_blkSeq}`;

const makeFreeBlock = (text = "") => ({
  id: makeBlockId(),
  blockId: null,
  label: null,
  color: null,
  text,
});

const makeNamedBlock = (tpl) => ({
  id: makeBlockId(),
  blockId: tpl.id,
  label: tpl.label,
  color: tpl.color,
  text: tpl.text,
});

// ─── BlockRow Component ───────────────────────────────────────────────────────
// One block in the block-based prompt editor.
// Owns its own contenteditable div + a left colour-strip segment.

const BLOCK_PH_RE = /\[[A-Z][A-Z0-9_/ ]*\]/g;

function buildBlockHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(new RegExp(BLOCK_PH_RE.source, "g"),
      (m) => `<span class="ph-chip" data-ph="${m}">${m}</span>`);
}

function extractBlockText(el) {
  let t = "";
  const walk = (n) => {
    if (n.nodeType === Node.TEXT_NODE) { t += n.textContent; return; }
    if (n.nodeType === Node.ELEMENT_NODE) {
      if (n.tagName === "BR") { t += "\n"; return; }
      if (n.tagName === "DIV" && t.length > 0 && !t.endsWith("\n")) t += "\n";
      n.childNodes.forEach(walk);
    }
  };
  walk(el);
  return t.replace(/\n$/, "");
}

function readCaretInDiv(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return el.textContent.length;
  let offset = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node.tagName === "DIV" || node.tagName === "BR") && offset > 0) offset += 1;
      continue;
    }
    if (node === range.startContainer) return offset + range.startOffset;
    offset += node.textContent.length;
  }
  return el.textContent.length;
}

function BlockRow({
  block, sk,
  onTextChange, onEnterAtStart, onEnterAtEnd, onBackspaceAtStart,
  onPlaceholderClick, onDismissPlaceholder, onFocus,
  divRef: externalDivRef,
}) {
  const divRef = useRef(null);
  const setRef = (el) => {
    divRef.current = el;
    if (externalDivRef) externalDivRef.current = el;
  };

  // Keep DOM in sync when block.text changes externally (drop, undo, load…)
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const html = buildBlockHtml(block.text);
    if (el.innerHTML !== html) {
      const sel = window.getSelection();
      el.innerHTML = html;
      // restore caret to end after rewrite
      if (sel && document.activeElement === el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.text]);

  return (
    <div style={{ display: "flex", position: "relative", minHeight: 27 }}>
      {/* Colour-strip segment — tooltip shows block label */}
      <div
        title={block.label || undefined}
        style={{
          width: 4,
          flexShrink: 0,
          alignSelf: "stretch",
          background: block.color || "transparent",
          borderRadius: 2,
          marginRight: 8,
          opacity: block.color ? 1 : 0,
          cursor: block.label ? "default" : "auto",
          transition: "opacity 0.15s",
        }}
      />
      {/* Contenteditable for this block */}
      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-block-id={block.id}
        style={{
          flex: 1,
          outline: "none",
          minHeight: 24,
          fontSize: 13.5,
          lineHeight: 1.8,
          fontFamily: "'IBM Plex Mono', monospace",
          color: sk.editorText,
          caretColor: sk.caret,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        onFocus={() => onFocus && onFocus(block.id)}
        onClick={(e) => {
          const span = e.target.closest?.(".ph-chip");
          if (span) onPlaceholderClick(e, span, block.id);
          else onDismissPlaceholder && onDismissPlaceholder();
        }}
        onInput={(e) => {
          const newText = extractBlockText(e.currentTarget);
          if (newText !== block.text) onTextChange(block.id, newText);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            const caret = readCaretInDiv(divRef.current);
            const len = block.text.length;
            if (len > 0 && caret === 0) {
              // Enter at very start → insert free block BEFORE this one
              e.preventDefault();
              onEnterAtStart(block.id);
            } else if (caret >= len) {
              // Enter at or after end → new free block AFTER
              e.preventDefault();
              onEnterAtEnd(block.id);
            }
            // caret in middle: let browser add a line within this block
          }
          if (e.key === "Backspace") {
            if (readCaretInDiv(divRef.current) === 0) {
              // Backspace at first character: FORBIDDEN per spec
              e.preventDefault();
              onBackspaceAtStart(block.id);
            }
          }
        }}
      />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function PromptStudio() {
  // ── Block model ───────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState(() => [makeFreeBlock()]);
  // promptText is derived from blocks — kept for export, copy, health-score, etc.
  const promptText = useMemo(() => blocks.map((b) => b.text).join("\n"), [blocks]);
  // Stable ref so async callbacks can read current blocks without stale closures
  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  // blockDivRefs: block.id → the contenteditable DOM element
  const blockDivRefs = useRef({});
  // Which block currently has focus (used by drop handler)
  const focusedBlockId = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [insertedFlash, setInsertedFlash] = useState(null); // {blockId, ts}
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(null); // {x,y}
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [undoBounce, setUndoBounce] = useState(false);
  const [redoBounce, setRedoBounce] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState([]); // [{id, name, text, savedAt, projectId}]
  const [projects, setProjects] = useState([]);          // [{id, name, color}]
  const [exportFlash, setExportFlash] = useState(false); // brief green flash on export
  const [skin, setSkin] = useState("black"); // "black" | "white" | "grey"
  const [showGallery, setShowGallery] = useState(false);  // Template Gallery modal
  const [gallerySelectedId, setGallerySelectedId] = useState("summarise"); // selected template id
  const [galleryTab, setGalleryTab] = useState("example"); // "example" | "template"
  const [showExportMenu, setShowExportMenu] = useState(false); // export format dropdown
  const [customBlocks, setCustomBlocks] = useState([]); // [{id, label, emoji, color, text}]
  const [builtInFolded, setBuiltInFolded] = useState(true);
  const [customFolded, setCustomFolded] = useState(true);
  const [unsavedBlocks, setUnsavedBlocks] = useState(false); // true if custom blocks have unsaved changes
  const [showBlocksLoadConfirm, setShowBlocksLoadConfirm] = useState(false); // confirm before overwriting custom blocks
  const [pendingBlocksLoad, setPendingBlocksLoad] = useState(null); // parsed blocks array waiting for confirmation
  const [blocksLoadError, setBlocksLoadError] = useState(""); // validation error message
  const [showNewBlockModal, setShowNewBlockModal] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null); // null = create mode, id = edit mode
  const [nbLabel, setNbLabel] = useState("");
  const [nbEmoji, setNbEmoji] = useState("✨");
  const [nbColor, setNbColor] = useState("#7C3AED");
  const [nbText, setNbText] = useState("");
  // Custom block reorder drag state
  const [reorderDragId, setReorderDragId] = useState(null);  // block id being reordered
  const [reorderOverId, setReorderOverId] = useState(null);  // block id currently hovered
  // Inline placeholder substitution
  const [activePlaceholder, setActivePlaceholder] = useState(null); // {index, placeholder, rect}
  const [placeholderInput, setPlaceholderInput] = useState("");
  const placeholderInputRef = useRef(null);
  const [placeholderNavIdx, setPlaceholderNavIdx] = useState(0); // cycling index for the progress bar counter click
  const editorRef = useRef(null);   // editor container div (for drop zone bounds)
  const dropZoneRef = useRef(null);

  useEffect(() => {
    const words = promptText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(promptText ? words : 0);
    setCharCount(promptText.length);
  }, [promptText]);

  // ── Focus helpers ─────────────────────────────────────────────────────────
  const focusFirstBlock = useCallback(() => {
    const bs = blocksRef.current;
    if (bs.length > 0) blockDivRefs.current[bs[0].id]?.focus();
  }, []);

  const focusLastBlock = useCallback(() => {
    const bs = blocksRef.current;
    if (bs.length > 0) blockDivRefs.current[bs[bs.length - 1].id]?.focus();
  }, []);

  // ── Undo / Redo — snapshots are Block[] arrays ────────────────────────────
  const pushUndo = useCallback((blocksSnapshot) => {
    setUndoStack((prev) => [...prev.slice(-49), blocksSnapshot]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const restored = next.pop();
      setBlocks((current) => {
        setRedoStack((r) => [...r.slice(-49), current]);
        return restored;
      });
      setUndoBounce(true);
      setTimeout(() => setUndoBounce(false), 350);
      setTimeout(() => {
        const id = restored[0]?.id;
        if (id) blockDivRefs.current[id]?.focus();
      }, 20);
      return next;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const restored = next.pop();
      setBlocks((current) => {
        setUndoStack((u) => [...u.slice(-49), current]);
        return restored;
      });
      setRedoBounce(true);
      setTimeout(() => setRedoBounce(false), 350);
      setTimeout(() => {
        const id = restored[0]?.id;
        if (id) blockDivRefs.current[id]?.focus();
      }, 20);
      return next;
    });
  }, []);

  // ── Block operations ──────────────────────────────────────────────────────

  // Update text of one block; delete it if emptied (keep minimum 1 block)
  const updateBlockText = useCallback((id, text) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      if (!text) {
        if (prev.length > 1) {
          // Block emptied and not the only block → delete it, focus neighbour
          const neighbour = prev[idx - 1] || prev[idx + 1];
          setTimeout(() => {
            if (neighbour) blockDivRefs.current[neighbour.id]?.focus();
          }, 10);
          return prev.filter((b) => b.id !== id);
        }
        // Only block: strip colour/label so the colour strip disappears
        const next = [...prev];
        next[idx] = { ...next[idx], blockId: null, label: null, color: null, text: "" };
        return next;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  }, []);

  // Enter at end of block → new free block inserted after
  const handleEnterAtEnd = useCallback((blockId) => {
    const nb = makeFreeBlock();
    setBlocks((prev) => {
      pushUndo(prev);
      setRedoStack([]);
      const idx = prev.findIndex((b) => b.id === blockId);
      const next = [...prev];
      next.splice(idx + 1, 0, nb);
      return next;
    });
    setTimeout(() => blockDivRefs.current[nb.id]?.focus(), 20);
  }, [pushUndo]);

  // Enter before first char of block → new free block inserted before
  const handleEnterAtStart = useCallback((blockId) => {
    const nb = makeFreeBlock();
    setBlocks((prev) => {
      pushUndo(prev);
      setRedoStack([]);
      const idx = prev.findIndex((b) => b.id === blockId);
      const next = [...prev];
      next.splice(idx, 0, nb);
      return next;
    });
    setTimeout(() => blockDivRefs.current[nb.id]?.focus(), 20);
  }, [pushUndo]);

  // Backspace at first char → forbidden per spec; do nothing
  const handleBackspaceAtStart = useCallback(() => {}, []);

  // Drop a template block: insert named block after the currently focused block
  const handleBlockDrop = useCallback((templateBlockId) => {
    const tpl = [...customBlocks, ...BLOCKS].find((b) => b.id === templateBlockId);
    if (!tpl) return;
    const nb = makeNamedBlock(tpl);
    setBlocks((prev) => {
      pushUndo(prev);
      setRedoStack([]);
      const focId = focusedBlockId.current;
      const idx = focId ? prev.findIndex((b) => b.id === focId) : prev.length - 1;
      const insertAfter = idx === -1 ? prev.length - 1 : idx;
      const next = [...prev];
      // If the currently focused block is an empty free block, replace it
      if (focId && prev[insertAfter]?.blockId === null && prev[insertAfter]?.text === "") {
        next[insertAfter] = nb;
        return next;
      }
      next.splice(insertAfter + 1, 0, nb);
      return next;
    });
    setActivePlaceholder(null);
    setInsertedFlash({ blockId: templateBlockId, ts: Date.now() });
    setTimeout(() => setInsertedFlash(null), 800);
    setTimeout(() => blockDivRefs.current[nb.id]?.focus(), 20);
  }, [customBlocks, pushUndo]);

  // Placeholder clicked inside a BlockRow
  const handlePlaceholderClick = useCallback((e, span, blockId) => {
    e.preventDefault();
    const rect = span.getBoundingClientRect();
    const containerRect = dropZoneRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setActivePlaceholder({
      blockId,
      placeholder: span.dataset.ph,
      x: rect.left - containerRect.left,
      y: rect.bottom - containerRect.top + 6,
      spanRect: rect,
    });
    setPlaceholderInput("");
    setTimeout(() => placeholderInputRef.current?.focus(), 30);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
    setDropIndicator({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDropIndicator(null);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const templateBlockId = e.dataTransfer.getData("blockId");
    setIsDragOver(false);
    setActiveBlockId(null);
    setDropIndicator(null);
    if (templateBlockId) handleBlockDrop(templateBlockId);
  }, [handleBlockDrop]);

  const clearAll = () => {
    if (blocks.length > 0 && blocks.some((b) => b.text)) pushUndo(blocks);
    const empty = makeFreeBlock();
    setBlocks([empty]);
    setActivePlaceholder(null);
    setTimeout(() => blockDivRefs.current[empty.id]?.focus(), 10);
  };

  const copyPrompt = () => {
    if (!promptText) return;

    // Capture any selected text from the contenteditable before focus changes
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && sel.toString().length > 0;
    const textToCopy = hasSelection ? sel.toString() : promptText;

    const succeed = () => { setCopied(true);    setTimeout(() => setCopied(false), 2000); };
    const fail    = () => { setCopied("error"); setTimeout(() => setCopied(false), 2000); };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).then(succeed).catch(() => {
        execCommandCopy(textToCopy) ? succeed() : fail();
      });
      return;
    }
    execCommandCopy(textToCopy) ? succeed() : fail();
  };

  // document.execCommand fallback — creates a temporary textarea off-screen
  const execCommandCopy = (text) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      // Restore focus to the focused block
      setTimeout(() => focusLastBlock(), 10);
      return ok;
    } catch {
      return false;
    }
  };

  const activeBlock = [...customBlocks, ...BLOCKS].find((b) => b.id === activeBlockId);

  // ── Persist library + projects to localStorage ───────────────────────────
  const STORAGE_KEY = "prompt_studio_library";
  const PROJECTS_KEY = "prompt_studio_projects";
  const BLOCKS_KEY = "prompt_studio_blocks";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedPrompts(JSON.parse(stored));
      const storedProjects = localStorage.getItem(PROJECTS_KEY);
      if (storedProjects) setProjects(JSON.parse(storedProjects));
      const storedBlocks = localStorage.getItem(BLOCKS_KEY);
      if (storedBlocks) setCustomBlocks(JSON.parse(storedBlocks));
    } catch { /* ignore corrupt data */ }
  }, []);

  // Warn before closing if there are unsaved blocks
  useEffect(() => {
    const handler = (e) => {
      if (unsavedBlocks) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsavedBlocks]);

  const persistLibrary = (list) => {
    setSavedPrompts(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* quota */ }
  };

  const persistProjects = (list) => {
    setProjects(list);
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); } catch { /* quota */ }
  };

  // ── Custom block helpers ──────────────────────────────────────────────────

  // Serialize a block to .block file format (JSON)
  const blockToFileContent = (block) => JSON.stringify({
    version: "1.0",
    label: block.label,
    emoji: block.emoji,
    color: block.color,
    text: block.text,
  }, null, 2);

  // Save all custom blocks to a folder as *.block files via File System Access API
  const blocksFileInputRef = useRef(null);

  const saveBlocksToFolder = (blocks) => {
    const payload = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      blocks: blocks.map((b) => ({ label: b.label, emoji: b.emoji, color: b.color, text: b.text })),
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blocks.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setUnsavedBlocks(false);
  };

  const handleBlocksFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBlocksLoadError("");
    try {
      const raw = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setBlocksLoadError("Cannot load blocks from the file — the file is not valid JSON.");
        return;
      }

      // Accept either {blocks:[...]} wrapper or a bare array
      const candidates = Array.isArray(parsed) ? parsed : Array.isArray(parsed.blocks) ? parsed.blocks : null;

      if (!candidates || candidates.length === 0) {
        setBlocksLoadError("Cannot load blocks from the file — no block entries found.");
        return;
      }

      // Each entry must have at least a non-empty label and text field
      const valid = candidates.filter((b) =>
        b && typeof b === "object" &&
        typeof b.label === "string" && b.label.trim() !== "" &&
        typeof b.text === "string" && b.text.trim() !== ""
      );

      if (valid.length === 0) {
        setBlocksLoadError("Cannot load block/blocks from the file — entries are missing required fields (label, text).");
        return;
      }

      const arr = valid.map((b, i) => ({
        id: `custom-${Date.now()}-${i}`,
        label: b.label.trim(),
        emoji: b.emoji || "✨",
        color: b.color || "#7C3AED",
        glow: (b.color || "#7C3AED") + "44",
        text: b.text,
        isCustom: true,
      }));

      if (customBlocks.length > 0) {
        setPendingBlocksLoad(arr);
        setShowBlocksLoadConfirm(true);
      } else {
        setCustomBlocks(arr);
        try { localStorage.setItem("prompt_studio_blocks", JSON.stringify(arr)); } catch { /* quota */ }
      }
    } catch (err) {
      console.error("Failed to load blocks.json:", err);
      setBlocksLoadError("Cannot load blocks from the file — an unexpected error occurred.");
    }
  };

  const confirmBlocksLoad = () => {
    const arr = pendingBlocksLoad;
    setCustomBlocks(arr);
    try { localStorage.setItem("prompt_studio_blocks", JSON.stringify(arr)); } catch { /* quota */ }
    setPendingBlocksLoad(null);
    setShowBlocksLoadConfirm(false);
  };

  // Add a new custom block from the modal form
  const confirmNewBlock = () => {
    if (!nbLabel.trim() || !nbText.trim()) return;
    const newBlock = {
      id: `custom-${Date.now()}`,
      label: nbLabel.trim(),
      emoji: nbEmoji || "✨",
      color: nbColor,
      glow: nbColor + "44",
      text: nbText,
      isCustom: true,
    };
    const updated = [newBlock, ...customBlocks];
    setCustomBlocks(updated);
    // Persist to localStorage immediately
    try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(updated)); } catch { /* quota */ }
    setUnsavedBlocks(true);
    setShowNewBlockModal(false);
    setNbLabel(""); setNbEmoji("✨"); setNbColor("#7C3AED"); setNbText("");
  };

  const confirmEditBlock = () => {
    if (!nbLabel.trim() || !nbText.trim()) return;
    const updated = customBlocks.map((b) =>
      b.id === editingBlockId
        ? { ...b, label: nbLabel.trim(), emoji: nbEmoji || "✨", color: nbColor, glow: nbColor + "44", text: nbText }
        : b
    );
    setCustomBlocks(updated);
    try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(updated)); } catch { /* quota */ }
    setUnsavedBlocks(true);
    setShowNewBlockModal(false);
    setEditingBlockId(null);
    setNbLabel(""); setNbEmoji("✨"); setNbColor("#7C3AED"); setNbText("");
  };

  // Delete a custom block
  const deleteCustomBlock = (id) => {
    const updated = customBlocks.filter((b) => b.id !== id);
    setCustomBlocks(updated);
    try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(updated)); } catch { /* quota */ }
    setUnsavedBlocks(true);
  };

  // Reorder: drop dragId block onto overId position
  const reorderCustomBlocks = (dragId, overId) => {
    if (!dragId || !overId || dragId === overId) return;
    const arr = [...customBlocks];
    const fromIdx = arr.findIndex((b) => b.id === dragId);
    const toIdx   = arr.findIndex((b) => b.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setCustomBlocks(arr);
    try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(arr)); } catch { /* quota */ }
    setUnsavedBlocks(true);
  };

  // ── Inline placeholder substitution ──────────────────────────────────────

  const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9_/ ]*\]/g;

  const getPlaceholders = (text) => {
    const results = [];
    const re = new RegExp(PLACEHOLDER_RE.source, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      results.push({ index: m.index, placeholder: m[0], length: m[0].length });
    }
    return results;
  };

  // Commit placeholder substitution — updates the specific block that contains it
  const commitPlaceholder = () => {
    if (!activePlaceholder) return;
    const { blockId, placeholder } = activePlaceholder;
    const val = placeholderInput;
    if (!val) { setActivePlaceholder(null); return; }
    pushUndo(blocksRef.current);
    setBlocks((prev) => prev.map((b) =>
      b.id === blockId ? { ...b, text: b.text.replace(placeholder, val) } : b
    ));
    setActivePlaceholder(null);
    setPlaceholderInput("");
    setTimeout(() => blockDivRefs.current[blockId]?.focus(), 10);
  };

  // ── Export prompt as .prompt file ─────────────────────────────────────────
  const handleExport = async () => {
    if (!promptText.trim()) return;

    // Build the .prompt file payload
    const payload = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      wordCount: promptText.trim().split(/\s+/).filter(Boolean).length,
      text: promptText,
    }, null, 2);

    const blob = new Blob([payload], { type: "application/json" });

    // Derive a default filename from the first meaningful words
    const suggested = "Template.prompt";

    // Primary path: File System Access API (shows native Save As dialog)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{
            description: "Prompt file",
            accept: { "application/json": [".prompt"] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setExportFlash(true);
        setTimeout(() => setExportFlash(false), 1400);
        return;
      } catch (err) {
        // User cancelled the dialog — do nothing
        if (err.name === "AbortError") return;
        // Other error — fall through to download fallback
      }
    }

    // Fallback: programmatic <a> download (no dialog, straight to Downloads)
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggested;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 1400);
  };

  // ── Export format builders ────────────────────────────────────────────────
  const EXPORT_FORMATS = [
    {
      id: "prompt",
      label: ".prompt JSON",
      icon: "📄",
      desc: "Prompt Studio native format",
      ext: ".prompt",
      mime: "application/json",
      build: (text) => JSON.stringify({
        version: "1.0",
        exportedAt: new Date().toISOString(),
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        text,
      }, null, 2),
    },
    {
      id: "python",
      label: "Python string",
      icon: "🐍",
      desc: "Escaped string literal for Python code",
      ext: ".py",
      mime: "text/plain",
      build: (text) => {
        const escaped = text
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n");
        return `prompt = "${escaped}"\n`;
      },
    },
    {
      id: "openai",
      label: "OpenAI / Anthropic messages",
      icon: "🤖",
      desc: "JSON messages array for API calls",
      ext: ".json",
      mime: "application/json",
      build: (text) => JSON.stringify([
        { role: "system", content: text }
      ], null, 2),
    },
    {
      id: "markdown",
      label: "Markdown documentation",
      icon: "📝",
      desc: "Formatted .md file for docs / wikis",
      ext: ".md",
      mime: "text/markdown",
      build: (text) => {
        const date = new Date().toISOString().slice(0, 10);
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        return `# Prompt\n\n> Exported from Prompt Studio on ${date}  \n> ${words} words\n\n---\n\n${text}\n`;
      },
    },
    {
      id: "system",
      label: "System prompt block",
      icon: "📋",
      desc: "Copy-paste ready — just paste into any chat UI",
      ext: ".txt",
      mime: "text/plain",
      build: (text) => `--- SYSTEM PROMPT ---\n${text}\n--- END SYSTEM PROMPT ---\n`,
    },
  ];

  const handleExportAs = async (fmt) => {
    if (!promptText.trim()) return;
    setShowExportMenu(false);
    const content = fmt.build(promptText);
    const blob = new Blob([content], { type: fmt.mime });
    const suggested = `Template${fmt.ext}`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: fmt.label, accept: { [fmt.mime]: [fmt.ext] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setExportFlash(true);
        setTimeout(() => setExportFlash(false), 1400);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggested;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 1400);
  };


  const handleDeleteSaved = (id, e) => {
    e.stopPropagation();
    persistLibrary(savedPrompts.filter((p) => p.id !== id));
  };

  // ── Load a .prompt file from the user's machine via <input type="file"> ──
  const fileInputRef = useRef(null);

  const handleFileInputChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = await file.text();
      let text = raw;
      try {
        const parsed = JSON.parse(raw);
        text = parsed.text ?? raw;
      } catch {
        // Not valid JSON — use raw content as-is
      }
      pushUndo(blocksRef.current);
      const loaded = makeFreeBlock(text);
      setBlocks([loaded]);
      setTimeout(() => blockDivRefs.current[loaded.id]?.focus(), 20);
    } catch (err) {
      console.error("Failed to load .prompt file:", err);
    } finally {
      e.target.value = "";
    }
  };


  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // ── Skin tokens ────────────────────────────────────────────────────────────
  const SKINS = {
    black: {
      appBg:        "#0A0E1A",
      headerBg:     "linear-gradient(180deg, #0F1428 0%, #0A0E1A 100%)",
      headerBorder: "#252D42",
      sidebarBg:    "#0C101E",
      cardBg:       "#0A0E1A",
      card2Bg:      "#0F1428",
      panelBg:      "#0B0F1F",
      border:       "#252D42",
      border2:      "#374457",
      text:         "#E2E8F0",
      textMuted:    "#9AA3B0",
      textDim:      "#8B95A8",
      textFaint:    "#374151",
      inputBg:      "#0A0E1A",
      scrollBg:     "#0C101E",
      scrollThumb:  "#374457",
      modalBg:      "#0F1428",
      accentStats:  "#A78BFA",
      arrowColor:   "#1B2235",
      dropZoneBg:   "#0A0E1A",
      caret:        "#A78BFA",
      editorText:   "#D1D5DB",
    },
    white: {
      appBg:        "#FFFFFF",
      headerBg:     "linear-gradient(180deg, #F8F9FA 0%, #FFFFFF 100%)",
      headerBorder: "#DEE2E6",
      sidebarBg:    "#F1F3F5",
      cardBg:       "#FFFFFF",
      card2Bg:      "#F8F9FA",
      panelBg:      "#F8F9FA",
      border:       "#DEE2E6",
      border2:      "#CED4DA",
      text:         "#212529",
      textMuted:    "#495057",
      textDim:      "#6C757D",
      textFaint:    "#ADB5BD",
      inputBg:      "#FFFFFF",
      scrollBg:     "#F1F3F5",
      scrollThumb:  "#CED4DA",
      modalBg:      "#FFFFFF",
      accentStats:  "#6D28D9",
      arrowColor:   "#DEE2E6",
      dropZoneBg:   "#FFFFFF",
      caret:        "#6D28D9",
      editorText:   "#0A0A0A",
    },
    grey: {
      appBg:        "#2B2D31",
      headerBg:     "linear-gradient(180deg, #313338 0%, #2B2D31 100%)",
      headerBorder: "#3F4147",
      sidebarBg:    "#2B2D31",
      cardBg:       "#2B2D31",
      card2Bg:      "#313338",
      panelBg:      "#313338",
      border:       "#3F4147",
      border2:      "#4E5058",
      text:         "#DBDEE1",
      textMuted:    "#B5BAC1",
      textDim:      "#949BA4",
      textFaint:    "#6D6F78",
      inputBg:      "#1E1F22",
      scrollBg:     "#2B2D31",
      scrollThumb:  "#4E5058",
      modalBg:      "#313338",
      accentStats:  "#C4A8FF",
      arrowColor:   "#3F4147",
      dropZoneBg:   "#2B2D31",
      caret:        "#C4A8FF",
      editorText:   "#DBDEE1",
    },
  };
  const sk = SKINS[skin];

  return (
    <div
      style={{
        height: "100%",
        background: sk.appBg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
        color: sk.text,
        overflow: "hidden",
      }}
    >
      {/* Google Font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap" />
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: #7C3AED55; color: ${sk.text}; }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${sk.scrollBg}; }
        ::-webkit-scrollbar-thumb { background: ${sk.scrollThumb}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${sk.border2}; }

        @keyframes undoBounce {
          0%   { transform: rotate(0deg) scale(1); }
          30%  { transform: rotate(-30deg) scale(1.15); }
          60%  { transform: rotate(10deg) scale(0.95); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes blockInsert {
          0% { background: #7C3AED33; }
          50% { background: #7C3AED22; }
          100% { background: transparent; }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 #7C3AED33; }
          50% { box-shadow: 0 0 0 8px #7C3AED00; }
        }
        .drop-zone-active {
          animation: pulse-glow 1.2s ease infinite;
        }
        .block-card-dragging {
          opacity: 0.5 !important;
          transform: scale(0.95) !important;
        }
        .ph-chip {
          background: #F59E0B28;
          color: #F59E0B;
          border-radius: 4px;
          padding: 1px 2px;
          cursor: pointer;
          border-bottom: 1.5px dashed #F59E0B99;
          transition: background 0.15s, color 0.15s;
        }
        .ph-chip:hover {
          background: #F59E0B44;
          color: #FCD34D;
        }
      `}</style>

      {/* ── Header ── */}
      <header
        style={{
          borderBottom: `1px solid ${sk.headerBorder}`,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          background: sk.headerBg,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ✦
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                background: "linear-gradient(90deg, #E2E8F0 0%, #A78BFA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: -0.5,
                paddingBottom: 3,
              }}
            >
              Prompt / Content Engineering Studio
            </h1>
            <span style={{ fontSize: 10, fontWeight: 400, color: sk.textMuted, letterSpacing: 0.3 }}>v{APP_VERSION}</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: sk.textMuted, letterSpacing: 0.5 }}>
            REDUCE AI HALLUCINATION
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Stats */}
          {promptText && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginRight: 8,
                animation: "fadeSlideIn 0.2s ease",
              }}
            >
              {[
                { v: wordCount, l: "words" },
                { v: charCount, l: "chars" },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: sk.accentStats,
                      lineHeight: 1,
                    }}
                  >
                    {s.v}
                  </div>
                  <div style={{ fontSize: 10, color: sk.textMuted, letterSpacing: 0.5 }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={copyPrompt}
            disabled={!promptText}
            style={{
              background: copied === "error" ? "#EF4444" : copied ? "#10B981" : sk.border,
              color: copied ? "#fff" : sk.textMuted,
              border: `1px solid ${copied === "error" ? "#EF4444" : copied ? "#10B981" : sk.border2}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: promptText ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "all 0.2s",
              opacity: promptText ? 1 : 0.4,
              letterSpacing: 0.3,
            }}
          >
            {copied === "error" ? "✕ FAILED" : copied ? "✓ COPIED" : "📋 COPY"}
          </button>
          <button
            onClick={clearAll}
            disabled={!promptText}
            style={{
              background: "transparent",
              color: sk.textMuted,
              border: `1px solid ${sk.border}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: promptText ? 1 : 0.4,
              letterSpacing: 0.3,
            }}
          >
            CLEAR
          </button>

          {/* ── Skin switcher ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
            {[
              { key: "black", label: "●", title: "Black",  bg: "#0A0E1A", ring: "#A78BFA" },
              { key: "white", label: "●", title: "White",  bg: "#FFFFFF",  ring: "#6D28D9" },
              { key: "grey",  label: "●", title: "Grey",   bg: "#2B2D31",  ring: "#C4A8FF" },
            ].map((s) => (
              <button
                key={s.key}
                title={`${s.title} skin`}
                onClick={() => setSkin(s.key)}
                style={{
                  width: 16, height: 16,
                  borderRadius: "50%",
                  background: s.bg,
                  border: skin === s.key
                    ? `2px solid ${s.ring}`
                    : `2px solid ${sk.border2}`,
                  cursor: "pointer",
                  padding: 0,
                  transition: "all 0.2s",
                  transform: skin === s.key ? "scale(1.3)" : "scale(1)",
                  boxShadow: skin === s.key ? `0 0 0 1px ${s.ring}55` : "none",
                  outline: "none",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* ── Divider ── */}
          <div style={{ width: 1, height: 22, background: sk.border, margin: "0 4px" }} />

          {/* ── Export split button ── */}
          <div style={{ position: "relative", display: "inline-flex" }}>
            {/* Main label — clicking opens format menu */}
            <button
              onClick={() => { if (promptText) setShowExportMenu(v => !v); }}
              disabled={!promptText}
              style={{
                background: exportFlash ? "#10B981" : sk.card2Bg,
                color: exportFlash ? "#fff" : "#34D399",
                border: `1px solid ${exportFlash ? "#10B981" : "#34D39944"}`,
                borderRadius: "8px 0 0 8px",
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: promptText ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all 0.2s",
                opacity: promptText ? 1 : 0.4,
                letterSpacing: 0.3,
                borderRight: "none",
              }}
              onMouseEnter={(e) => {
                if (promptText && !exportFlash) {
                  e.currentTarget.style.background = "#34D39922";
                  e.currentTarget.style.borderColor = "#34D399";
                }
              }}
              onMouseLeave={(e) => {
                if (!exportFlash) {
                  e.currentTarget.style.background = sk.card2Bg;
                  e.currentTarget.style.borderColor = "#34D39944";
                }
              }}
            >
              {exportFlash ? "✓ EXPORTED" : "⬇ EXPORT"}
            </button>
            {/* Chevron / caret */}
            <button
              onClick={() => { if (promptText) setShowExportMenu(v => !v); }}
              disabled={!promptText}
              title="Choose export format"
              style={{
                background: exportFlash ? "#10B981" : sk.card2Bg,
                color: exportFlash ? "#fff" : "#34D399",
                border: `1px solid ${exportFlash ? "#10B981" : "#34D39944"}`,
                borderRadius: "0 8px 8px 0",
                padding: "7px 7px",
                fontSize: 10,
                fontWeight: 700,
                cursor: promptText ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all 0.2s",
                opacity: promptText ? 1 : 0.4,
                borderLeft: `1px solid ${exportFlash ? "#10B98188" : "#34D39922"}`,
              }}
              onMouseEnter={(e) => {
                if (promptText && !exportFlash) {
                  e.currentTarget.style.background = "#34D39922";
                }
              }}
              onMouseLeave={(e) => {
                if (!exportFlash) e.currentTarget.style.background = sk.card2Bg;
              }}
            >
              {showExportMenu ? "▲" : "▼"}
            </button>

            {/* ── Format dropdown ── */}
            {showExportMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: sk.card2Bg,
                  border: `1px solid ${sk.border}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 32px #0008",
                  zIndex: 9999,
                  minWidth: 270,
                  overflow: "hidden",
                }}
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div style={{ padding: "8px 12px 4px", fontSize: 10, color: sk.textFaint, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  Export as…
                </div>
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => handleExportAs(fmt)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      borderTop: `1px solid ${sk.border}`,
                      padding: "9px 14px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      color: sk.text,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = sk.card3Bg || "#ffffff18"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{fmt.icon}</span>
                    <span>
                      <span style={{ fontSize: 12, fontWeight: 700, display: "block" }}>{fmt.label}</span>
                      <span style={{ fontSize: 10, color: sk.textFaint }}>{fmt.desc}</span>
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: sk.textFaint, flexShrink: 0 }}>{fmt.ext}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Load button ── */}
          <button
            onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
            style={{
              background: sk.card2Bg,
              color: "#60A5FA",
              border: "1px solid #60A5FA44",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              letterSpacing: 0.3,
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#60A5FA22";
              e.currentTarget.style.borderColor = "#60A5FA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = sk.card2Bg;
              e.currentTarget.style.borderColor = "#60A5FA44";
            }}
          >
            📂 LOAD
            {savedPrompts.length > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6,
                background: "#60A5FA", color: "#080B14",
                borderRadius: "50%", width: 16, height: 16,
                fontSize: 9, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {savedPrompts.length > 99 ? "99+" : savedPrompts.length}
              </span>
            )}
          </button>


          {/* Template Gallery button */}
          <button
            onClick={() => setShowGallery(true)}
            style={{
              background: "linear-gradient(135deg, #7C3AED22, #EC489922)",
              color: "#C084FC",
              border: "1px solid #7C3AED66",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              letterSpacing: 0.3,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #7C3AED44, #EC489933)";
              e.currentTarget.style.borderColor = "#7C3AED99";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #7C3AED22, #EC489922)";
              e.currentTarget.style.borderColor = "#7C3AED66";
            }}
          >
            ✨ QUICK START
          </button>
        </div>
      </header>


      {/* ════════════════ NEW BLOCK MODAL ════════════════ */}
      {showNewBlockModal && (
        <div
          onClick={() => setShowNewBlockModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9200,
            background: "rgba(8,11,20,0.88)",
            backdropFilter: "blur(7px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 384, maxWidth: "calc(100vw - 48px)",
              background: sk.modalBg,
              border: `1px solid ${sk.border}`,
              borderRadius: 11,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 16px 60px #00000099",
            }}
          >
            {/* Header */}
            <div style={{ padding: "10px 16px 8px", borderBottom: `1px solid ${sk.border}`, display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 18 }}>{nbEmoji || "✨"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: sk.text, letterSpacing: 0.3 }}>{editingBlockId ? "EDIT BLOCK" : "CREATE BLOCK"}</div>
                <div style={{ fontSize: 10, color: sk.textDim, marginTop: 2 }}>{editingBlockId ? "Changes are saved immediately to your custom blocks" : "New block will appear at the top of Template Blocks"}</div>
              </div>
              <button onClick={() => { setShowNewBlockModal(false); setEditingBlockId(null); }} style={{ background: "transparent", border: "none", color: sk.textDim, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: "11px 16px 14px", display: "flex", flexDirection: "column", gap: 9 }}>

              {/* Emoji selector */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: sk.textMuted, letterSpacing: 1, display: "block", marginBottom: 7 }}>EMOJI</label>
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 5,
                  background: sk.inputBg, border: `1px solid ${sk.border}`,
                  borderRadius: 9, padding: "8px",
                }}>
                  {[
                    "✨","🔥","⚡","🌟","💎","🚀","🎪","🔮","🗝️","🧩",
                    "🪄","🎲","🔭","🧬","🧲","💠","🔑","🧿","🎴","🃏",
                    "🏗️","🔧","🔩","⚗️","🧪","📡","🛰️","🧭","🗃️","📎",
                  ].map((em) => (
                    <button
                      key={em}
                      onClick={() => setNbEmoji(em)}
                      style={{
                        width: 29, height: 29,
                        borderRadius: 7,
                        border: `1.5px solid ${nbEmoji === em ? nbColor : sk.border}`,
                        background: nbEmoji === em ? nbColor + "33" : "transparent",
                        fontSize: 18, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.12s",
                        transform: nbEmoji === em ? "scale(1.15)" : "scale(1)",
                        boxShadow: nbEmoji === em ? `0 0 0 2px ${nbColor}55` : "none",
                        flexShrink: 0,
                      }}
                      title={em}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label row */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: sk.textMuted, letterSpacing: 1, display: "block", marginBottom: 5 }}>LABEL</label>
                <input
                  autoFocus
                  value={nbLabel}
                  onChange={(e) => setNbLabel(e.target.value)}
                  placeholder="My Custom Block"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: sk.inputBg, border: `1px solid ${sk.border}`,
                    borderRadius: 8, padding: "7px 13px",
                    fontSize: 13, color: sk.text,
                    fontFamily: "'IBM Plex Mono', monospace", outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = nbColor; }}
                  onBlur={(e) => { e.target.style.borderColor = sk.border; }}
                />
              </div>

              {/* Colour */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: sk.textMuted, letterSpacing: 1, display: "block", marginBottom: 7 }}>COLOUR</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {["#7C3AED","#0EA5E9","#10B981","#F59E0B","#EC4899","#F97316","#14B8A6","#6366F1","#F43F5E","#84CC16","#0369A1","#B45309","#64748B","#16A34A"].map((c) => (
                    <div
                      key={c}
                      onClick={() => setNbColor(c)}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", background: c,
                        cursor: "pointer", flexShrink: 0, transition: "transform 0.15s",
                        transform: nbColor === c ? "scale(1.35)" : "scale(1)",
                        boxShadow: nbColor === c ? `0 0 0 2px ${sk.cardBg}, 0 0 0 4px ${c}` : "none",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={nbColor}
                    onChange={(e) => setNbColor(e.target.value)}
                    title="Pick any colour"
                    style={{ width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0, background: "none" }}
                  />
                </div>
              </div>

              {/* Template text */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: sk.textMuted, letterSpacing: 1, display: "block", marginBottom: 5 }}>TEMPLATE TEXT</label>
                <textarea
                  value={nbText}
                  onChange={(e) => setNbText(e.target.value)}
                  placeholder={"Use [PLACEHOLDERS] for fields the user should fill in.\nExample:\nYour role: [ROLE]\nYour task: [TASK]"}
                  rows={5}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: sk.inputBg, border: `1px solid ${sk.border}`,
                    borderRadius: 8, padding: "8px 13px",
                    fontSize: 12, color: sk.text,
                    fontFamily: "'IBM Plex Mono', monospace", outline: "none",
                    resize: "vertical", lineHeight: 1.7,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = nbColor; }}
                  onBlur={(e) => { e.target.style.borderColor = sk.border; }}
                />
              </div>

              {/* Preview strip */}
              {(nbLabel || nbText) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 10, color: sk.textFaint, flexShrink: 0 }}>Preview:</div>
                  <div style={{
                    position: "relative",
                    width: 163, flexShrink: 0,
                    padding: "10px 13px", borderRadius: 10,
                    border: `1.5px solid ${nbColor}55`,
                    background: `linear-gradient(135deg, ${nbColor}18, ${nbColor}08)`,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{nbEmoji || "✨"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: nbColor, letterSpacing: 0.3 }}>{nbLabel || "Untitled"}</div>
                    </div>
                    {/* Dummy pencil */}
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
                      <path d="M7.5 1.5L9.5 3.5L3.5 9.5L1 10L1.5 7.5L7.5 1.5Z" stroke={nbColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {/* Dummy × */}
                    <span style={{ fontSize: 11, color: nbColor, opacity: 0.35, lineHeight: 1, flexShrink: 0 }}>✕</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 0 }}>
                <button
                  onClick={() => { setShowNewBlockModal(false); setEditingBlockId(null); }}
                  style={{
                    background: "transparent", color: sk.textDim,
                    border: `1px solid ${sk.border}`, borderRadius: 8,
                    padding: "7px 20px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >CANCEL</button>
                <button
                  onClick={editingBlockId ? confirmEditBlock : confirmNewBlock}
                  disabled={!nbLabel.trim() || !nbText.trim()}
                  style={{
                    background: nbColor, color: "#fff",
                    border: "none", borderRadius: 8,
                    padding: "7px 24px", fontSize: 12, fontWeight: 700,
                    cursor: (!nbLabel.trim() || !nbText.trim()) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: (!nbLabel.trim() || !nbText.trim()) ? 0.4 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {editingBlockId ? "✓ Save Changes" : `${nbEmoji || "✨"} Add & Close`}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TEMPLATE GALLERY MODAL ════════════════ */}
      {showGallery && (() => {
        // ── Template definitions ──────────────────────────────────────────────
        // Each template has: id, emoji, title, description, example, template.
        // Sections follow built-in block order: Role → Context → Task →
        // Constraints → Think Step-by-Step → Output Format → Self-Verify.
        const GALLERY = [
          {
            id: "summarise",
            emoji: "📄",
            title: "Summarise a Document",
            description: "Condense any document into a crisp executive summary.",
            example: `You are an expert technical writer with 10 years of experience in documentation and knowledge management. Your approach is clear, concise, and audience-focused.

Context: The user is working on internal documentation for the Platform Engineering team. Key constraints: the audience are senior stakeholders with limited time.

Your task is to summarise the document provided below. Focus on key decisions, outcomes, and action items. Do NOT include implementation details or raw data.

Constraints:
- Only use information provided in the document content
- If unsure about intent, say "I don't know"
- Limit response to 200 words

Think step by step:
1. Identify what the document is about
2. List the key decisions or findings
3. Identify action items or owners
4. State a one-sentence conclusion

Respond using this format:
## Executive Summary
Structure: [Overview, Key Decisions, Action Items, Conclusion]
Max length: 200 words

Before responding:
1. Verify each claim appears in the source document
2. Flag any ambiguous sections with [?]
3. Check your summary is self-contained`,

            template: `You are an expert [ROLE] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].

Context: The user is working on [DOCUMENT_SOURCE]. Key constraints: the audience are [AUDIENCE].

Your task is to summarise the document provided below. Focus on [FOCUS_AREAS]. Do NOT include [EXCLUSIONS].

Constraints:
- Only use information provided in the document content
- If unsure about intent, say "I don't know"
- Limit response to [N] words

Think step by step:
1. Identify what the document is about
2. List the key decisions or findings
3. Identify action items or owners
4. State a one-sentence conclusion

Respond using this format:
[FORMAT_TYPE]
Structure: [SECTIONS]
Max length: [N] words

Before responding:
1. Verify each claim appears in the source document
2. Flag any ambiguous sections with [?]
3. Check your summary is self-contained`,
          },
          {
            id: "prd",
            emoji: "📋",
            title: "Write a PRD",
            description: "Generate a full Product Requirements Document from a feature brief.",
            example: `You are an expert product manager with 8 years of experience in SaaS product development. Your approach is structured, user-centric, and data-driven.

Context: The user is working on a new notification preferences feature for a SaaS mobile app. Key constraints: must align with existing design system and Q3 roadmap.

Your task is to write a complete PRD for the feature described below. Focus on user stories, acceptance criteria, and technical constraints. Do NOT include engineering implementation details or cost estimates.

Constraints:
- Only use information provided in the brief
- If a requirement is ambiguous, flag it with [NEEDS CLARIFICATION]
- Limit response to 600 words

Think step by step:
1. Identify the problem being solved
2. Define the target user and their goals
3. List functional and non-functional requirements
4. Identify risks and open questions

Respond using this format:
## Product Requirements Document
Structure: [Problem Statement, Goals, User Stories, Acceptance Criteria, Risks, Open Questions]
Max length: 600 words

Before responding:
1. Verify every requirement traces back to a user need
2. Flag any missing information with [?]
3. Check requirements are testable and measurable`,

            template: `You are an expert [ROLE] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].

Context: The user is working on [FEATURE_NAME] for [PRODUCT]. Key constraints: [CONSTRAINTS].

Your task is to write a complete PRD for the feature described below. Focus on [FOCUS_AREAS]. Do NOT include [EXCLUSIONS].

Constraints:
- Only use information provided in the brief
- If a requirement is ambiguous, flag it with [NEEDS CLARIFICATION]
- Limit response to [N] words

Think step by step:
1. Identify the problem being solved
2. Define the target user and their goals
3. List functional and non-functional requirements
4. Identify risks and open questions

Respond using this format:
[FORMAT_TYPE]
Structure: [SECTIONS]
Max length: [N] words

Before responding:
1. Verify every requirement traces back to a user need
2. Flag any missing information with [?]
3. Check requirements are testable and measurable`,
          },
          {
            id: "meeting",
            emoji: "🗒️",
            title: "Generate Meeting Notes",
            description: "Turn a raw meeting transcript into structured, actionable notes.",
            example: `You are an expert business analyst with 6 years of experience in facilitation and documentation. Your approach is structured, neutral, and action-oriented.

Context: The user is working on documenting a sprint planning meeting for the Core Platform team. Key constraints: audience are engineers and their direct manager.

Your task is to generate structured meeting notes from the transcript provided below. Focus on decisions made, action items with owners, and blockers raised. Do NOT include small talk, repetition, or off-topic tangents.

Constraints:
- Only use information from the transcript
- If a speaker or owner is unclear, write [OWNER TBD]
- Limit response to 400 words

Think step by step:
1. Identify the meeting purpose and attendees
2. Extract key decisions and their rationale
3. List action items with owners and due dates
4. Note any blockers or parking lot items

Respond using this format:
## Meeting Notes — [DATE]
Structure: [Attendees, Purpose, Key Decisions, Action Items, Blockers, Next Steps]
Max length: 400 words

Before responding:
1. Verify every action item has an owner
2. Flag unclear attributions with [?]
3. Check the notes can stand alone without the transcript`,

            template: `You are an expert [ROLE] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].

Context: The user is working on documenting a [MEETING_TYPE] for [TEAM]. Key constraints: audience are [AUDIENCE].

Your task is to generate structured meeting notes from the transcript below. Focus on [FOCUS_AREAS]. Do NOT include [EXCLUSIONS].

Constraints:
- Only use information from the transcript
- If a speaker or owner is unclear, write [OWNER TBD]
- Limit response to [N] words

Think step by step:
1. Identify the meeting purpose and attendees
2. Extract key decisions and their rationale
3. List action items with owners and due dates
4. Note any blockers or parking lot items

Respond using this format:
[FORMAT_TYPE]
Structure: [SECTIONS]
Max length: [N] words

Before responding:
1. Verify every action item has an owner
2. Flag unclear attributions with [?]
3. Check the notes can stand alone without the transcript`,
          },
          {
            id: "techspec",
            emoji: "🔍",
            title: "Review a Technical Spec",
            description: "Critically review a technical specification for gaps, risks, and ambiguities.",
            example: `You are an expert software architect with 12 years of experience in distributed systems and API design. Your approach is rigorous, systematic, and constructive.

Context: The user is working on a technical spec for a new event-streaming service at Acme Corp. Key constraints: must comply with existing security standards and support 10k events/sec.

Your task is to review the technical specification provided below. Focus on identifying gaps, ambiguities, scalability risks, and missing error-handling. Do NOT rewrite the spec or suggest alternative architectures.

Constraints:
- Only evaluate the spec as written
- If something is unclear, flag it explicitly rather than assuming
- Limit response to 500 words

Think step by step:
1. Understand the stated purpose and scope
2. Identify missing or underspecified sections
3. Assess scalability, security, and failure modes
4. List concrete recommendations with severity (High/Medium/Low)

Respond using this format:
## Spec Review
Structure: [Summary, Critical Gaps, Risks, Recommendations by Severity, Open Questions]
Max length: 500 words

Before responding:
1. Verify each finding is supported by the spec text
2. Flag assumptions with [ASSUMED]
3. Ensure recommendations are actionable`,

            template: `You are an expert [ROLE] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].

Context: The user is working on [SPEC_NAME] at [COMPANY]. Key constraints: [CONSTRAINTS].

Your task is to review the technical specification provided below. Focus on [FOCUS_AREAS]. Do NOT [EXCLUSIONS].

Constraints:
- Only evaluate the spec as written
- If something is unclear, flag it explicitly rather than assuming
- Limit response to [N] words

Think step by step:
1. Understand the stated purpose and scope
2. Identify missing or underspecified sections
3. Assess scalability, security, and failure modes
4. List concrete recommendations with severity

Respond using this format:
[FORMAT_TYPE]
Structure: [SECTIONS]
Max length: [N] words

Before responding:
1. Verify each finding is supported by the spec text
2. Flag assumptions with [ASSUMED]
3. Ensure recommendations are actionable`,
          },
          {
            id: "issues",
            emoji: "📊",
            title: "Analyse Issue Tracker Patterns",
            description: "Identify trends, bottlenecks, and quality issues across a set of issue-tracker tickets.",
            example: `You are an expert engineering manager with 9 years of experience in agile delivery and team performance analysis. Your approach is data-driven, candid, and improvement-focused.

Context: The user is working on a quarterly retrospective for the Search Platform team at Acme Corp. Key constraints: tickets span one quarter and include bugs, stories, and tech debt items.

Your task is to analyse the issue-tracker ticket data provided below. Focus on recurring bug categories, cycle time patterns, and blocked tickets. Do NOT make assumptions about team morale or individual performance.

Constraints:
- Only use data provided in the ticket export
- If a pattern has fewer than 3 instances, note it as anecdotal
- Limit response to 400 words

Think step by step:
1. Categorise tickets by type and status
2. Identify the most frequent issue categories
3. Spot cycle time outliers and their causes
4. Suggest two to three targeted improvements

Respond using this format:
## Ticket Pattern Analysis — Q3 2025
Structure: [Volume Summary, Top Issue Categories, Cycle Time Analysis, Blockers, Recommendations]
Max length: 400 words

Before responding:
1. Verify every insight is backed by ticket data
2. Flag low-confidence patterns with [ANECDOTAL]
3. Keep recommendations specific and actionable`,

            template: `You are an expert [ROLE] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].

Context: The user is working on [RETROSPECTIVE_TYPE] for [TEAM] at [COMPANY]. Key constraints: [CONSTRAINTS].

Your task is to analyse the issue-tracker ticket data provided below. Focus on [FOCUS_AREAS]. Do NOT [EXCLUSIONS].

Constraints:
- Only use data provided in the ticket export
- If a pattern has fewer than [N] instances, note it as anecdotal
- Limit response to [N] words

Think step by step:
1. Categorise tickets by type and status
2. Identify the most frequent issue categories
3. Spot cycle time outliers and their causes
4. Suggest targeted improvements

Respond using this format:
[FORMAT_TYPE]
Structure: [SECTIONS]
Max length: [N] words

Before responding:
1. Verify every insight is backed by ticket data
2. Flag low-confidence patterns with [ANECDOTAL]
3. Keep recommendations specific and actionable`,
          },
          {
            id: "release",
            emoji: "📝",
            title: "Draft Release Notes",
            description: "Transform a list of merged PRs or tickets into polished release notes.",
            example: `You are an expert technical writer with 7 years of experience in developer communications and release management. Your approach is clear, user-focused, and concise.

Context: The user is working on release notes for version 3.4.0 of a Data Connector plugin. Key constraints: audience are both technical users and non-technical system admins.

Your task is to draft release notes from the list of changes provided below. Focus on user-visible impact, upgrade instructions, and breaking changes. Do NOT include internal ticket IDs, implementation details, or developer jargon.

Constraints:
- Only include changes listed in the provided changelog
- If impact is unclear, write [IMPACT TBD]
- Limit response to 300 words

Think step by step:
1. Group changes into: New Features, Improvements, Bug Fixes, Breaking Changes
2. Rewrite each item in user-facing language
3. Highlight any breaking changes prominently
4. Add a one-sentence version summary

Respond using this format:
## Release Notes — v3.4.0
Structure: [Version Summary, New Features, Improvements, Bug Fixes, Breaking Changes, Upgrade Notes]
Max length: 300 words

Before responding:
1. Verify every item maps to a provided change
2. Flag unclear impact with [?]
3. Ensure breaking changes section is visible and prominent`,

            template: `You are an expert [ROLE] with [X] years of experience in [SPECIALTY]. Your approach is [STYLE].

Context: The user is working on release notes for [VERSION] of [PRODUCT]. Key constraints: audience are [AUDIENCE].

Your task is to draft release notes from the list of changes below. Focus on [FOCUS_AREAS]. Do NOT include [EXCLUSIONS].

Constraints:
- Only include changes listed in the provided changelog
- If impact is unclear, write [IMPACT TBD]
- Limit response to [N] words

Think step by step:
1. Group changes into: New Features, Improvements, Bug Fixes, Breaking Changes
2. Rewrite each item in user-facing language
3. Highlight any breaking changes prominently
4. Add a one-sentence version summary

Respond using this format:
[FORMAT_TYPE]
Structure: [SECTIONS]
Max length: [N] words

Before responding:
1. Verify every item maps to a provided change
2. Flag unclear impact with [?]
3. Ensure breaking changes section is visible and prominent`,
          },
        ];

        const selectedId = gallerySelectedId;
        const setSelectedId = setGallerySelectedId;
        const tab = galleryTab;
        const setTab = setGalleryTab;
        const selected = GALLERY.find((t) => t.id === selectedId) || GALLERY[0];

        const loadTemplate = () => {
          pushUndo(blocksRef.current);
          const text = tab === "example" ? selected.example : selected.template;
          const loaded = makeFreeBlock(text);
          setBlocks([loaded]);
          setShowGallery(false);
          setTimeout(() => blockDivRefs.current[loaded.id]?.focus(), 20);
        };

        return (
          <div
            onClick={() => setShowGallery(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9200,
              background: "rgba(8,11,20,0.88)",
              backdropFilter: "blur(7px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 820, maxWidth: "calc(100vw - 48px)",
                height: "78vh", maxHeight: 640,
                background: sk.modalBg,
                border: `1px solid ${sk.border}`,
                borderRadius: 12,
                display: "flex", flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 24px 80px #00000099",
              }}
            >
              {/* Modal header */}
              <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid ${sk.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>✨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sk.text, letterSpacing: 0.5 }}>QUICK START — TEMPLATE GALLERY</div>
                  <div style={{ fontSize: 10, color: sk.textDim, marginTop: 2 }}>Choose a template · preview Example or Template · load into editor</div>
                </div>
                <button onClick={() => setShowGallery(false)} style={{ background: "transparent", border: "none", color: sk.textDim, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
              </div>

              {/* Body: left list + right preview */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* Left: template list */}
                <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${sk.border}`, overflowY: "auto", padding: "10px 8px" }}>
                  {GALLERY.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "10px 10px",
                        borderRadius: 8,
                        marginBottom: 4,
                        cursor: "pointer",
                        background: selectedId === t.id ? "#7C3AED22" : "transparent",
                        border: `1px solid ${selectedId === t.id ? "#7C3AED66" : "transparent"}`,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (selectedId !== t.id) e.currentTarget.style.background = sk.card2Bg; }}
                      onMouseLeave={(e) => { if (selectedId !== t.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{t.emoji}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: selectedId === t.id ? "#C084FC" : sk.text, letterSpacing: 0.2, lineHeight: 1.3 }}>{t.title}</div>
                        <div style={{ fontSize: 10, color: sk.textDim, marginTop: 3, lineHeight: 1.4 }}>{t.description}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: preview */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                  {/* Tab bar */}
                  <div style={{ display: "flex", borderBottom: `1px solid ${sk.border}`, flexShrink: 0 }}>
                    {[
                      { key: "example",  label: "✅ Ready-to-use Example" },
                      { key: "template", label: "📋 Template with Placeholders" },
                    ].map((tb) => (
                      <button
                        key={tb.key}
                        onClick={() => setTab(tb.key)}
                        style={{
                          padding: "9px 18px",
                          fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                          background: tab === tb.key ? "#7C3AED22" : "transparent",
                          color: tab === tb.key ? "#C084FC" : sk.textMuted,
                          border: "none",
                          borderBottom: tab === tb.key ? "2px solid #7C3AED" : "2px solid transparent",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                        }}
                      >
                        {tb.label}
                      </button>
                    ))}
                  </div>

                  {/* Preview text */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                    <pre style={{
                      margin: 0,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      lineHeight: 1.75,
                      color: sk.textDim,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {tab === "example" ? selected.example : selected.template}
                    </pre>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: "12px 20px", borderTop: `1px solid ${sk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: sk.textFaint }}>
                      {tab === "example" ? "Filled placeholders — ready to send" : "Contains [PLACEHOLDERS] — fill before sending"}
                    </span>
                    <button
                      onClick={loadTemplate}
                      style={{
                        background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 20px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: 0.3,
                        boxShadow: "0 4px 16px #7C3AED44",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Load into Editor →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ── Hidden file input for blocks LOAD ── */}
      <input
        ref={blocksFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleBlocksFileChange}
      />

      {/* ── Confirm overwrite modal for blocks LOAD ── */}
      {showBlocksLoadConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "#000a", zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: sk.card2Bg, border: `1px solid ${sk.border}`,
            borderRadius: 14, padding: "28px 28px 22px", maxWidth: 380, width: "90%",
            boxShadow: "0 16px 48px #0008",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: sk.text, marginBottom: 10 }}>
              Replace Custom Blocks?
            </div>
            <div style={{ fontSize: 13, color: sk.textFaint, lineHeight: 1.6, marginBottom: 22 }}>
              You already have <strong style={{ color: sk.text }}>{customBlocks.length} custom block{customBlocks.length !== 1 ? "s" : ""}</strong>. Loading from file will remove all of them and replace with the blocks from <strong style={{ color: sk.text }}>blocks.json</strong>.
              <br /><br />
              This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowBlocksLoadConfirm(false); setPendingBlocksLoad(null); }}
                style={{
                  background: "transparent", color: sk.textFaint,
                  border: `1px solid ${sk.border}`, borderRadius: 8,
                  padding: "8px 18px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = sk.text; e.currentTarget.style.borderColor = sk.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = sk.textFaint; e.currentTarget.style.borderColor = sk.border; }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBlocksLoad}
                style={{
                  background: "#EF444422", color: "#EF4444",
                  border: "1px solid #EF444466", borderRadius: 8,
                  padding: "8px 18px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#EF444433"; e.currentTarget.style.borderColor = "#EF4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#EF444422"; e.currentTarget.style.borderColor = "#EF444466"; }}
              >
                Replace & Load
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Hidden file input for LOAD — filtered to .prompt files ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".prompt"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* ── Hallucination risk tooltip — root level, never clipped ── */}
      <div
        id="halluc-risk-tooltip"
        style={{
          display: "none",
          position: "fixed",
          background: "#1E293B",
          color: "#E2E8F0",
          border: "1px solid #334155",
          borderRadius: 7,
          padding: "8px 11px",
          fontSize: 11,
          lineHeight: 1.6,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px #0008",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      {/* ── "Why?" block explainer tooltip — root level, never clipped ── */}
      <div
        id="why-block-tooltip"
        style={{
          display: "none",
          position: "fixed",
          background: "#1E293B",
          color: "#E2E8F0",
          border: "1px solid #334155",
          borderRadius: 7,
          padding: "8px 11px",
          fontSize: 11,
          lineHeight: 1.6,
          maxWidth: 280,
          whiteSpace: "normal",
          boxShadow: "0 4px 16px #0008",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      {/* ── Drag-help tooltip — rendered at root level so it's never clipped ── */}
      <div
        id="drag-help-tooltip"
        style={{
          display: "none",
          position: "fixed",
          background: "#1E293B",
          color: "#E2E8F0",
          border: "1px solid #334155",
          borderRadius: 7,
          padding: "8px 11px",
          fontSize: 11,
          lineHeight: 1.7,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px #0008",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        1. Click on a template block<br/>
        2. Hold it<br/>
        3. Drag to the right<br/>
        4. Drop on the prompt editor
      </div>

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── LEFT: Block Library ── */}
        <aside
          style={{
            width: 350,
            flexShrink: 0,
            borderRight: `1px solid ${sk.border}`,
            background: sk.sidebarBg,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 14px 10px",
              borderBottom: `1px solid ${sk.border}`,
              flexShrink: 0,
              minHeight: 56,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sk.border2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: sk.textDim }}>
                TEMPLATE BLOCKS
              </span>
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 15, height: 15, borderRadius: "50%",
                  border: `1px solid ${sk.textDim}`, color: sk.textDim,
                  fontSize: 9, fontWeight: 700, cursor: "default",
                  userSelect: "none", flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const tip = document.getElementById("drag-help-tooltip");
                  if (tip) {
                    tip.style.top = (rect.bottom + 6) + "px";
                    tip.style.left = rect.left + "px";
                    tip.style.display = "block";
                  }
                }}
                onMouseLeave={() => {
                  const tip = document.getElementById("drag-help-tooltip");
                  if (tip) tip.style.display = "none";
                }}
              >
                i
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "10px 10px 20px",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {/* ── CUSTOM section ── */}
            <div style={{ display: "flex", alignItems: "center", padding: "0 4px 6px", marginTop: 2 }}>
              <span
                onClick={() => setCustomFolded((f) => !f)}
                style={{ fontSize: 9, fontWeight: 700, color: sk.textFaint, letterSpacing: 1.5, flex: 1, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
              >
                CUSTOM
                <span style={{ display: "inline-block", transform: customFolded ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.2s", fontSize: 8, lineHeight: 1 }}>▶</span>
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {/* NEW */}
                <button
                  onClick={() => { setNbLabel(""); setNbEmoji("✨"); setNbColor("#7C3AED"); setNbText(""); setShowNewBlockModal(true); }}
                  title="Create a new custom block"
                  style={{ background: "transparent", border: `1px solid ${sk.border}`, borderRadius: 6, color: sk.textMuted, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "2px 7px", lineHeight: 1, letterSpacing: 2, transition: "all 0.15s", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; e.currentTarget.style.borderColor = "#A78BFA"; e.currentTarget.style.background = "#A78BFA18"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = sk.textMuted; e.currentTarget.style.borderColor = sk.border; e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0 }}><line x1="4.5" y1="1" x2="4.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="4.5" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  NEW
                </button>
                {/* LOAD */}
                <button
                  onClick={() => blocksFileInputRef.current && blocksFileInputRef.current.click()}
                  title={"Import custom blocks from a blocks.json file.\nOnly files exported from Prompt Studio are supported.\nIf you have existing custom blocks, you will be asked to confirm before they are replaced."}
                  style={{ background: "transparent", border: `1px solid ${sk.border}`, borderRadius: 6, color: sk.textMuted, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "2px 7px", lineHeight: 1, letterSpacing: 2, transition: "all 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; e.currentTarget.style.borderColor = "#A78BFA"; e.currentTarget.style.background = "#A78BFA18"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = sk.textMuted; e.currentTarget.style.borderColor = sk.border; e.currentTarget.style.background = "transparent"; }}
                >
                  LOAD
                </button>
                {/* SAVE */}
                {customBlocks.length > 0 && (
                  <button
                    onClick={() => saveBlocksToFolder(customBlocks)}
                    title={"Export all custom blocks to a blocks.json file.\nThe file is saved to your browser's Downloads folder.\nUse LOAD to restore them in a future session."}
                    style={{ background: "transparent", border: `1px solid ${sk.border}`, borderRadius: 6, color: sk.textMuted, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "2px 7px", lineHeight: 1, letterSpacing: 2, transition: "all 0.15s", fontFamily: "inherit" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; e.currentTarget.style.borderColor = "#A78BFA"; e.currentTarget.style.background = "#A78BFA18"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = sk.textMuted; e.currentTarget.style.borderColor = sk.border; e.currentTarget.style.background = "transparent"; }}
                  >
                    SAVE
                  </button>
                )}
              </div>
            </div>
            {blocksLoadError && (
              <div style={{
                margin: "0 4px 8px",
                padding: "7px 10px",
                background: "#EF444418",
                border: "1px solid #EF444455",
                borderRadius: 7,
                fontSize: 10,
                color: "#EF4444",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
              }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                <span>{blocksLoadError}</span>
                <button
                  onClick={() => setBlocksLoadError("")}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 }}
                >✕</button>
              </div>
            )}
            {!customFolded && customBlocks.length === 0 ? (
              <div style={{ padding: "6px 6px 10px", fontSize: 10, color: sk.textFaint, fontStyle: "italic" }}>
                No custom blocks yet. Use +NEW or LOAD to create one.
              </div>
            ) : !customFolded ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {customBlocks.map((block) => {
                const isDragging = reorderDragId === block.id;
                const isOver    = reorderOverId  === block.id && reorderDragId !== block.id;
                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("reorderBlockId", block.id);
                      e.dataTransfer.setData("blockId", block.id);
                      e.dataTransfer.effectAllowed = "copyMove";
                      setReorderDragId(block.id);
                      setActiveBlockId(block.id);
                      const ghost = document.createElement("div");
                      ghost.textContent = `${block.emoji} ${block.label}`;
                      ghost.style.cssText = `
                        position:fixed;top:-200px;left:-200px;
                        background:${block.color};color:#fff;padding:6px 12px;
                        border-radius:8px;font:700 12px/1 'IBM Plex Mono',monospace;
                        white-space:nowrap;pointer-events:none;opacity:0.9;
                      `;
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 60, 18);
                      setTimeout(() => document.body.removeChild(ghost), 0);
                    }}
                    onDragEnd={() => {
                      setReorderDragId(null);
                      setReorderOverId(null);
                      setActiveBlockId(null);
                    }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes("reorderblockid")) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setReorderOverId(block.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (reorderOverId === block.id) setReorderOverId(null);
                    }}
                    onDrop={(e) => {
                      const dragId = e.dataTransfer.getData("reorderBlockId");
                      if (dragId) {
                        e.preventDefault();
                        e.stopPropagation();
                        reorderCustomBlocks(dragId, block.id);
                      }
                      setReorderOverId(null);
                    }}
                    style={{
                      position: "relative",
                      opacity: isDragging ? 0.35 : 1,
                      transform: isOver ? "translateY(2px)" : "none",
                      transition: "opacity 0.15s, transform 0.1s",
                      borderRadius: 10,
                      boxShadow: isOver
                        ? `0 -2px 0 0 ${block.color}, inset 0 0 0 1.5px ${block.color}55`
                        : "none",
                      cursor: "grab",
                    }}
                  >
                    <BlockCard block={block} onDragStart={setActiveBlockId} />
                    {/* Edit button */}
                    <button
                      onClick={() => {
                        setEditingBlockId(block.id);
                        setNbLabel(block.label);
                        setNbEmoji(block.emoji || "✨");
                        setNbColor(block.color || "#7C3AED");
                        setNbText(block.text);
                        setShowNewBlockModal(true);
                      }}
                      title="Edit block"
                      style={{
                        position: "absolute", top: 6, right: 28,
                        background: "transparent", border: "none",
                        color: sk.textFaint, fontSize: 11,
                        cursor: "pointer", padding: "1px 4px",
                        lineHeight: 1, borderRadius: 4,
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; e.currentTarget.style.background = "#A78BFA18"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sk.textFaint; e.currentTarget.style.background = "transparent"; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M7.5 1.5L9.5 3.5L3.5 9.5L1 10L1.5 7.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => deleteCustomBlock(block.id)}
                      title="Remove block"
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "transparent", border: "none",
                        color: sk.textFaint, fontSize: 11,
                        cursor: "pointer", padding: "1px 4px",
                        lineHeight: 1, borderRadius: 4,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "#EF444418"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sk.textFaint; e.currentTarget.style.background = "transparent"; }}
                    >✕</button>
                  </div>
                );
              })}
              </div>
            ) : null}

            {/* ── Divider + BUILT-IN section ── */}
            <div style={{ height: 1, background: sk.border, margin: "8px 4px 10px" }} />
            <div
              onClick={() => setBuiltInFolded((f) => !f)}
              style={{ fontSize: 9, fontWeight: 700, color: sk.textFaint, letterSpacing: 1.5, padding: "0 4px 6px", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
            >
              BUILT-IN PROMPTS
              <span style={{ display: "inline-block", transform: builtInFolded ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.2s", fontSize: 8, lineHeight: 1 }}>▶</span>
            </div>
            {!builtInFolded && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {BLOCKS.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    onDragStart={setActiveBlockId}
                  />
                ))}
              </div>
            )}

          </div>

          {/* Hallucination Risk Badge — left corner of sidebar bottom */}
          {(() => {
            const hasGrounding   = promptText.includes((BLOCKS.find((x) => x.id === "grounding")   || {}).text?.slice(0, 12) || "\x00");
            const hasConstraints = promptText.includes((BLOCKS.find((x) => x.id === "constraints") || {}).text?.slice(0, 12) || "\x00");
            const hasUncertainty = promptText.includes((BLOCKS.find((x) => x.id === "uncertainty") || {}).text?.slice(0, 12) || "\x00");
            const riskFactors = [
              !hasGrounding   && "Grounding",
              !hasConstraints && "Constraints",
              !hasUncertainty && "Uncertainty",
            ].filter(Boolean);
            const riskLevel =
              riskFactors.length === 0 ? "LOW" :
              riskFactors.length === 1 ? "MEDIUM" :
              riskFactors.length === 2 ? "HIGH" : "VERY HIGH";
            const riskColor =
              riskFactors.length === 0 ? "#10B981" :
              riskFactors.length === 1 ? "#F59E0B" :
              riskFactors.length === 2 ? "#F97316" : "#EF4444";
            const tooltipText = riskFactors.length === 0
              ? "Hallucination Risk: LOW  →  Good job! Grounding, Constraints & Uncertainty are set."
              : `Hallucination Risk: ${riskLevel}  →  Add ${riskFactors.join(" & ")} to reduce`;
            return (
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${sk.border}`, display: "flex", alignItems: "center", gap: 7, flexShrink: 0, background: sk.sidebarBg }}>
                <span
                  style={{ fontSize: 15, cursor: "default", userSelect: "none", filter: `drop-shadow(0 0 4px ${riskColor})`, transition: "filter 0.3s" }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const tip = document.getElementById("halluc-risk-tooltip");
                    if (tip) { tip.style.top = (rect.top - 6) + "px"; tip.style.left = rect.right + 8 + "px"; tip.style.transform = "translateY(-100%)"; tip.style.borderColor = riskColor; tip.innerText = tooltipText; tip.style.display = "block"; }
                  }}
                  onMouseLeave={() => { const tip = document.getElementById("halluc-risk-tooltip"); if (tip) tip.style.display = "none"; }}
                >
                  {riskFactors.length === 0 ? "✅" : "⚠️"}
                </span>
                <span
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: riskColor, border: `1px solid ${riskColor}66`, borderRadius: 4, padding: "1px 5px", background: riskColor + "18", transition: "all 0.3s", cursor: "default", userSelect: "none" }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const tip = document.getElementById("halluc-risk-tooltip");
                    if (tip) { tip.style.top = (rect.top - 6) + "px"; tip.style.left = rect.right + 8 + "px"; tip.style.transform = "translateY(-100%)"; tip.style.borderColor = riskColor; tip.innerText = tooltipText; tip.style.display = "block"; }
                  }}
                  onMouseLeave={() => { const tip = document.getElementById("halluc-risk-tooltip"); if (tip) tip.style.display = "none"; }}
                >
                  RISK: {riskLevel}
                </span>
                {/* ⓘ info icon — reuses the halluc-risk tooltip */}
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 15, height: 15, borderRadius: "50%",
                    border: `1px solid ${sk.textDim}`, color: sk.textDim,
                    fontSize: 9, fontWeight: 700, cursor: "default",
                    userSelect: "none", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const tip = document.getElementById("halluc-risk-tooltip");
                    if (tip) { tip.style.top = (rect.top - 6) + "px"; tip.style.left = rect.right + 8 + "px"; tip.style.transform = "translateY(-100%)"; tip.style.borderColor = riskColor; tip.innerText = tooltipText; tip.style.display = "block"; }
                  }}
                  onMouseLeave={() => { const tip = document.getElementById("halluc-risk-tooltip"); if (tip) tip.style.display = "none"; }}
                >
                  i
                </span>
              </div>
            );
          })()}
        </aside>

        {/* ── CENTER: Arrow / visual bridge ── */}
        <div
          style={{
            width: 48,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: sk.cardBg,
            borderRight: `1px solid ${sk.border}`,
            gap: 6,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                fontSize: 14,
                color: activeBlock
                  ? activeBlock.color
                  : sk.border,
                transition: "color 0.3s ease",
                transform: `translateX(${activeBlock ? 2 : 0}px)`,
                transitionDelay: `${i * 60}ms`,
                animation: activeBlock ? `fadeSlideIn 0.3s ease ${i * 80}ms both` : "none",
              }}
            >
              ▶
            </div>
          ))}
        </div>

        {/* ── RIGHT: Prompt Drop Zone ── */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Drop zone header */}
          <div
            style={{
              padding: "14px 24px 10px",
              borderBottom: `1px solid ${sk.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: sk.panelBg,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isDragOver ? "#10B981" : sk.border2,
                transition: "background 0.2s",
                boxShadow: isDragOver ? "0 0 8px #10B981" : "none",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: isDragOver ? "#10B981" : sk.textDim,
                transition: "color 0.2s",
              }}
            >
              {isDragOver
                ? `DROP TO INSERT "${activeBlock?.label?.toUpperCase() || "BLOCK"}"`
                : "EDITOR · DROP ZONE"}
            </span>

            {/* ── Undo button ── */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title={`Undo (Ctrl+Z) · ${undoStack.length} step${undoStack.length !== 1 ? "s" : ""} available`}
              style={{
                marginLeft: "auto",
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `1.5px solid ${undoStack.length > 0 ? sk.textMuted : sk.border}`,
                background: undoStack.length > 0 ? "#10151C" : "transparent",
                cursor: undoStack.length > 0 ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
                boxShadow: undoStack.length > 0 ? "0 0 0 0 #7C3AED00" : "none",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (undoStack.length > 0) {
                  e.currentTarget.style.borderColor = "#7C3AED";
                  e.currentTarget.style.background = "#7C3AED22";
                  e.currentTarget.style.boxShadow = "0 0 10px #7C3AED44";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = undoStack.length > 0 ? sk.textMuted : sk.border;
                e.currentTarget.style.background = undoStack.length > 0 ? "#10151C" : "transparent";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Rounded arrow SVG (counter-clockwise arc with arrowhead) */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  animation: undoBounce ? "undoBounce 0.35s ease" : "none",
                  opacity: undoStack.length > 0 ? 1 : 0.2,
                  transition: "opacity 0.2s",
                }}
              >
                {/* Arc: clockwise from left side going up-right */}
                <path
                  d="M3.5 8 A4.5 4.5 0 1 1 8 12.5"
                  stroke={undoStack.length > 0 ? "#A78BFA" : sk.textMuted}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Arrowhead at the end of the arc (pointing right-down) */}
                <polyline
                  points="6,5.5 3.5,8 1,5.5"
                  stroke={undoStack.length > 0 ? "#A78BFA" : sk.textMuted}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>

            {/* Undo step counter badge */}
            {undoStack.length > 0 && (
              <div
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: sk.textMuted,
                  letterSpacing: 0.5,
                  minWidth: 12,
                }}
              >
                {undoStack.length}
              </div>
            )}

            {/* ── Redo button ── */}
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title={`Redo (Ctrl+Y) · ${redoStack.length} step${redoStack.length !== 1 ? "s" : ""} available`}
              style={{
                marginLeft: 10,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `1.5px solid ${redoStack.length > 0 ? sk.textMuted : sk.border}`,
                background: redoStack.length > 0 ? "#10151C" : "transparent",
                cursor: redoStack.length > 0 ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (redoStack.length > 0) {
                  e.currentTarget.style.borderColor = "#10B981";
                  e.currentTarget.style.background = "#10B98122";
                  e.currentTarget.style.boxShadow = "0 0 10px #10B98144";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = redoStack.length > 0 ? sk.textMuted : sk.border;
                e.currentTarget.style.background = redoStack.length > 0 ? "#10151C" : "transparent";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Mirror of undo arrow — counter-clockwise arc, arrowhead on right */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  animation: redoBounce ? "undoBounce 0.35s ease" : "none",
                  opacity: redoStack.length > 0 ? 1 : 0.2,
                  transition: "opacity 0.2s",
                  transform: "scaleX(-1)", // mirror the undo arrow
                }}
              >
                <path
                  d="M3.5 8 A4.5 4.5 0 1 1 8 12.5"
                  stroke={redoStack.length > 0 ? "#34D399" : sk.textMuted}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <polyline
                  points="6,5.5 3.5,8 1,5.5"
                  stroke={redoStack.length > 0 ? "#34D399" : sk.textMuted}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>

            {/* Redo step counter badge */}
            {redoStack.length > 0 && (
              <div
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  color: sk.textMuted,
                  letterSpacing: 0.5,
                  minWidth: 12,
                }}
              >
                {redoStack.length}
              </div>
            )}
          </div>

          {/* Textarea drop zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={isDragOver ? "drop-zone-active" : ""}
            style={{
              flex: 1,
              position: "relative",
              transition: "all 0.15s ease",
              background: isDragOver
                ? `radial-gradient(ellipse at ${dropIndicator ? dropIndicator.x - (dropZoneRef.current?.getBoundingClientRect().left || 0) : 50}px ${dropIndicator ? dropIndicator.y - (dropZoneRef.current?.getBoundingClientRect().top || 0) : 50}px, #7C3AED15 0%, transparent 60%)`
                : sk.cardBg,
            }}
          >
            {/* Drop target crosshair overlay */}
            {isDragOver && dropIndicator && (
              <div
                style={{
                  position: "fixed",
                  left: dropIndicator.x - 20,
                  top: dropIndicator.y - 20,
                  width: 40,
                  height: 40,
                  pointerEvents: "none",
                  zIndex: 9999,
                }}
              >
                {/* Crosshair lines */}
                <div style={{
                  position: "absolute", left: "50%", top: 0, bottom: 0,
                  width: 1, background: activeBlock ? activeBlock.color : "#7C3AED",
                  opacity: 0.8, transform: "translateX(-50%)",
                }}/>
                <div style={{
                  position: "absolute", top: "50%", left: 0, right: 0,
                  height: 1, background: activeBlock ? activeBlock.color : "#7C3AED",
                  opacity: 0.8, transform: "translateY(-50%)",
                }}/>
                <div style={{
                  position: "absolute", left: "50%", top: "50%",
                  width: 8, height: 8, borderRadius: "50%",
                  background: activeBlock ? activeBlock.color : "#7C3AED",
                  transform: "translate(-50%,-50%)",
                  boxShadow: `0 0 12px ${activeBlock ? activeBlock.color : "#7C3AED"}`,
                }}/>
              </div>
            )}

            {/* Empty state hint */}
            {!promptText && !isDragOver && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  gap: 12,
                  zIndex: 1,
                }}
              >
                <div style={{ fontSize: 48, opacity: 0.08, lineHeight: 1 }}>✦</div>
                <div style={{ fontSize: 12, color: sk.border, letterSpacing: 1, fontWeight: 700, textAlign: "center", lineHeight: 1.8 }}>
                  DRAG BLOCKS FROM THE LEFT<br />OR START TYPING BELOW
                </div>
              </div>
            )}

            {/* ── Block-based editor ── */}
            <div
              ref={editorRef}
              onClick={(e) => {
                // Click in empty space below blocks → focus last block
                if (!e.target.closest("[data-block-id]")) {
                  const bs = blocksRef.current;
                  if (bs.length > 0) blockDivRefs.current[bs[bs.length - 1].id]?.focus();
                  setActivePlaceholder(null);
                }
              }}
              style={{
                position: "absolute",
                top: 0, right: 0, bottom: 0, left: 0,
                width: "100%",
                height: "100%",
                padding: "24px 28px 24px 20px",
                overflowY: "auto",
                overflowX: "hidden",
                boxSizing: "border-box",
                cursor: "text",
                zIndex: 2,
                animation: insertedFlash ? "blockInsert 0.6s ease" : "none",
              }}
            >
              {blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  sk={sk}
                  onTextChange={updateBlockText}
                  onEnterAtEnd={handleEnterAtEnd}
                  onEnterAtStart={handleEnterAtStart}
                  onBackspaceAtStart={handleBackspaceAtStart}
                  onPlaceholderClick={handlePlaceholderClick}
                  onDismissPlaceholder={() => setActivePlaceholder(null)}
                  onFocus={(id) => { focusedBlockId.current = id; }}
                  divRef={{
                    get current() { return blockDivRefs.current[block.id]; },
                    set current(el) { blockDivRefs.current[block.id] = el; },
                  }}
                />
              ))}
            </div>

            {/* ── Floating placeholder input — appears below the clicked [PLACEHOLDER] ── */}
            {activePlaceholder && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(
                    Math.max(activePlaceholder.x, 8),
                    (dropZoneRef.current?.clientWidth || 600) - 260
                  ),
                  top: activePlaceholder.y,
                  zIndex: 9999,
                  background: sk.modalBg,
                  border: "1.5px solid #F59E0B",
                  borderRadius: 9,
                  boxShadow: "0 8px 32px #00000066, 0 0 0 1px #F59E0B22",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  minWidth: 240,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B", letterSpacing: 1 }}>
                  REPLACE PLACEHOLDER
                </div>
                <div style={{ fontSize: 11, color: sk.textDim, marginTop: -3 }}>
                  {activePlaceholder.placeholder}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    ref={placeholderInputRef}
                    value={placeholderInput}
                    onChange={(e) => setPlaceholderInput(e.target.value)}
                    placeholder="Type replacement…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitPlaceholder(); }
                      if (e.key === "Escape") { setActivePlaceholder(null); editorRef.current?.focus(); }
                    }}
                    style={{
                      flex: 1,
                      background: sk.inputBg,
                      border: "1px solid #F59E0B66",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                      color: sk.text,
                      fontFamily: "'IBM Plex Mono', monospace",
                      outline: "none",
                      caretColor: "#F59E0B",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#F59E0B"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#F59E0B66"; }}
                  />
                  <button
                    onClick={commitPlaceholder}
                    disabled={!placeholderInput.trim()}
                    style={{
                      background: placeholderInput.trim() ? "#F59E0B" : sk.border,
                      color: placeholderInput.trim() ? "#0A0E1A" : sk.textFaint,
                      border: "none", borderRadius: 6,
                      padding: "6px 12px", fontSize: 11, fontWeight: 700,
                      cursor: placeholderInput.trim() ? "pointer" : "default",
                      fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0,
                    }}
                  >
                    ↵ Replace
                  </button>
                </div>
                <div style={{ fontSize: 10, color: sk.textFaint }}>
                  Enter to replace · Esc to cancel
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          {(() => {
            // ── Prompt Health Score ───────────────────────────────────────────
            // Each criterion is worth a fixed number of points (total = 100).
            // We check whether the prompt text contains a given block by looking
            // for the first 12 chars of its default text — the same heuristic
            // used by the block usage dots above.
            const hasBlock = (id) => {
              const b = [...BLOCKS, ...customBlocks].find((x) => x.id === id);
              return b ? promptText.includes(b.text.slice(0, 12)) : false;
            };

            // Count unfilled [PLACEHOLDER] tokens
            const unfilledCount = promptText ? getPlaceholders(promptText).length : 0;

            // Scoring criteria — weights must sum to 100
            const criteria = [
              { id: "role",        label: "Role",        points: 20, met: hasBlock("role") },
              { id: "task",        label: "Task",        points: 20, met: hasBlock("task") },
              { id: "constraints", label: "Constraints", points: 15, met: hasBlock("constraints") },
              { id: "grounding",   label: "Grounding",   points: 15, met: hasBlock("grounding") },
              { id: "uncertainty", label: "Uncertainty", points: 10, met: hasBlock("uncertainty") },
              { id: "format",      label: "Output Format", points: 10, met: hasBlock("format") },
              // Placeholders filled: full 10pts if none remain, partial otherwise
              {
                id: "placeholders",
                label: "Placeholders filled",
                points: 10,
                met: promptText.length > 0 && unfilledCount === 0,
                partial: promptText.length > 0 && unfilledCount > 0
                  ? Math.max(0, 10 - unfilledCount * 2)  // lose 2pts per unfilled token
                  : null,
              },
            ];

            const score = promptText
              ? criteria.reduce((sum, c) => {
                  if (c.met) return sum + c.points;
                  if (c.partial != null) return sum + c.partial;
                  return sum;
                }, 0)
              : 0;

            // Letter grade
            const grade =
              score >= 93 ? "A+" :
              score >= 90 ? "A"  :
              score >= 87 ? "A-" :
              score >= 83 ? "B+" :
              score >= 80 ? "B"  :
              score >= 77 ? "B-" :
              score >= 73 ? "C+" :
              score >= 70 ? "C"  :
              score >= 67 ? "C-" :
              score >= 60 ? "D"  : "F";

            // Bar colour: green → yellow → red
            const barColor =
              score >= 80 ? "#10B981" :
              score >= 60 ? "#F59E0B" :
              score >= 40 ? "#F97316" : "#EF4444";

            const missing = criteria.filter((c) => !c.met && c.partial == null);

            // Total filled bar segments out of 10
            const filledSegs = Math.round(score / 10);

            return (
              <div
                style={{
                  borderTop: `1px solid ${sk.border}`,
                  padding: "8px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: sk.panelBg,
                  flexShrink: 0,
                }}
              >
                {/* Row 1: Placeholder progress bar + block usage dots */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                  {/* ── Placeholder Completion Progress Bar ── */}
                  {promptText && (() => {
                    // All [PLACEHOLDER] tokens in the original default block texts —
                    // we compare total ever-possible vs currently remaining unfilled.
                    // "Total" = unique placeholders across ALL blocks ever inserted.
                    // Simpler heuristic: count how many placeholders existed before
                    // any filling = unfilled + already-filled tokens no longer present.
                    // Since filled tokens are replaced with plain text we can't count
                    // them directly, so we track: total = max(unfilled, last known total).
                    // Best practical approach: total placeholders = unfilled now +
                    // (initial total − unfilled).  We derive initial total from a
                    // stable reference: scan the BLOCKS default texts for all [P] tokens
                    // that appear in the current prompt text context.
                    // Simplest correct approach for UX: total = unfilled + filled count.
                    // "Filled" = placeholders the user has already replaced =
                    // we count words that WERE placeholders by tracking a running max.
                    // → Use a ref-free approach: total segments = unfilledCount + filledCount
                    //   where filledCount is stored in a separate state that resets when
                    //   prompt is cleared. Since we can't add state here, we use:
                    //   total = the highest placeholder count ever seen (approximated
                    //   by reading all default block texts that appear in the prompt).
                    const allBlockTexts = [...BLOCKS, ...customBlocks];
                    // Count how many [PLACEHOLDER] tokens exist across all blocks
                    // whose content is currently present in the prompt
                    let totalInBlocks = 0;
                    allBlockTexts.forEach((b) => {
                      if (promptText.includes(b.text.slice(0, 12))) {
                        const re = new RegExp(PLACEHOLDER_RE.source, "g");
                        let m;
                        while ((m = re.exec(b.text)) !== null) totalInBlocks++;
                      }
                    });
                    // Total = max of block-derived count and current unfilled count
                    // (user may have typed extra placeholders manually)
                    const total = Math.max(totalInBlocks, unfilledCount);
                    const filled = total - unfilledCount;
                    const segments = Math.max(total, 1);
                    const barColor = unfilledCount === 0 ? "#10B981" : "#F59E0B";

                    // Navigate to the next unfilled placeholder on click
                    const navigateToNext = () => {
                      const all = getPlaceholders(promptText);
                      if (!all.length) return;
                      const nextIdx = placeholderNavIdx % all.length;
                      setPlaceholderNavIdx(nextIdx + 1);
                      // Find the ph-chip span in the editor DOM and simulate a click
                      const chips = dropZoneRef.current?.querySelectorAll(".ph-chip");
                      if (chips && chips[nextIdx]) {
                        chips[nextIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });
                        chips[nextIdx].click();
                      }
                    };

                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {/* Label */}
                        <span style={{ fontSize: 10, fontWeight: 700, color: sk.textMuted, letterSpacing: 1, flexShrink: 0 }}>
                          PLACEHOLDERS
                        </span>

                        {/* Segmented bar — one segment per total placeholder */}
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          {Array.from({ length: Math.min(segments, 10) }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: 14, height: 8, borderRadius: 2,
                                background: i < Math.min(filled, 10) ? barColor : sk.border,
                                transition: "background 0.3s ease",
                                boxShadow: i < Math.min(filled, 10) ? `0 0 4px ${barColor}88` : "none",
                              }}
                            />
                          ))}
                        </div>

                        {/* Counter — clickable to cycle through unfilled ones */}
                        <span
                          onClick={unfilledCount > 0 ? navigateToNext : undefined}
                          title={unfilledCount > 0 ? "Click to jump to next unfilled placeholder" : "All placeholders filled"}
                          style={{
                            fontSize: 10, fontWeight: 700,
                            color: unfilledCount === 0 ? "#10B981" : "#F59E0B",
                            cursor: unfilledCount > 0 ? "pointer" : "default",
                            flexShrink: 0,
                            userSelect: "none",
                            textDecoration: unfilledCount > 0 ? "underline dotted" : "none",
                          }}
                        >
                          [{filled} / {total} filled]
                        </span>
                      </div>
                    );
                  })()}

                  {/* Block usage dots */}
                  <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                    {BLOCKS.filter((b) => promptText.includes(b.text.slice(0, 12))).map((b) => (
                      <div
                        key={b.id}
                        title={b.label}
                        style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: b.color, boxShadow: `0 0 6px ${b.color}`,
                        }}
                      />
                    ))}
                  </div>

                  {promptText && (
                    <div style={{ fontSize: 10, color: sk.textDim, fontWeight: 700, letterSpacing: 0.5 }}>
                      {BLOCKS.filter((b) => promptText.includes(b.text.slice(0, 12))).length} BLOCKS USED
                    </div>
                  )}
                </div>

                {/* Row 2: Prompt Health Score bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Label */}
                  <span style={{ fontSize: 10, fontWeight: 700, color: sk.textMuted, letterSpacing: 1, flexShrink: 0 }}>
                    PROMPT QUALITY
                  </span>

                  {/* Segmented bar — 10 segments */}
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 14, height: 8, borderRadius: 2,
                          background: i < filledSegs ? barColor : sk.border,
                          transition: "background 0.3s ease",
                          boxShadow: i < filledSegs ? `0 0 4px ${barColor}88` : "none",
                        }}
                      />
                    ))}
                  </div>

                  {/* Percentage */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: barColor, flexShrink: 0, minWidth: 32 }}>
                    {promptText ? `${score}%` : "—"}
                  </span>

                  {/* Letter grade */}
                  {promptText && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: sk.panelBg, background: barColor,
                      borderRadius: 4, padding: "1px 5px", flexShrink: 0,
                    }}>
                      {grade}
                    </span>
                  )}

                  {/* Missing criteria */}
                  {promptText && missing.length > 0 && (
                    <span style={{ fontSize: 10, color: sk.textFaint, marginLeft: 4 }}>
                      Missing: {missing.map((c) => c.label).join(" · ")}
                    </span>
                  )}

                  {promptText && missing.length === 0 && (
                    <span style={{ fontSize: 10, color: "#10B981", marginLeft: 4 }}>
                      ✓ All criteria met
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}

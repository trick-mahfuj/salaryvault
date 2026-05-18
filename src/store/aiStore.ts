"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExtractedTransaction } from "@/types";
import type { AIContext } from "@/lib/aiEngine";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  fullText?: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  timestamp: string;
  id: string;
}

export interface UserMemory {
  preferredCategories: { category: string; count: number }[];
  preferredMethods: { method: string; count: number }[];
  commonSources: { source: string; count: number }[];
  commonLocations: { location: string; count: number }[];
  commonTags: { tag: string; count: number }[];
  frequentAmounts: { range: string; count: number }[];
  lastUsedSource: string;
  lastUsedCategory: string;
  lastUsedMethod: string;
  totalInteractions: number;
  firstSeen: string;
  lastSeen: string;
}

export interface PendingConfirmation {
  tx: ExtractedTransaction;
  timestamp: string;
}

export interface PinnedInsight {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface AIState {
  messages: ChatMessage[];
  isOpen: boolean;
  pendingTx: ExtractedTransaction | null;
  confirmedTx: ExtractedTransaction | null;
  loading: boolean;
  loadingText: string;
  typingId: number | null;
  aiContext: AIContext;
  memory: UserMemory;
  pendingConfirmations: PendingConfirmation[];
  pinnedInsights: PinnedInsight[];
  suggestions: string[];
  welcomeShown: boolean;
  lastWelcomeDate: string;
  hasInteracted: boolean;

  setOpen: (open: boolean) => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setPendingTx: (tx: ExtractedTransaction | null) => void;
  setConfirmedTx: (tx: ExtractedTransaction | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingText: (text: string) => void;
  setTypingId: (id: number | null) => void;
  setAiContext: (ctx: Partial<AIContext>) => void;
  updateMemory: (update: Partial<UserMemory>) => void;
  addPendingConfirmation: (tx: ExtractedTransaction) => void;
  removePendingConfirmation: (index: number) => void;
  clearPendingConfirmations: () => void;
  addPinnedInsight: (insight: PinnedInsight) => void;
  removePinnedInsight: (id: string) => void;
  setSuggestions: (suggestions: string[]) => void;
  setWelcomeShown: (shown: boolean) => void;
  setLastWelcomeDate: (date: string) => void;
  setHasInteracted: (interacted: boolean) => void;
  clearMessages: () => void;
  exportConversation: () => ChatMessage[];
  reset: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

const defaultMemory: UserMemory = {
  preferredCategories: [],
  preferredMethods: [],
  commonSources: [],
  commonLocations: [],
  commonTags: [],
  frequentAmounts: [],
  lastUsedSource: "",
  lastUsedCategory: "",
  lastUsedMethod: "",
  totalInteractions: 0,
  firstSeen: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
};

function trackMemoryField<T extends { count: number }>(
  items: T[],
  field: keyof T,
  value: string,
  label: string,
  maxItems = 10
): T[] {
  const existing = items.find((i) => i[field] === value);
  if (existing) {
    return items.map((i) =>
      i[field] === value ? { ...i, count: (i.count || 0) + 1 } : i
    ).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, maxItems) as T[];
  }
  const newItem = { [field]: value, count: 1, [label]: value } as unknown as T;
  return [...items, newItem].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, maxItems) as T[];
}

function generateIdNum(): number {
  return Date.now();
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      pendingTx: null,
      confirmedTx: null,
      loading: false,
      loadingText: "",
      typingId: null,
      aiContext: {
        runningBalance: 0,
        lastTransaction: null,
        recentMessages: [],
      },
      memory: defaultMemory,
      pendingConfirmations: [],
      pinnedInsights: [],
      suggestions: [],
      welcomeShown: false,
      lastWelcomeDate: "",
      hasInteracted: false,

      setOpen: (open) => set({ isOpen: open }),

      addMessage: (msg) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...msg,
              id: generateId(),
              timestamp: new Date().toISOString(),
            },
          ],
          hasInteracted: true,
        })),

      setMessages: (messages) => set({ messages }),

      setPendingTx: (tx) => set({ pendingTx: tx }),
      setConfirmedTx: (tx) => set({ confirmedTx: tx }),
      setLoading: (loading) => set({ loading }),
      setLoadingText: (text) => set({ loadingText: text }),
      setTypingId: (id) => set({ typingId: id }),

      setAiContext: (ctx) =>
        set((state) => ({
          aiContext: { ...state.aiContext, ...ctx },
        })),

      updateMemory: (update) =>
        set((state) => ({
          memory: { ...state.memory, ...update, lastSeen: new Date().toISOString() },
        })),

      addPendingConfirmation: (tx) =>
        set((state) => ({
          pendingConfirmations: [
            ...state.pendingConfirmations,
            { tx, timestamp: new Date().toISOString() },
          ],
        })),

      removePendingConfirmation: (index) =>
        set((state) => ({
          pendingConfirmations: state.pendingConfirmations.filter((_, i) => i !== index),
        })),

      clearPendingConfirmations: () => set({ pendingConfirmations: [] }),

      addPinnedInsight: (insight) =>
        set((state) => ({
          pinnedInsights: [insight, ...state.pinnedInsights].slice(0, 10),
        })),

      removePinnedInsight: (id) =>
        set((state) => ({
          pinnedInsights: state.pinnedInsights.filter((i) => i.id !== id),
        })),

      setSuggestions: (suggestions) => set({ suggestions }),

      setWelcomeShown: (shown) => set({ welcomeShown: shown }),
      setLastWelcomeDate: (date) => set({ lastWelcomeDate: date }),
      setHasInteracted: (interacted) => set({ hasInteracted: interacted }),

      clearMessages: () =>
        set({
          messages: [
            {
              role: "assistant",
              text: "",
              fullText: "Conversation cleared. How can I help you?",
              timestamp: new Date().toISOString(),
              id: "clear-" + generateId(),
            },
          ],
          pendingTx: null,
          confirmedTx: null,
          aiContext: { runningBalance: 0, lastTransaction: null, recentMessages: [] },
        }),

      exportConversation: () => get().messages,

      reset: () =>
        set({
          messages: [],
          pendingTx: null,
          confirmedTx: null,
          loading: false,
          loadingText: "",
          typingId: null,
          aiContext: { runningBalance: 0, lastTransaction: null, recentMessages: [] },
          pendingConfirmations: [],
          pinnedInsights: [],
          suggestions: [],
          welcomeShown: false,
          lastWelcomeDate: "",
          hasInteracted: false,
        }),
    }),
    {
      name: "mnit-ai-store",
      partialize: (state) => ({
        messages: state.messages,
        memory: state.memory,
        pendingConfirmations: state.pendingConfirmations,
        pinnedInsights: state.pinnedInsights,
        hasInteracted: state.hasInteracted,
        lastWelcomeDate: state.lastWelcomeDate,
        aiContext: state.aiContext,
      }),
    }
  )
);

export function trackCategory(category: string) {
  const store = useAIStore.getState();
  store.updateMemory({
    preferredCategories: trackMemoryField(
      store.memory.preferredCategories,
      "category" as never,
      category,
      "category"
    ),
    lastUsedCategory: category,
    totalInteractions: store.memory.totalInteractions + 1,
  });
}

export function trackMethod(method: string) {
  const store = useAIStore.getState();
  store.updateMemory({
    preferredMethods: trackMemoryField(
      store.memory.preferredMethods,
      "method" as never,
      method,
      "method"
    ),
    lastUsedMethod: method,
    totalInteractions: store.memory.totalInteractions + 1,
  });
}

export function trackSource(source: string) {
  const store = useAIStore.getState();
  store.updateMemory({
    commonSources: trackMemoryField(
      store.memory.commonSources,
      "source" as never,
      source,
      "source"
    ),
    lastUsedSource: source,
    totalInteractions: store.memory.totalInteractions + 1,
  });
}

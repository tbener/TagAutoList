"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/app/actions";
import { cleanName, sameName } from "@/lib/names";
import * as ops from "@/lib/ops";
import type { Snapshot } from "@/lib/tree";

type Result = { error?: string; id?: string };
type ServerResult = { error?: string; resync?: boolean } | void;

type Store = {
  snap: Snapshot;
  /** Saves still in flight. */
  pending: number;
  /** A message when a save failed and the app reloaded from the server. */
  notice: string | null;
  addTag(name: string): Result;
  renameTag(id: string, name: string): Result;
  deleteTag(id: string): void;
  reorderTags(orderedIds: string[]): void;
  addItem(title: string, tagNames: string[]): Result;
  updateItem(id: string, v: { title: string; notes: string; tagNames: string[] }): Result;
  deleteItem(id: string): void;
  removeItemFromTags(id: string, tagIds: string[]): void;
  reorderItems(tagId: string, orderedItemIds: string[]): void;
  /** Drop-to-tag. Returns false (and does nothing) when the item already has the tag. */
  addTagToItem(itemId: string, tagId: string): boolean;
  /** A short neutral confirmation message. */
  toast: string | null;
  flash(message: string): void;
  completeItem(id: string, tagIds: string[]): void;
  restoreCompletion(itemId: string, tagId: string): void;
};

const Ctx = createContext<Store | null>(null);

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}

function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Holds the user's whole dataset on the client. Everything the UI shows is
 * derived from it, so navigation and edits are instant: changes are applied
 * to local state first, then saved in the background, strictly in order.
 * If a save fails, the app reloads from the server and says so.
 */
export function DataProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const [snap, setSnap] = useState(initial);
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const ref = useRef(initial); // always-current copy for synchronous reads
  const chain = useRef<Promise<void>>(Promise.resolve());
  const inflight = useRef(0);
  const dirty = useRef(false);
  const lastSync = useRef(Date.now());

  const commit = useCallback((next: Snapshot) => {
    ref.current = next;
    setSnap(next);
  }, []);

  const resync = useCallback(async () => {
    try {
      const fresh = await api.loadSnapshot();
      lastSync.current = Date.now();
      if (inflight.current === 0) commit(fresh);
      else dirty.current = true; // new saves started meanwhile — reload again after them
    } catch {
      /* offline: keep what we have */
    }
  }, [commit]);

  /** Queue a server call; calls run one at a time, in the order made. */
  const save = useCallback(
    (call: () => Promise<ServerResult>) => {
      inflight.current++;
      setPending((p) => p + 1);
      chain.current = chain.current.then(async () => {
        try {
          const res = await call();
          if (res && (res.error || res.resync)) {
            dirty.current = true;
            if (res.error) setNotice(res.error);
          }
        } catch {
          dirty.current = true;
          setNotice("Couldn’t save your last change. Reloaded from the server.");
        } finally {
          inflight.current--;
          setPending((p) => p - 1);
          if (inflight.current === 0 && dirty.current) {
            dirty.current = false;
            await resync();
          }
        }
      });
    },
    [resync],
  );

  // Pick up changes made on another device when this one is used again.
  useEffect(() => {
    const onWake = () => {
      if (
        document.visibilityState === "visible" &&
        inflight.current === 0 &&
        Date.now() - lastSync.current > 10_000
      )
        void resync();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [resync]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const store = useMemo<Store>(() => {
    const dup = (name: string, exceptId?: string) =>
      ref.current.tags.some((t) => t.id !== exceptId && sameName(t.name, name));

    return {
      snap,
      pending,
      notice,

      addTag(name) {
        const clean = cleanName(name);
        if (!clean) return { error: "Name is required" };
        if (dup(clean)) return { error: `“${clean}” already exists` };
        const id = newId();
        commit(ops.addTag(ref.current, { id, name: clean }));
        save(() => api.createTag(id, clean));
        return { id };
      },

      renameTag(id, name) {
        const clean = cleanName(name);
        if (!clean) return { error: "Name is required" };
        if (dup(clean, id)) return { error: `“${clean}” already exists` };
        commit(ops.renameTag(ref.current, id, clean));
        save(() => api.renameTag(id, clean));
        return {};
      },

      deleteTag(id) {
        commit(ops.deleteTag(ref.current, id));
        save(() => api.deleteTag(id));
      },

      reorderTags(orderedIds) {
        commit(ops.reorderTags(ref.current, orderedIds));
        save(() => api.reorderTags(orderedIds));
      },

      addItem(title, tagNames) {
        const t = title.trim();
        if (!t) return { error: "Title is required" };
        const refs = ops.resolveRefs(ref.current, tagNames, newId);
        if (!refs.length) return { error: "Add at least one list" };
        const id = newId();
        commit(ops.addItem(ref.current, { id, title: t, refs, now: new Date() }));
        save(() => api.createItem({ id, title: t, tags: refs }));
        return { id };
      },

      updateItem(id, v) {
        const title = v.title.trim();
        if (!title) return { error: "Title is required" };
        const refs = ops.resolveRefs(ref.current, v.tagNames, newId);
        if (!refs.length) return { error: "An item needs at least one list" };
        commit(ops.updateItem(ref.current, { id, title, notes: v.notes, refs }));
        save(() => api.updateItem(id, { title, notes: v.notes, tags: refs }));
        return {};
      },

      deleteItem(id) {
        commit(ops.deleteItem(ref.current, id));
        save(() => api.deleteItem(id));
      },

      reorderItems(tagId, orderedItemIds) {
        commit(ops.reorderItems(ref.current, tagId, orderedItemIds));
        save(() => api.reorderItems(tagId, orderedItemIds));
      },

      addTagToItem(itemId, tagId) {
        if (ops.hasActiveTag(ref.current, itemId, tagId)) return false;
        commit(ops.addTagToItem(ref.current, itemId, tagId));
        save(() => api.addItemTag(itemId, tagId));
        return true;
      },

      toast,
      flash(message) {
        setToast(message);
      },

      removeItemFromTags(id, tagIds) {
        if (!tagIds.length) return;
        commit(ops.removeItemFromTags(ref.current, id, tagIds));
        save(() => api.removeItemFromTags(id, tagIds));
      },

      completeItem(id, tagIds) {
        if (!tagIds.length) return;
        commit(ops.completeItem(ref.current, id, tagIds, new Date()));
        save(() => api.completeItem(id, tagIds));
      },

      restoreCompletion(itemId, tagId) {
        commit(ops.restoreCompletion(ref.current, itemId, tagId));
        save(() => api.restoreCompletion(itemId, tagId));
      },
    };
  }, [snap, pending, notice, toast, commit, save]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

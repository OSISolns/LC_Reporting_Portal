import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Auto-save hook for form persistence across session timeouts & page reloads.
 * Saves form state to localStorage with user-scoping.
 * Auto-restores draft on mount if available & clears draft upon successful submit.
 */
export function useFormAutoSave(moduleKey, userId, initialValues, formData, setFormData, isEditing = false) {
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const isInitialMount = useRef(true);

  const storageKey = userId ? `lumina_draft_${moduleKey}_${userId}` : `lumina_draft_${moduleKey}`;

  // Restore draft on mount ONLY if creating a new request (not editing existing)
  useEffect(() => {
    if (isEditing) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify if draft contains meaningful user input
        const hasInput = Object.entries(parsed).some(([k, v]) => {
          if (k === 'initialTransactionDate' || k === 'rectifiedDate' || k === 'transferDate') return false;
          return v !== null && v !== undefined && String(v).trim() !== '';
        });

        if (hasInput) {
          setFormData(prev => ({ ...prev, ...parsed }));
          setHasRestoredDraft(true);
        }
      }
    } catch (err) {
      console.warn(`[AutoSave] Failed to restore draft for ${moduleKey}:`, err);
    }
  }, [storageKey, isEditing]);

  // Persist form updates to localStorage
  useEffect(() => {
    // Avoid overwriting storage during the initial mount before restoration finishes
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isEditing) return;

    try {
      const hasInput = Object.entries(formData).some(([k, v]) => {
        if (k === 'initialTransactionDate' || k === 'rectifiedDate' || k === 'transferDate') return false;
        return v !== null && v !== undefined && String(v).trim() !== '';
      });

      if (hasInput) {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      console.warn(`[AutoSave] Failed to save draft for ${moduleKey}:`, err);
    }
  }, [formData, storageKey, isEditing]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setFormData(initialValues);
      setHasRestoredDraft(false);
    } catch (err) {
      console.warn(`[AutoSave] Failed to clear draft for ${moduleKey}:`, err);
    }
  }, [storageKey, initialValues, setFormData]);

  return { hasRestoredDraft, clearDraft };
}

export default useFormAutoSave;

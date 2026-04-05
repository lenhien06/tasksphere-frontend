"use client";

/**
 * SkillTagsEditor — cho phép user thêm/xoá skill tags trong trang Profile.
 *
 * Tính năng:
 * - Hiển thị tags hiện tại dạng badge có nút xoá
 * - Input thêm tag mới: nhấn Enter hoặc dấu phẩy để confirm
 * - Autocomplete từ danh sách phổ biến
 * - Gọi PATCH /api/v1/users/me/skill-tags khi thay đổi
 */
import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSkillTags } from '@/app/services/ai.service';

// ── Danh sách gợi ý ──────────────────────────────────────────────────────────
const POPULAR_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Vue.js', 'Angular',
  'Java', 'Spring Boot', 'Node.js', 'Python', 'Go',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'DevOps', 'CI/CD', 'Testing', 'Jest', 'Selenium',
  'GraphQL', 'REST API', 'Microservices',
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialTags?: string[];
  onSaved?:     (tags: string[]) => void;
  /** Nếu readOnly=true, chỉ hiển thị, không cho sửa */
  readOnly?:    boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SkillTagsEditor({ initialTags = [], onSaved, readOnly = false }: Props) {
  const [tags, setTags]           = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef   = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Sync khi initialTags thay đổi từ bên ngoài (ví dụ: sau khi fetch profile)
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutation ────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: updateSkillTags,
    onSuccess: (saved) => {
      setTags(saved);
      setSaveStatus('saved');
      onSaved?.(saved);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filteredSuggestions = POPULAR_SKILLS.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s),
  ).slice(0, 8);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tag.length > 50 || tags.includes(tag) || tags.length >= 20) return;
    const next = [...tags, tag];
    setTags(next);
    setInputValue('');
    setShowSuggestions(false);
    // Auto-save
    setSaveStatus('saving');
    mutation.mutate(next);
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    setSaveStatus('saving');
    mutation.mutate(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Kỹ năng của bạn
        </label>
        <div className="flex items-center gap-2 text-xs">
          <span className={`${tags.length >= 20 ? 'text-red-500' : 'text-gray-400'}`}>
            {tags.length}/20
          </span>
          {saveStatus === 'saving' && (
            <span className="text-blue-500 flex items-center gap-1">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang lưu...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-600">✓ Đã lưu</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-500">✗ Lỗi lưu</span>
          )}
        </div>
      </div>

      {/* Tag container + input */}
      <div
        className={`flex flex-wrap gap-1.5 p-2.5 min-h-[2.75rem] rounded-lg border
                    transition-colors cursor-text
                    ${readOnly
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-300 bg-white focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400'
                    }`}
        onClick={() => !readOnly && inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                       font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            {tag}
            {!readOnly && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="text-indigo-400 hover:text-indigo-700 leading-none ml-0.5"
                aria-label={`Xoá ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {!readOnly && tags.length < 20 && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(inputValue.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={tags.length === 0 ? 'Nhập kỹ năng, nhấn Enter...' : ''}
              className="w-full text-sm bg-transparent border-none outline-none py-0.5 px-1"
            />

            {/* Autocomplete dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200
                             rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700
                                 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <p className="text-xs text-gray-400">
          Nhấn <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> hoặc{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">,</kbd> để thêm tag.
          Tối đa 20 kỹ năng.
        </p>
      )}
    </div>
  );
}

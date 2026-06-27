import { useState, type FormEvent } from 'react';
import { Pin, X } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import type { Notice } from '@/lib/notices';

export type NoticeModalMode = 'create' | 'edit';

interface NoticeModalProps {
  mode: NoticeModalMode;
  notice: Notice | null;
  onSave: (input: { title: string; body: string; isImportant: boolean }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function NoticeModal({ mode, notice, onSave, onDelete, onClose }: NoticeModalProps) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [isImportant, setIsImportant] = useState(notice?.isImportant ?? false);
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!body.trim()) {
      setError('내용을 입력해 주세요.');
      return;
    }
    onSave({ title, body, isImportant });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-800">
            {mode === 'create' ? '공지 추가' : '공지 수정'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2 touch-target" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label-caps block mb-2">제목</label>
            <input
              className="input-luxury"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="공지 제목"
              autoFocus
            />
          </div>

          <div>
            <label className="label-caps block mb-2">내용</label>
            <textarea
              className="input-luxury min-h-[140px] resize-y"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (error) setError('');
              }}
              placeholder="공지 내용을 입력하세요"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="rounded border-stone-300"
            />
            <Pin size={14} className="text-amber-600" />
            중요 공지 (상단 고정)
          </label>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                className="btn-secondary text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={onDelete}
              >
                삭제
              </button>
            )}
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary flex-1">
              {mode === 'create' ? '등록' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

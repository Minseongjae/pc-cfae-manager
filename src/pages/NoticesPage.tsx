import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pin, Plus, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { NoticeModal, type NoticeModalMode } from '@/components/notices/NoticeModal';
import { useAdminLockContext } from '@/contexts/AdminLockContext';
import { DATA_SYNC_CHANGED_EVENT } from '@/lib/dataStore';
import { formatNoticeDate, NOTICES_CHANGED_EVENT, type Notice } from '@/lib/notices';
import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from '@/lib/storage';

export function NoticesPage() {
  const { isAdmin, requireAdmin } = useAdminLockContext();
  const [notices, setNotices] = useState<Notice[]>(() => getNotices());
  const [modalMode, setModalMode] = useState<NoticeModalMode | null>(null);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const refresh = useCallback(() => {
    setNotices(getNotices());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(NOTICES_CHANGED_EVENT, handler);
    window.addEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(NOTICES_CHANGED_EVENT, handler);
      window.removeEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    };
  }, [refresh]);

  const openCreate = () => {
    requireAdmin(() => {
      setEditingNotice(null);
      setModalMode('create');
    });
  };

  const openEdit = (notice: Notice) => {
    requireAdmin(() => {
      setEditingNotice(notice);
      setModalMode('edit');
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingNotice(null);
  };

  const handleSave = (input: { title: string; body: string; isImportant: boolean }) => {
    if (modalMode === 'create') {
      createNotice(input);
    } else if (modalMode === 'edit' && editingNotice) {
      updateNotice(editingNotice.id, input);
    }
    refresh();
    closeModal();
  };

  const handleDelete = () => {
    if (!editingNotice) return;
    const confirmed = window.confirm(`"${editingNotice.title}" 공지를 삭제하시겠습니까?`);
    if (!confirmed) return;
    deleteNotice(editingNotice.id);
    refresh();
    closeModal();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="공지사항" subtitle="매장 공지를 확인할 수 있습니다">
        {isAdmin && (
          <button type="button" className="btn-primary text-sm touch-target" onClick={openCreate}>
            <Plus size={16} />
            공지 추가
          </button>
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        {notices.length === 0 ? (
          <div className="card p-10 text-center space-y-3">
            <Megaphone className="mx-auto text-stone-300" size={36} />
            <p className="text-sm text-stone-500">등록된 공지가 없습니다.</p>
            {isAdmin && (
              <button type="button" className="btn-secondary text-sm" onClick={openCreate}>
                첫 공지 작성하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className={`card p-5 md:p-6 space-y-3 ${
                  notice.isImportant ? 'border-amber-200 bg-amber-50/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Pin size={12} />
                          중요
                        </span>
                      )}
                      <h2 className="text-base font-semibold text-stone-800">{notice.title}</h2>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      작성일 {formatNoticeDate(notice.createdAt)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-ghost text-xs shrink-0 touch-target"
                      onClick={() => openEdit(notice)}
                    >
                      <Pencil size={14} />
                      수정
                    </button>
                  )}
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {notice.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalMode && isAdmin && (
        <NoticeModal
          key={editingNotice?.id ?? 'create'}
          mode={modalMode}
          notice={editingNotice}
          onSave={handleSave}
          onDelete={modalMode === 'edit' ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

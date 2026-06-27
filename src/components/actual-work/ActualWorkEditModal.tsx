import { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { ActualWorkRecord } from '@/lib/actualWork';
import { MODIFICATION_REASONS } from '@/lib/actualWork';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { TimeInput } from '@/components/ui/TimeInput';

interface ActualWorkEditModalProps {
  record: ActualWorkRecord;
  onSave: (
    actualStart: string | null,
    actualEnd: string | null,
    modificationReason: string
  ) => void;
  onClose: () => void;
}

export function ActualWorkEditModal({
  record,
  onSave,
  onClose,
}: ActualWorkEditModalProps) {
  const [actualStart, setActualStart] = useState(record.actualStart ?? '');
  const [actualEnd, setActualEnd] = useState(record.actualEnd ?? '');
  const [reasonId, setReasonId] = useState<string>(MODIFICATION_REASONS[0].id);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    setActualStart(record.actualStart ?? '');
    setActualEnd(record.actualEnd ?? '');
    if (record.modificationReason) {
      const matched = MODIFICATION_REASONS.find((r) => r.label === record.modificationReason);
      if (matched) {
        setReasonId(matched.id);
        setCustomReason('');
      } else {
        setReasonId('other');
        setCustomReason(record.modificationReason);
      }
    }
  }, [record]);

  const resolveReason = (): string => {
    if (reasonId === 'other') return customReason.trim();
    return MODIFICATION_REASONS.find((r) => r.id === reasonId)?.label ?? '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = resolveReason();
    if (!reason) return;
    if (!actualStart && !actualEnd) return;

    onSave(
      actualStart || null,
      actualEnd || null,
      reason
    );
  };

  return (
    <ModalOverlay onClose={onClose} panelClassName="card-elevated w-full max-w-lg shadow-xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
        <div>
          <h2 className="heading-display text-lg">실근무 수동 수정</h2>
          <p className="text-xs text-stone-500 mt-0.5">{record.employeeName}</p>
        </div>
        <button onClick={onClose} className="btn-ghost">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="예정 시작" value={record.scheduledStart} />
          <ReadOnlyField label="예정 종료" value={record.scheduledEnd} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              실제 시작
            </label>
            <TimeInput
              value={actualStart}
              onChange={setActualStart}
              className="input-luxury"
            />
          </div>
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              실제 종료
            </label>
            <TimeInput
              value={actualEnd}
              onChange={setActualEnd}
              className="input-luxury"
            />
          </div>
        </div>

        <div>
          <label className="label-caps normal-case tracking-wide block mb-2">
            수정 사유
          </label>
          <select
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className="input-luxury"
            required
          >
            {MODIFICATION_REASONS.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        {reasonId === 'other' && (
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              상세 사유
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="input-luxury"
              placeholder="수정 사유를 입력하세요"
              required
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="submit" className="btn-primary">
            <Save size={16} />
            저장
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="label-caps normal-case tracking-wide block mb-2">{label}</label>
      <div className="input-luxury bg-stone-50 text-stone-600">{value}</div>
    </div>
  );
}

import React from 'react';
import { LanguageCode, LocalDraftAction } from '../types/rescue';
import { TRANSLATIONS } from '../i18n/translations';

interface WaitingToSendPanelProps {
  lang: LanguageCode;
  items: LocalDraftAction[];
  isOnline: boolean;
  onSend: () => void;
  onDiscard: (id: string) => void;
}

/** Lists actions queued while offline, with their send status and a send button. */
export function WaitingToSendPanel({ lang, items, isOnline, onSend, onDiscard }: WaitingToSendPanelProps) {
  const t = TRANSLATIONS[lang];
  const count = items.length;

  if (count === 0) {
    return (
      <p className="px-2.5 py-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
        {t.waitingToSendCount(0)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-amber-50 border border-amber-300 rounded-lg">
      <p className="text-xs font-semibold text-amber-950">{t.waitingToSendCount(count)}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start gap-2 px-2 py-1.5 rounded-md border bg-white ${
              item.error ? 'border-red-300' : 'border-amber-200'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-800 break-words">{item.summary}</p>
              <p className="text-[11px] text-slate-500">
                {item.createdAt} ·{' '}
                {item.error ? (
                  <span className="font-semibold text-red-700">{`${t.notSentLabel}: ${item.error}`}</span>
                ) : (
                  <span className="text-amber-800">{t.waitingToSendLabel}</span>
                )}
              </p>
            </div>
            {item.error && (
              <button
                type="button"
                onClick={() => onDiscard(item.id)}
                className="min-h-[40px] px-2.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg cursor-pointer"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSend}
        disabled={!isOnline || count === 0}
        className="w-full min-h-[40px] px-2.5 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {t.sendQueuedBtn(count)}
      </button>
    </div>
  );
}

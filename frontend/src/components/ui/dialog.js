import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export function Dialog({ open, onClose, title, children, footer, className }) {
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={cn("bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col", className)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-lg text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="닫기">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>);
}

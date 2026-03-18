
'use client';

type AppEvents = {
  'open-profile-dialog': void;
  'open-settings-dialog': void;
  'open-chat-dialog': { initialUserId?: string } | void;
  'open-tasks-dialog': void;
  'open-workbooks-dialog': { workbookId?: string; sheetId?: string | null; } | void;
  'open-requisitions-dialog': void;
  'open-attendance-dialog': void;
  'open-leave-dialog': void;
  'open-reports-dialog': void;
  'open-assign-task-dialog': void;
  'open-new-requisition-dialog': void;
  'open-request-leave-dialog': void;
  'open-new-workbook-dialog': void;
  'open-invite-user-dialog': void;
  'open-new-announcement-dialog': void;
  'open-superadmin-dialog': void;
};

type Callback<T> = (data: T) => void;

function createEventEmitter<T extends Record<string, any>>() {
  const events: { [K in keyof T]?: Array<Callback<T[K]>> } = {};

  return {
    on<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      if (!events[eventName]) {
        events[eventName] = [];
      }
      events[eventName]?.push(callback);
    },

    off<K extends keyof T>(eventName: K, callback: Callback<T[K]>) {
      if (!events[eventName]) {
        return;
      }
      events[eventName] = events[eventName]?.filter(cb => cb !== callback);
    },

    emit<K extends keyof T>(eventName: K, data?: T[K]) {
      if (!events[eventName]) {
        return;
      }
      events[eventName]?.forEach(callback => callback(data as T[K]));
    },
  };
}


export const uiEmitter = createEventEmitter<AppEvents>();

    

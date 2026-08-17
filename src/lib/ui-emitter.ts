'use client';

type AppEvents = {
  'open-settings-dialog': { modal?: boolean } | void;
  'open-chat-dialog': { initialUserId?: string; chatId?: string; modal?: boolean } | void;
  'open-tasks-dialog': { taskId?: string; modal?: boolean } | void;
  'open-workbooks-dialog': { workbookId?: string; sheetId?: string | null; modal?: boolean } | void;
  'open-requisitions-dialog': { reqId?: string; modal?: boolean } | void;
  'open-attendance-dialog': { modal?: boolean } | void;
  'open-leave-dialog': { modal?: boolean } | void;
  'open-reports-dialog': { tab?: string; modal?: boolean; userId?: string } | void;
  'open-assign-task-dialog': { title?: string; description?: string; priority?: any; workbookId?: string; sheetId?: string | null; dueDate?: Date; modal?: boolean; userId?: string } | void;
  'open-new-requisition-dialog': { modal?: boolean } | void;
  'open-request-leave-dialog': { modal?: boolean } | void;
  'open-new-workbook-dialog': { modal?: boolean } | void;
  'open-invite-user-dialog': { modal?: boolean } | void;
  'open-new-announcement-dialog': { modal?: boolean } | void;
  'open-superadmin-dialog': { modal?: boolean } | void;
  'open-accounting-dialog': { modal?: boolean } | void;
  'open-library-dialog': { modal?: boolean } | void;
  'open-assistant-dialog': { modal?: boolean } | void;
  'open-notifications-dialog': { modal?: boolean } | void;
  'open-create-channel-dialog': { modal?: boolean } | void;
  'open-live-monitor-dialog': { targetUserId: string; targetUserName: string; modal?: boolean } | void;
  'open-database-explorer-dialog': { modal?: boolean } | void;
  'open-broadcast-system': void;
  'open-recognition-dialog': { userId?: string } | void;
  'open-staff-profile-dialog': { userId: string } | void;
  'open-command-palette': void;
  'open-it-support-dialog': void;
  'open-staff-directory-dialog': void;
  'close-all-dialogs': void;
  'open-pulse-check': void;
  'set-active-stream': { stream: MediaStream | null };
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

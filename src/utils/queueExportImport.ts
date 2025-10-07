/**
 * Queue Export/Import Utilities
 * Handles exporting and importing generation queues
 */

import type { QueueItem } from '../services/contentDiscoveryStorage';

export interface QueueExportData {
  version: string;
  exportDate: string;
  appName: string;
  queue: QueueItem[];
}

export interface QueueImportResult {
  success: boolean;
  message: string;
  queue?: QueueItem[];
  errors?: string[];
}

const EXPORT_VERSION = '1.0.0';
const APP_NAME = 'IntelliCast AI - Content Discovery';

/**
 * Export queue to JSON file
 */
export const exportQueue = (queue: QueueItem[], filename?: string): void => {
  const exportData: QueueExportData = {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    appName: APP_NAME,
    queue: queue
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `intellicast-queue-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export only pending items
 */
export const exportPendingQueue = (queue: QueueItem[]): void => {
  const pendingItems = queue.filter(item => item.status === 'pending');
  exportQueue(pendingItems, `intellicast-queue-pending-${Date.now()}.json`);
};

/**
 * Export only completed items
 */
export const exportCompletedQueue = (queue: QueueItem[]): void => {
  const completedItems = queue.filter(item => item.status === 'completed');
  exportQueue(completedItems, `intellicast-queue-completed-${Date.now()}.json`);
};

/**
 * Validate imported queue data
 */
const validateQueueData = (data: any): QueueImportResult => {
  const errors: string[] = [];

  // Check if data exists
  if (!data) {
    return {
      success: false,
      message: 'Invalid file: No data found',
      errors: ['File is empty or corrupted']
    };
  }

  // Check version
  if (!data.version) {
    errors.push('Missing version information');
  }

  // Check appName
  if (!data.appName || !data.appName.includes('IntelliCast')) {
    errors.push('File may not be from IntelliCast AI');
  }

  // Check queue array
  if (!Array.isArray(data.queue)) {
    return {
      success: false,
      message: 'Invalid file: Queue data is not an array',
      errors: ['Invalid queue structure']
    };
  }

  // Validate queue items
  const validQueue: QueueItem[] = [];
  data.queue.forEach((item: any, index: number) => {
    if (!item.id || !item.topicId || !item.topicTitle) {
      errors.push(`Item ${index + 1}: Missing required fields`);
      return;
    }

    if (!['pending', 'processing', 'completed', 'failed'].includes(item.status)) {
      errors.push(`Item ${index + 1}: Invalid status`);
      return;
    }

    validQueue.push(item);
  });

  if (validQueue.length === 0) {
    return {
      success: false,
      message: 'No valid queue items found',
      errors
    };
  }

  if (errors.length > 0) {
    return {
      success: true,
      message: `Imported ${validQueue.length} items with ${errors.length} warnings`,
      queue: validQueue,
      errors
    };
  }

  return {
    success: true,
    message: `Successfully validated ${validQueue.length} queue items`,
    queue: validQueue
  };
};

/**
 * Import queue from JSON file
 */
export const importQueue = (file: File): Promise<QueueImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const data = JSON.parse(jsonString);
        const result = validateQueueData(data);
        resolve(result);
      } catch (error) {
        reject({
          success: false,
          message: 'Failed to parse JSON file',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    };

    reader.onerror = () => {
      reject({
        success: false,
        message: 'Failed to read file',
        errors: ['File read error']
      });
    };

    reader.readAsText(file);
  });
};

/**
 * Regenerate queue item IDs to avoid conflicts
 */
export const regenerateQueueIds = (queue: QueueItem[]): QueueItem[] => {
  return queue.map(item => ({
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  }));
};

import { BadRequestException } from '@nestjs/common';
import {
  ActivityContentError, parseActivityContent, requireActivityCategory,
} from '../../shared/activity-content';

/** Shared validation adapter for CMS writes and publication. */
export function validateActivityRevision(input: unknown, categoryIds: Iterable<string>) {
  try {
    const content = parseActivityContent(input, 'content');
    requireActivityCategory(content, categoryIds, 'content');
    return content;
  } catch (error) {
    if (!(error instanceof ActivityContentError)) throw error;
    throw new BadRequestException({
      message: '活動內容格式不正確。',
      fieldErrors: [{ path: error.path, message: error.message }],
    });
  }
}

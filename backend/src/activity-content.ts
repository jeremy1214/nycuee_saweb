import { BadRequestException } from '@nestjs/common';
import {
  ActivityContentError, parseActivityContent, requireActivityCategory,
} from '../../shared/activity-content';

/** Shared validation adapter for future CMS writes. No HTTP endpoints are enabled yet. */
export function validateActivityRevision(input: unknown, categoryIds: Iterable<string>) {
  try {
    const content = parseActivityContent(input);
    requireActivityCategory(content, categoryIds);
    return content;
  } catch (error) {
    if (!(error instanceof ActivityContentError)) throw error;
    throw new BadRequestException({
      message: '活動內容格式不正確。',
      fieldErrors: [{ path: error.path, message: error.message }],
    });
  }
}

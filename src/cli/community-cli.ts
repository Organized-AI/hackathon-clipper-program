import { createCommunityService, type NotificationContent, type PostOptions } from '../services/community-service.js';
import { createLogger } from '../lib/index.js';

const logger = createLogger('CommunityCLI');

/**
 * CLI command result
 */
interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Create clipper onboarding course
 */
export async function createOnboardingCommand(args: {
  experienceId: string;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Creating onboarding course...', { experienceId: args.experienceId });

    const { course, chapters, lessons } = await service.createClipperOnboarding(args.experienceId);

    return {
      success: true,
      message: 'Onboarding course created successfully',
      data: {
        courseId: course.id,
        title: course.title,
        chapters: chapters.map((c) => ({ id: c.id, title: c.title })),
        totalLessons: lessons.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create onboarding course: ${message}`,
    };
  }
}

/**
 * Create a custom course
 */
export async function createCourseCommand(args: {
  experienceId: string;
  title: string;
  description?: string;
  chaptersJson?: string; // JSON string of chapters
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Creating course...', { experienceId: args.experienceId, title: args.title });

    let chapters = [];
    if (args.chaptersJson) {
      try {
        chapters = JSON.parse(args.chaptersJson);
      } catch {
        return {
          success: false,
          message: 'Invalid chapters JSON format',
        };
      }
    }

    const result = await service.createCourse(args.experienceId, {
      title: args.title,
      description: args.description,
      chapters,
    });

    return {
      success: true,
      message: 'Course created successfully',
      data: {
        courseId: result.course.id,
        title: result.course.title,
        chapters: result.chapters.map((c) => ({ id: c.id, title: c.title })),
        totalLessons: result.lessons.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create course: ${message}`,
    };
  }
}

/**
 * List courses for an experience
 */
export async function listCoursesCommand(args: {
  experienceId: string;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Listing courses...', { experienceId: args.experienceId });

    const courses = await service.listCourses(args.experienceId);

    return {
      success: true,
      message: `Found ${courses.length} course(s)`,
      data: courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        created: c.created_at,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to list courses: ${message}`,
    };
  }
}

/**
 * Post an announcement (pinned forum post)
 */
export async function postAnnouncementCommand(args: {
  feedId: string;
  title: string;
  content: string;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Posting announcement...', { feedId: args.feedId, title: args.title });

    const post = await service.createAnnouncement(args.feedId, args.title, args.content);

    return {
      success: true,
      message: 'Announcement posted successfully',
      data: {
        postId: post.id,
        title: post.title,
        isPinned: post.is_pinned,
        created: post.created_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to post announcement: ${message}`,
    };
  }
}

/**
 * Create a regular forum post
 */
export async function createPostCommand(args: {
  feedId: string;
  content: string;
  title?: string;
  pinned?: boolean;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Creating post...', { feedId: args.feedId });

    const options: PostOptions = {
      content: args.content,
      title: args.title,
      isPinned: args.pinned,
    };

    const post = await service.createPost(args.feedId, options);

    return {
      success: true,
      message: 'Post created successfully',
      data: {
        postId: post.id,
        title: post.title,
        isPinned: post.is_pinned,
        created: post.created_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create post: ${message}`,
    };
  }
}

/**
 * List forum posts
 */
export async function listPostsCommand(args: {
  feedId: string;
  limit?: number;
  cursor?: string;
  pinnedOnly?: boolean;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Listing posts...', { feedId: args.feedId });

    const result = await service.listPosts(args.feedId, {
      perPage: args.limit,
      after: args.cursor,
      pinnedOnly: args.pinnedOnly,
    });

    return {
      success: true,
      message: `Found ${result.posts.length} post(s)${result.hasMore ? ' (more available)' : ''}`,
      data: {
        posts: result.posts.map((p) => ({
          id: p.id,
          title: p.title,
          author: p.user.username,
          isPinned: p.is_pinned,
          created: p.created_at,
        })),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to list posts: ${message}`,
    };
  }
}

/**
 * Send notification to experience members
 */
export async function sendNotificationCommand(args: {
  experienceId: string;
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Sending notification...', { experienceId: args.experienceId, title: args.title });

    const notification: NotificationContent = {
      title: args.title,
      body: args.body,
      url: args.url,
      imageUrl: args.imageUrl,
    };

    const result = await service.sendNotification(args.experienceId, notification);

    if (result.success) {
      return {
        success: true,
        message: 'Notification sent successfully',
        data: { notificationId: result.notificationId },
      };
    } else {
      return {
        success: false,
        message: 'Failed to send notification',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to send notification: ${message}`,
    };
  }
}

/**
 * Send notification to multiple experiences
 */
export async function sendBulkNotificationCommand(args: {
  experienceIds: string[];
  title: string;
  body: string;
  url?: string;
}): Promise<CommandResult> {
  const service = createCommunityService();

  try {
    logger.info('Sending bulk notification...', {
      experienceCount: args.experienceIds.length,
      title: args.title,
    });

    const notification: NotificationContent = {
      title: args.title,
      body: args.body,
      url: args.url,
    };

    const result = await service.sendBulkNotification(args.experienceIds, notification);

    return {
      success: result.failed === 0,
      message: `Sent ${result.successful} notification(s), ${result.failed} failed`,
      data: {
        successful: result.successful,
        failed: result.failed,
        results: result.results,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to send bulk notification: ${message}`,
    };
  }
}
